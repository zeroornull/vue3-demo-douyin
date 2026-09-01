import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { AuthSession } from '@/domain/auth/auth'
import type {
  ChatMessage,
  ConversationId,
  ConversationPage,
  ConversationSummary,
  MessagePage,
} from '@/domain/message/message'
import type { MessageGateway, MessageRequestOptions } from '@/features/message/api/message-gateway'
import { getDefaultMessageGateway } from '@/features/message/api/message-gateway-provider'
import type { AttachmentGateway } from '@/features/message/api/attachment-gateway'
import { getDefaultAttachmentGateway } from '@/features/message/api/attachment-gateway-provider'
import {
  validateAttachmentFile,
  validateMessageDraft,
  type MessageFieldErrors,
} from '@/features/message/validation'
import { appEventBus } from '@/infrastructure/events/app-event-bus'
import { failure, success, type AppError, type AppResult } from '@/shared/result'

export type ConversationListStatus = 'error' | 'idle' | 'loading' | 'loading-more' | 'ready'
export type MessageThreadStatus =
  'error' | 'idle' | 'loading' | 'loading-more' | 'ready' | 'sending'

interface MessageActionOptions {
  readonly gateway?: MessageGateway
  readonly signal?: AbortSignal
}

function gatewayOptions(signal?: AbortSignal, cursor?: string): MessageRequestOptions | undefined {
  return signal || cursor
    ? { ...(cursor ? { cursor } : {}), ...(signal ? { signal } : {}) }
    : undefined
}

