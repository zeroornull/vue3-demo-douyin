import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(scriptDirectory, '../..')
const screenshotRoot = resolve(root, 'docs/round-4/screenshots')
const outputFile = resolve(root, 'docs/round-4/generated/message-browser-states.json')
const baseUrl = process.env.ROUND4_BASE_URL || 'http://127.0.0.1:4173'

const authResponse = {
  user: { id: 'e2e-user', displayName: 'E2E 用户' },
  accessToken: 'e2e-access-token',
}

function messagePayload(body = 'E2E 初始消息', senderId = 'friend-e2e', id = 'msg-e2e-1') {
  return {
    id,
    conversationId: 'conv-e2e',
    senderId,
    body,
    sentAt: '2026-08-31T02:00:00.000Z',
    delivery: senderId === 'e2e-user' ? 'sent' : 'delivered',
  }
}

const conversation = {
  id: 'conv-e2e',
  participant: {
    userId: 'friend-e2e',
    displayName: 'E2E 好友',
    handle: 'e2e_friend',
    online: true,
  },
  lastMessage: messagePayload(),
  unreadCount: 2,
  updatedAt: '2026-08-31T02:00:00.000Z',
}

async function login(page, redirect) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ body: JSON.stringify(authResponse), contentType: 'application/json' }),
  )
  await page.goto(`${baseUrl}/login/password?redirect=${encodeURIComponent(redirect)}`)
  await page.getByRole('textbox', { name: '手机号', exact: true }).fill('13800138000')
  await page.locator('input[name="password"]').fill('douyin-demo')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: '登录' }).click()
}

async function routeThread(page, sendBody) {
  await page.route('**/api/messages/conversations**', async (route) => {
    const request = route.request()
    const pathname = new URL(request.url()).pathname
    if (request.method() === 'GET') {
      await route.fulfill({
        body: JSON.stringify({
          conversation,
          messages: [messagePayload()],
          nextCursor: null,
        }),
        contentType: 'application/json',
      })
      return
    }
    if (pathname.endsWith('/read')) {
      await route.fulfill({
        body: JSON.stringify({
          conversationId: 'conv-e2e',
          readAt: '2026-08-31T02:01:00.000Z',
        }),
        contentType: 'application/json',
      })
      return
    }
    await route.fulfill({
      body: JSON.stringify(messagePayload(sendBody, 'e2e-user', 'msg-e2e-sent')),
      contentType: 'application/json',
    })
  })
}

async function main() {
  await mkdir(screenshotRoot, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const results = []

  async function capture(id, prepare, verify) {
    const context = await browser.newContext({
      colorScheme: 'dark',
      locale: 'zh-CN',
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await prepare(page)
    await verify(page)
    await page.waitForTimeout(250)
    await page.evaluate(() => window.scrollTo({ top: 0 }))
    const screenshot = `${id}.png`
    await page.screenshot({ path: resolve(screenshotRoot, screenshot), fullPage: true })
    results.push({ id, finalUrl: page.url(), pageErrors, screenshot: `screenshots/${screenshot}` })
    await context.close()
  }

  try {
    await capture(
      'message-list',
      async (page) => {
        await page.route('**/api/messages/conversations**', (route) =>
          route.fulfill({
            body: JSON.stringify({ conversations: [conversation], nextCursor: null }),
            contentType: 'application/json',
          }),
        )
        await login(page, '/message')
      },
      (page) => page.getByRole('link', { name: /E2E 好友/ }).waitFor(),
    )
    await capture(
      'message-empty',
      async (page) => {
        await page.route('**/api/messages/conversations**', (route) =>
          route.fulfill({
            body: JSON.stringify({ conversations: [], nextCursor: null }),
            contentType: 'application/json',
          }),
        )
        await login(page, '/message')
      },
      (page) => page.getByRole('heading', { name: '还没有会话' }).waitFor(),
    )
    await capture(
      'message-chat',
      async (page) => {
        await routeThread(page, 'E2E 发送内容')
        await login(page, '/message/chat/conv-e2e')
      },
      (page) => page.getByRole('heading', { name: 'E2E 好友' }).waitFor(),
    )
    await capture(
      'message-validation',
      async (page) => {
        await routeThread(page, 'E2E 发送内容')
        await login(page, '/message/chat/conv-e2e')
        await page.getByRole('button', { name: '发送', exact: true }).click()
      },
      (page) => page.getByText('消息必须为 1–500 个字符。').waitFor(),
    )
    await capture(
      'message-sent',
      async (page) => {
        await routeThread(page, 'E2E 发送内容')
        await login(page, '/message/chat/conv-e2e')
        await page.getByLabel('消息内容').fill('E2E 发送内容')
        await page.getByRole('button', { name: '发送', exact: true }).click()
      },
      (page) => page.getByText('E2E 发送内容').waitFor(),
    )
    await capture(
      'message-503',
      async (page) => {
        await page.route('**/api/messages/conversations**', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
        )
        await login(page, '/message')
      },
      (page) => page.getByRole('alert').getByText('HTTP 请求失败（503）。').waitFor(),
    )
    await capture(
      'message-unauthorized',
      async (page) => {
        await page.route('**/api/messages/conversations**', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 401 }),
        )
        await login(page, '/message')
      },
      (page) => page.getByRole('heading', { name: '手机号密码登录' }).waitFor(),
    )
    await capture(
      'message-parse-error',
      async (page) => {
        await page.route('**/api/messages/conversations**', (route) =>
          route.fulfill({
            body: JSON.stringify({ conversations: [{}], nextCursor: null }),
            contentType: 'application/json',
          }),
        )
        await login(page, '/message')
      },
      (page) => page.getByRole('alert').getByText('会话列表响应字段无效。').waitFor(),
    )
    await capture(
      'message-not-found',
      async (page) => {
        await page.route('**/api/messages/conversations**', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 404 }),
        )
        await login(page, '/message/chat/conv-missing')
      },
      (page) => page.getByRole('alert').getByText('会话不存在。').waitFor(),
    )
  } finally {
    await browser.close()
  }

  if (results.some((result) => result.pageErrors.length)) {
    throw new Error('Message visual capture encountered page errors')
  }
  await writeFile(
    outputFile,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`,
  )
  console.log(`Captured ${results.length} message states`)
}

await main()