export const useMessageStore = defineStore('message', () => {
  const conversations = ref<ConversationSummary[]>([])
  const nextConversationCursor = ref<string | null>(null)
  const listStatus = ref<ConversationListStatus>('idle')
  const listError = ref<AppError | null>(null)

  const activeConversation = ref<ConversationSummary | null>(null)
  const messages = ref<ChatMessage[]>([])
  const nextMessageCursor = ref<string | null>(null)
  const threadStatus = ref<MessageThreadStatus>('idle')
  const threadError = ref<AppError | null>(null)
  const fieldErrors = ref<MessageFieldErrors>({})
  const pendingAttachment = ref<ChatMessage['attachment'] | null>(null)
  const uploadStatus = ref<'error' | 'idle' | 'uploading'>('idle')
  const uploadError = ref<AppError | null>(null)

  let ownerUserId: string | null = null
  let listRequestSequence = 0
  let threadRequestSequence = 0

  const unreadTotal = computed(() =>
    conversations.value.reduce((total, conversation) => total + conversation.unreadCount, 0),
  )

  function publishUnreadTotal() {
    appEventBus.emit('message:unread-changed', { total: unreadTotal.value })
  }

  function replaceConversation(value: ConversationSummary, moveToFront = false) {
    const remaining = conversations.value.filter((conversation) => conversation.id !== value.id)
    if (moveToFront || remaining.length === conversations.value.length) {
      conversations.value = [value, ...remaining]
    } else {
      conversations.value = conversations.value.map((conversation) =>
        conversation.id === value.id ? value : conversation,
      )
    }
  }

  function acceptConversationPage(page: ConversationPage, append: boolean) {
    if (append) {
      const existing = new Set(conversations.value.map((conversation) => conversation.id))
      conversations.value = [
        ...conversations.value,
        ...page.conversations.filter((conversation) => !existing.has(conversation.id)),
      ]
    } else {
      conversations.value = [...page.conversations]
    }
    nextConversationCursor.value = page.nextCursor
    listError.value = null
    listStatus.value = 'ready'
    publishUnreadTotal()
  }

  async function loadConversations(
    session: AuthSession,
    options: MessageActionOptions & { readonly append?: boolean } = {},
  ): Promise<AppResult<ConversationPage>> {
    if (ownerUserId && ownerUserId !== session.userId) reset()
    ownerUserId = session.userId
    const append = options.append === true
    const cursor = append ? nextConversationCursor.value : null
    if (append && !cursor) return success({ conversations: [], nextCursor: null })

    const requestId = ++listRequestSequence
    listStatus.value = append ? 'loading-more' : 'loading'
    listError.value = null
    let result: AppResult<ConversationPage>
    try {
      result = await (options.gateway ?? getDefaultMessageGateway()).listConversations(
        session,
        gatewayOptions(options.signal, cursor ?? undefined),
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '会话列表服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== listRequestSequence) return result
    if (result.ok) acceptConversationPage(result.data, append)
    else {
      listError.value = result.error
      listStatus.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }

  function acceptMessagePage(page: MessagePage) {
    activeConversation.value = page.conversation
    messages.value = [...page.messages]
    nextMessageCursor.value = page.nextCursor
    threadError.value = null
    fieldErrors.value = {}
    threadStatus.value = 'ready'
    replaceConversation(page.conversation)
    publishUnreadTotal()
  }

  function applyRead(conversationId: ConversationId) {
    const conversation = conversations.value.find((item) => item.id === conversationId)
    if (conversation) replaceConversation({ ...conversation, unreadCount: 0 })
    if (activeConversation.value?.id === conversationId) {
      activeConversation.value = { ...activeConversation.value, unreadCount: 0 }
    }
    appEventBus.emit('message:read', { conversationId })
    publishUnreadTotal()
  }

  async function openConversation(
    session: AuthSession,
    conversationId: ConversationId,
    options: MessageActionOptions = {},
  ): Promise<AppResult<MessagePage>> {
    if (ownerUserId && ownerUserId !== session.userId) reset()
    ownerUserId = session.userId
    if (activeConversation.value?.id !== conversationId) {
      activeConversation.value = null
      messages.value = []
      nextMessageCursor.value = null
    }
    const requestId = ++threadRequestSequence
    threadStatus.value = 'loading'
    threadError.value = null
    fieldErrors.value = {}
    const gateway = options.gateway ?? getDefaultMessageGateway()
    let result: AppResult<MessagePage>
    try {
      result = await gateway.getConversation(
        session,
        conversationId,
        gatewayOptions(options.signal),
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '会话服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== threadRequestSequence) return result
    if (!result.ok) {
      threadError.value = result.error
      threadStatus.value = result.error.kind === 'aborted' ? 'idle' : 'error'
      return result
    }
    acceptMessagePage(result.data)

    if (result.data.conversation.unreadCount > 0) {
      let readResult
      try {
        readResult = await gateway.markRead(session, conversationId, gatewayOptions(options.signal))
      } catch (cause: unknown) {
        readResult = failure({
          kind: 'unexpected',
          message: '已读状态同步发生未预期错误。',
          details: [cause instanceof Error ? cause.message : String(cause)],
        })
      }
      if (requestId !== threadRequestSequence) return result
      if (!readResult.ok) {
        threadError.value = readResult.error
        threadStatus.value = readResult.error.kind === 'aborted' ? 'ready' : 'error'
        return failure(readResult.error)
      }
      applyRead(conversationId)
    }
    return result
  }

  async function loadOlderMessages(
    session: AuthSession,
    options: MessageActionOptions = {},
  ): Promise<AppResult<MessagePage>> {
    if (!activeConversation.value) {
      return failure({ kind: 'unexpected', message: '尚未打开会话。' })
    }
    if (!nextMessageCursor.value) {
      return success({
        conversation: activeConversation.value,
        messages: [],
        nextCursor: null,
      })
    }
    const conversationId = activeConversation.value.id
    const cursor = nextMessageCursor.value
    const requestId = ++threadRequestSequence
    threadStatus.value = 'loading-more'
    threadError.value = null
    let result: AppResult<MessagePage>
    try {
      result = await (options.gateway ?? getDefaultMessageGateway()).getConversation(
        session,
        conversationId,
        gatewayOptions(options.signal, cursor),
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '历史消息服务发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== threadRequestSequence) return result
    if (result.ok) {
      const existing = new Set(messages.value.map((message) => message.id))
      messages.value = [
        ...result.data.messages.filter((message) => !existing.has(message.id)),
        ...messages.value,
      ]
      nextMessageCursor.value = result.data.nextCursor
      threadStatus.value = 'ready'
    } else {
      threadError.value = result.error
      threadStatus.value = result.error.kind === 'aborted' ? 'ready' : 'error'
    }
    return result
  }

  async function sendMessage(
    session: AuthSession,
    body: string,
    options: MessageActionOptions = {},
  ): Promise<AppResult<ChatMessage>> {
    if (!activeConversation.value) {
      return failure({ kind: 'unexpected', message: '尚未打开会话。' })
    }
    const validation = validateMessageDraft({
      body,
      ...(pendingAttachment.value ? { attachment: pendingAttachment.value } : {}),
    })
    if (!validation.ok) {
      fieldErrors.value = validation.error.fields
      threadError.value = validation.error
      return validation
    }
    const conversationId = activeConversation.value.id
    const requestId = ++threadRequestSequence
    threadStatus.value = 'sending'
    threadError.value = null
    fieldErrors.value = {}
    let result: AppResult<ChatMessage>
    try {
      result = await (options.gateway ?? getDefaultMessageGateway()).sendMessage(
        session,
        conversationId,
        validation.data,
        gatewayOptions(options.signal),
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '消息发送发生未预期错误。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (requestId !== threadRequestSequence) return result
    if (result.ok) {
      if (!messages.value.some((message) => message.id === result.data.id)) {
        messages.value.push(result.data)
      }
      const updated = {
        ...activeConversation.value,
        lastMessage: result.data,
        unreadCount: 0,
        updatedAt: result.data.sentAt,
      }
      activeConversation.value = updated
      replaceConversation(updated, true)
      threadStatus.value = 'ready'
      appEventBus.emit('message:sent', {
        conversationId,
        messageId: result.data.id,
      })
      publishUnreadTotal()
      pendingAttachment.value = null
    } else {
      threadError.value = result.error
      threadStatus.value = result.error.kind === 'aborted' ? 'ready' : 'error'
    }
    return result
  }

  async function uploadAttachment(
    session: AuthSession,
    file: File,
    options: { gateway?: AttachmentGateway; signal?: AbortSignal } = {},
  ) {
    if (!activeConversation.value) return failure({ kind: 'unexpected', message: '尚未打开会话。' })
    const validation = validateAttachmentFile(file)
    if (!validation.ok) {
      uploadError.value = validation.error
      uploadStatus.value = 'error'
      return validation
    }
    uploadStatus.value = 'uploading'
    uploadError.value = null
    let result
    try {
      result = await (options.gateway ?? getDefaultAttachmentGateway()).upload(
        session,
        activeConversation.value.id,
        file,
        options.signal,
      )
    } catch (cause: unknown) {
      result = failure({
        kind: 'unexpected',
        message: '附件上传失败。',
        details: [cause instanceof Error ? cause.message : String(cause)],
      })
    }
    if (result.ok) {
      pendingAttachment.value = result.data
      uploadStatus.value = 'idle'
    } else {
      uploadError.value = result.error
      uploadStatus.value = result.error.kind === 'aborted' ? 'idle' : 'error'
    }
    return result
  }

  function receiveIncomingMessage(message: ChatMessage) {
    const conversation = conversations.value.find((item) => item.id === message.conversationId)
    if (!conversation) return
    const isActive = activeConversation.value?.id === message.conversationId
    if (isActive && !messages.value.some((item) => item.id === message.id)) {
      messages.value.push(message)
    }
    const updated = {
      ...conversation,
      lastMessage: message,
      unreadCount: isActive ? 0 : conversation.unreadCount + 1,
      updatedAt: message.sentAt,
    }
    if (isActive) activeConversation.value = updated
    replaceConversation(updated, true)
    publishUnreadTotal()
  }

  function reset() {
    listRequestSequence += 1
    threadRequestSequence += 1
    ownerUserId = null
    conversations.value = []
    nextConversationCursor.value = null
    listStatus.value = 'idle'
    listError.value = null
    activeConversation.value = null
    messages.value = []
    nextMessageCursor.value = null
    threadStatus.value = 'idle'
    threadError.value = null
    fieldErrors.value = {}
    pendingAttachment.value = null
    uploadStatus.value = 'idle'
    uploadError.value = null
    publishUnreadTotal()
  }

  return {
    conversations,
    nextConversationCursor,
    listStatus,
    listError,
    activeConversation,
    messages,
    nextMessageCursor,
    threadStatus,
    threadError,
    fieldErrors,
    pendingAttachment,
    uploadStatus,
    uploadError,
    unreadTotal,
    loadConversations,
    openConversation,
    loadOlderMessages,
    sendMessage,
    uploadAttachment,
    receiveIncomingMessage,
    reset,
  }
})
