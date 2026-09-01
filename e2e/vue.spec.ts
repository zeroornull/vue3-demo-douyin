import { expect, test, type Page } from '@playwright/test'
import shopFixture from '../src/features/shop/data/goods.fixture.json' with { type: 'json' }

function captureRuntimeErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

async function mockShopSuccess(page: Page) {
  await page.route('**/api/shop/products', (route) =>
    route.fulfill({
      body: JSON.stringify(shopFixture),
      contentType: 'application/json',
      status: 200,
    }),
  )
}

const authSessionResponse = {
  user: { id: 'e2e-user', displayName: 'E2E 用户' },
  accessToken: 'e2e-access-token',
}

const profileResponse = {
  profile: {
    userId: 'e2e-user',
    displayName: 'E2E 用户',
    handle: 'e2e_user',
    bio: 'E2E 资料简介',
    age: 27,
    gender: 'female',
    province: '广东',
    city: '珠海',
    school: null,
  },
  stats: { likes: 1000, friends: 20, following: 30, followers: 40, posts: 5 },
  version: 1,
}

function messagePayload(conversationId: string, id: string, body: string, senderId = 'friend-e2e') {
  return {
    id,
    conversationId,
    senderId,
    body,
    sentAt: '2026-08-31T02:00:00.000Z',
    delivery: senderId === 'e2e-user' ? 'sent' : 'delivered',
  }
}

function conversationPayload(id = 'conv-e2e', displayName = 'E2E 好友', unreadCount = 2) {
  return {
    id,
    participant: {
      userId: `friend-${id}`,
      displayName,
      handle: id.replace('conv-', ''),
      online: true,
    },
    lastMessage: messagePayload(id, `msg-${id}`, `${displayName} 的最后一条消息`),
    unreadCount,
    updatedAt: '2026-08-31T02:00:00.000Z',
  }
}

const messageConversationResponse = conversationPayload()
const messageThreadResponse = {
  conversation: messageConversationResponse,
  messages: [messagePayload('conv-e2e', 'msg-e2e-1', 'E2E 初始消息')],
  nextCursor: null,
}

function feedPayload(
  id = 'feed-e2e',
  caption = 'E2E 推荐内容',
  coverUrl = '/feed/covers/field.jpg',
) {
  return {
    id,
    author: { userId: `author-${id}`, displayName: 'E2E 作者', handle: `author_${id}` },
    caption,
    coverUrl,
    durationSeconds: 42,
    likeCount: 1000,
    commentCount: 20,
    shareCount: 10,
    publishedAt: '2026-08-31T01:00:00.000Z',
    tags: ['E2E', '迁移'],
  }
}

const mediaSourceResponse = {
  src: '/feed/media/field-demo.mp4',
  mimeType: 'video/mp4',
  posterUrl: '/feed/covers/field.jpg',
  durationSeconds: 4,
}

function commentPayload(id = 'comment-e2e', body = 'E2E 评论') {
  return {
    id,
    feedId: 'feed-e2e',
    author: { userId: 'comment-user', displayName: 'E2E 评论者' },
    body,
    createdAt: '2026-08-31T03:00:00.000Z',
    likeCount: 2,
    likedByViewer: false,
    version: 1,
  }
}

async function mockFeedDetail(page: Page) {
  await page.route('**/api/feed/feed-e2e', (route) =>
    route.fulfill({
      body: JSON.stringify({ item: feedPayload(), media: mediaSourceResponse }),
      contentType: 'application/json',
    }),
  )
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/feed/*/comments**', (route) =>
    route.fulfill({
      body: JSON.stringify({ comments: [], nextCursor: null }),
      contentType: 'application/json',
    }),
  )
})

async function fillValidPasswordLogin(page: Page, password = 'douyin-demo') {
  await page.getByRole('textbox', { name: '手机号', exact: true }).fill('13800138000')
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('checkbox').check()
}

async function signInViaHttp(page: Page, redirect: string) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      body: JSON.stringify(authSessionResponse),
      contentType: 'application/json',
      status: 200,
    }),
  )
  await page.goto(`/login/password?redirect=${encodeURIComponent(redirect)}`)
  await fillValidPasswordLogin(page)
  await page.getByRole('button', { name: '登录' }).click()
}

test('shows the migration baseline at the root route', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('可验证的小步迁移')
  await expect(page.getByRole('navigation')).toBeVisible()
})

test('exposes a production health route', async ({ page }) => {
  await page.goto('/health')

  await expect(page.getByRole('heading', { name: '运行状态' })).toBeVisible()
  await expect(page.getByTestId('health-status')).toHaveText('ok')
  await expect(page.getByText(/^3\.5\./)).toBeVisible()
  await expect(page.getByTestId('shop-data-source')).toHaveText('http')
  await expect(page.getByTestId('auth-data-source')).toHaveText('http')
  await expect(page.getByTestId('feed-data-source')).toHaveText('http')
})

test('renders an explicit not-found route', async ({ page }) => {
  await page.goto('/not-yet-migrated')
  await expect(page.getByRole('heading', { name: '这个页面还没有迁移。' })).toBeVisible()
  await expect(page.getByRole('link', { name: '返回迁移概览' })).toHaveAttribute('href', '/')
})

test('navigates from the typed Shop list to a stable detail URL', async ({ page }) => {
  const errors = captureRuntimeErrors(page)
  await mockShopSuccess(page)
  await page.goto('/shop')

  const products = page.locator('.product-card')
  await expect(products).toHaveCount(6)
  await expect(page.locator('.product-card img')).toHaveCount(6)
  await expect
    .poll(() =>
      page
        .locator('.product-card img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true)
  await products.first().click()

  await expect(page).toHaveURL(/\/shop\/detail\/g6$/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('小米电视6')
  expect(errors).toEqual([])
})

test('loads and reloads a Shop detail deep link without routeData', async ({ page }) => {
  const errors = captureRuntimeErrors(page)
  await mockShopSuccess(page)
  await page.goto('/shop/detail/g6')

  await expect(page.getByRole('heading', { level: 1 })).toContainText('小米电视6')
  await expect(page.getByText('ID g6')).toBeVisible()
  await expect(page.locator('.detail-gallery img')).toHaveCount(5)
  await expect
    .poll(() =>
      page
        .locator('.detail-gallery img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1 })).toContainText('小米电视6')
  expect(errors).toEqual([])
})

test('distinguishes an invalid product ID from runtime failure', async ({ page }) => {
  const errors = captureRuntimeErrors(page)
  await mockShopSuccess(page)
  await page.goto('/shop/detail/not-valid')

  await expect(page.getByTestId('product-not-found')).toContainText('商品不存在')
  expect(errors).toEqual([])
})

test('redirects the legacy detail path that has no product ID', async ({ page }) => {
  await mockShopSuccess(page)
  await page.goto('/shop/detail')

  await expect(page).toHaveURL(/\/shop$/)
  await expect(page.getByRole('heading', { name: '商品样板' })).toBeVisible()
})

test('renders an explicit empty state from the HTTP adapter', async ({ page }) => {
  await page.route('**/api/shop/products', (route) =>
    route.fulfill({ body: '[]', contentType: 'application/json', status: 200 }),
  )

  await page.goto('/shop')

  await expect(page.getByRole('heading', { name: '目前没有商品' })).toBeVisible()
})

test('renders a typed HTTP status failure without an application exception', async ({ page }) => {
  const errors = captureRuntimeErrors(page)
  await page.route('**/api/shop/products', (route) =>
    route.fulfill({
      body: JSON.stringify({ message: 'maintenance' }),
      contentType: 'application/json',
      status: 503,
    }),
  )

  await page.goto('/shop')

  await expect(page.getByRole('alert')).toContainText('HTTP 请求失败（503）')
  expect(errors).toHaveLength(1)
  expect(errors[0]).toContain('503')
})

test('renders a parser error for an invalid HTTP payload', async ({ page }) => {
  const errors = captureRuntimeErrors(page)
  await page.route('**/api/shop/products', (route) =>
    route.fulfill({
      body: JSON.stringify({ invalid: true }),
      contentType: 'application/json',
      status: 200,
    }),
  )

  await page.goto('/shop')

  await expect(page.getByRole('alert')).toContainText('商品列表必须是数组')
  expect(errors).toEqual([])
})

test('navigates from the login entry to the password form', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: '登录看朋友内容' })).toBeVisible()
  await page.getByRole('link', { name: '使用手机号和密码登录' }).click()
  await expect(page).toHaveURL(/\/login\/password\?redirect=\/shop$/)
  await expect(page.getByRole('heading', { name: '手机号密码登录' })).toBeVisible()
})

test('validates login fields without sending an HTTP request', async ({ page }) => {
  let requests = 0
  await page.route('**/api/auth/login', (route) => {
    requests += 1
    return route.abort()
  })
  await page.goto('/login/password')

  await page.getByRole('button', { name: '登录' }).click()

  await expect(page.getByText('请输入有效的中国大陆手机号')).toBeVisible()
  await expect(page.getByText('密码长度必须为 8–128 个字符')).toBeVisible()
  await expect(page.getByText('请先阅读并同意用户协议和隐私政策')).toBeVisible()
  expect(requests).toBe(0)
})

test('signs in through the HTTP adapter and follows a safe redirect', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    const body = route.request().postDataJSON()
    expect(body).toEqual({ phone: '13800138000', password: 'douyin-demo' })
    await route.fulfill({
      body: JSON.stringify(authSessionResponse),
      contentType: 'application/json',
      status: 200,
    })
  })
  await mockShopSuccess(page)
  await page.goto('/login/password?redirect=/shop')
  await fillValidPasswordLogin(page)

  await page.getByRole('button', { name: '登录' }).click()

  await expect(page).toHaveURL(/\/shop$/)
  await expect(page.getByText('E2E 用户')).toBeVisible()
})

test('renders unauthorized credentials from HTTP 401', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      body: JSON.stringify({ message: 'unauthorized' }),
      contentType: 'application/json',
      status: 401,
    }),
  )
  await page.goto('/login/password')
  await fillValidPasswordLogin(page, 'wrong-pass')

  await page.getByRole('button', { name: '登录' }).click()

  await expect(page.getByRole('alert')).toContainText('手机号或密码不正确')
})

test('renders a service failure from HTTP 503', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      body: JSON.stringify({ message: 'maintenance' }),
      contentType: 'application/json',
      status: 503,
    }),
  )
  await page.goto('/login/password')
  await fillValidPasswordLogin(page)

  await page.getByRole('button', { name: '登录' }).click()

  await expect(page.getByRole('alert')).toContainText('HTTP 请求失败（503）')
})

test('renders a parser failure for an invalid login response', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      body: JSON.stringify({ user: {} }),
      contentType: 'application/json',
      status: 200,
    }),
  )
  await page.goto('/login/password')
  await fillValidPasswordLogin(page)

  await page.getByRole('button', { name: '登录' }).click()

  await expect(page.getByRole('alert')).toContainText('登录响应缺少 user.id')
})

test('blocks an external redirect after login', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      body: JSON.stringify(authSessionResponse),
      contentType: 'application/json',
      status: 200,
    }),
  )
  await page.goto('/login/password?redirect=//evil.example')
  await fillValidPasswordLogin(page)

  await page.getByRole('button', { name: '登录' }).click()

  await expect(page).toHaveURL(/\/$/)
  expect(new URL(page.url()).origin).toBe('http://127.0.0.1:4173')
})

test('redirects an unauthenticated profile deep link to login', async ({ page }) => {
  await page.goto('/me')

  await expect(page).toHaveURL(/\/login\/password\?redirect=\/me$/)
  await expect(page.getByRole('heading', { name: '手机号密码登录' })).toBeVisible()
})

test('loads the current profile with bearer auth after login', async ({ page }) => {
  await page.route('**/api/profile/me', async (route) => {
    expect(route.request().method()).toBe('GET')
    expect(route.request().headers().authorization).toBe('Bearer e2e-access-token')
    await route.fulfill({ body: JSON.stringify(profileResponse), contentType: 'application/json' })
  })
  await signInViaHttp(page, '/me')

  await expect(page).toHaveURL(/\/me$/)
  await expect(page.getByRole('heading', { name: 'E2E 用户' })).toBeVisible()
  await expect(page.getByText('@e2e_user')).toBeVisible()
})

test('validates, saves, and renders an updated profile', async ({ page }) => {
  let patchRequests = 0
  let patchAuthorization: string | undefined
  let patchBody: { expectedVersion?: number; profile?: { displayName?: string } } = {}
  await page.route('**/api/profile/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      patchRequests += 1
      patchAuthorization = route.request().headers().authorization
      patchBody = route.request().postDataJSON()
      await route.fulfill({
        body: JSON.stringify({
          ...profileResponse,
          profile: { ...profileResponse.profile, displayName: '更新后的名字' },
          version: 2,
        }),
        contentType: 'application/json',
      })
      return
    }
    await route.fulfill({ body: JSON.stringify(profileResponse), contentType: 'application/json' })
  })
  await signInViaHttp(page, '/me')
  await page.getByRole('link', { name: '编辑资料' }).click()
  await page.getByLabel('名字').fill('')
  await page.getByRole('button', { name: '保存资料' }).click()
  await expect(page.getByText('名字长度必须为 1–20 个字符')).toBeVisible()
  expect(patchRequests).toBe(0)

  await page.getByLabel('名字').fill('更新后的名字')
  await page.getByRole('button', { name: '保存资料' }).click()

  await expect(page).toHaveURL(/\/me$/)
  await expect(page.getByRole('heading', { name: '更新后的名字' })).toBeVisible()
  expect(patchRequests).toBe(1)
  expect(patchAuthorization).toBe('Bearer e2e-access-token')
  expect(patchBody.expectedVersion).toBe(1)
  expect(patchBody.profile?.displayName).toBe('更新后的名字')
})

test('keeps local profile edits on HTTP 409 conflict', async ({ page }) => {
  await page.route('**/api/profile/me', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ body: '{}', contentType: 'application/json', status: 409 })
      : route.fulfill({ body: JSON.stringify(profileResponse), contentType: 'application/json' }),
  )
  await signInViaHttp(page, '/me/edit-userinfo')
  await page.getByLabel('名字').fill('本地未保存名字')
  await page.getByRole('button', { name: '保存资料' }).click()

  await expect(page.getByRole('alert')).toContainText('资料已被其他设备更新')
  await expect(page.getByLabel('名字')).toHaveValue('本地未保存名字')
})

test('signs out and returns to login when profile returns 401', async ({ page }) => {
  await page.route('**/api/profile/me', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 401 }),
  )
  await signInViaHttp(page, '/me')

  await expect(page).toHaveURL(/\/login\/password\?redirect=\/me$/)
  await expect(page.getByRole('link', { name: '登录' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '手机号密码登录' })).toBeVisible()
})

test('renders profile HTTP 503 without a page exception', async ({ page }) => {
  await page.route('**/api/profile/me', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
  )
  await signInViaHttp(page, '/me')

  await expect(page.getByRole('alert')).toContainText('HTTP 请求失败（503）')
})

test('renders a parser error for an invalid profile response', async ({ page }) => {
  await page.route('**/api/profile/me', (route) =>
    route.fulfill({
      body: JSON.stringify({ profile: {}, stats: {}, version: 1 }),
      contentType: 'application/json',
    }),
  )
  await signInViaHttp(page, '/me')

  await expect(page.getByRole('alert')).toContainText('资料响应字段无效')
})

test('redirects an unauthenticated message deep link to login', async ({ page }) => {
  await page.goto('/message/chat/conv-e2e')

  await expect(page).toHaveURL(/\/login\/password\?redirect=\/message\/chat\/conv-e2e$/)
  await expect(page.getByRole('heading', { name: '手机号密码登录' })).toBeVisible()
})

test('loads and cursor-paginates conversations with bearer auth', async ({ page }) => {
  const cursors: Array<string | null> = []
  await page.route('**/api/messages/conversations**', async (route) => {
    const url = new URL(route.request().url())
    expect(url.pathname).toBe('/api/messages/conversations')
    expect(route.request().headers().authorization).toBe('Bearer e2e-access-token')
    const cursor = url.searchParams.get('cursor')
    cursors.push(cursor)
    await route.fulfill({
      body: JSON.stringify(
        cursor === 'page-2'
          ? {
              conversations: [conversationPayload('conv-second', '第二位好友', 0)],
              nextCursor: null,
            }
          : { conversations: [messageConversationResponse], nextCursor: 'page-2' },
      ),
      contentType: 'application/json',
    })
  })
  await signInViaHttp(page, '/message')

  await expect(page.getByRole('heading', { name: '消息', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: /E2E 好友/ })).toBeVisible()
  await expect(page.locator('.message-unread-summary')).toContainText(/2\s*条未读/)
  await page.getByRole('button', { name: '加载更多会话' }).click()
  await expect(page.getByRole('link', { name: /第二位好友/ })).toBeVisible()
  expect(cursors).toEqual([null, 'page-2'])
})

test('renders an explicit empty conversation state', async ({ page }) => {
  await page.route('**/api/messages/conversations**', (route) =>
    route.fulfill({
      body: JSON.stringify({ conversations: [], nextCursor: null }),
      contentType: 'application/json',
    }),
  )
  await signInViaHttp(page, '/message')

  await expect(page.getByRole('heading', { name: '还没有会话' })).toBeVisible()
})

test('opens, marks read, validates, and sends in a stable conversation deep link', async ({
  page,
}) => {
  let readRequests = 0
  let sendRequests = 0
  let sentBody: { body?: string } = {}
  await page.route('**/api/messages/conversations**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    expect(request.headers().authorization).toBe('Bearer e2e-access-token')
    if (request.method() === 'GET' && url.pathname.endsWith('/conv-e2e/messages')) {
      await route.fulfill({
        body: JSON.stringify(messageThreadResponse),
        contentType: 'application/json',
      })
      return
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/conv-e2e/read')) {
      readRequests += 1
      await route.fulfill({
        body: JSON.stringify({
          conversationId: 'conv-e2e',
          readAt: '2026-08-31T02:01:00.000Z',
        }),
        contentType: 'application/json',
      })
      return
    }
    if (request.method() === 'POST' && url.pathname.endsWith('/conv-e2e/messages')) {
      sendRequests += 1
      sentBody = request.postDataJSON()
      await route.fulfill({
        body: JSON.stringify(
          messagePayload('conv-e2e', 'msg-sent-e2e', 'E2E 发送内容', 'e2e-user'),
        ),
        contentType: 'application/json',
      })
      return
    }
    await route.abort()
  })
  await signInViaHttp(page, '/message/chat/conv-e2e')

  await expect(page).toHaveURL(/\/message\/chat\/conv-e2e$/)
  await expect(page.getByRole('heading', { name: 'E2E 好友' })).toBeVisible()
  await expect(page.getByText('E2E 初始消息')).toBeVisible()
  expect(readRequests).toBe(1)

  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByText('消息必须为 1–500 个字符')).toBeVisible()
  expect(sendRequests).toBe(0)

  await page.getByLabel('消息内容').fill('E2E 发送内容')
  await page.getByRole('button', { name: '发送', exact: true }).click()
  await expect(page.getByText('E2E 发送内容')).toBeVisible()
  expect(sendRequests).toBe(1)
  expect(sentBody).toEqual({ body: 'E2E 发送内容' })
})

test('redirects the legacy chat URL without a conversation ID', async ({ page }) => {
  await page.route('**/api/messages/conversations**', (route) =>
    route.fulfill({
      body: JSON.stringify({ conversations: [messageConversationResponse], nextCursor: null }),
      contentType: 'application/json',
    }),
  )
  await signInViaHttp(page, '/message/chat')

  await expect(page).toHaveURL(/\/message$/)
  await expect(page.getByRole('heading', { name: '消息', exact: true })).toBeVisible()
})

test('rejects an invalid conversation ID before an HTTP request', async ({ page }) => {
  let requests = 0
  await page.route('**/api/messages/conversations**', (route) => {
    requests += 1
    return route.abort()
  })
  await signInViaHttp(page, '/message/chat/bad.id')

  await expect(page.getByRole('alert')).toContainText('会话地址无效')
  expect(requests).toBe(0)
})

test('signs out and shows login when the conversation list returns 401', async ({ page }) => {
  await page.route('**/api/messages/conversations**', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 401 }),
  )
  await signInViaHttp(page, '/message')

  await expect(page).toHaveURL(/\/login\/password\?redirect=\/message$/)
  await expect(page.getByRole('heading', { name: '手机号密码登录' })).toBeVisible()
})

test('renders message HTTP 503 without a page exception', async ({ page }) => {
  await page.route('**/api/messages/conversations**', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
  )
  await signInViaHttp(page, '/message')

  await expect(page.getByRole('alert')).toContainText('HTTP 请求失败（503）')
})

test('renders a parser error for an invalid conversation list', async ({ page }) => {
  await page.route('**/api/messages/conversations**', (route) =>
    route.fulfill({
      body: JSON.stringify({ conversations: [{}], nextCursor: null }),
      contentType: 'application/json',
    }),
  )
  await signInViaHttp(page, '/message')

  await expect(page.getByRole('alert')).toContainText('会话列表响应字段无效')
})

test('renders a typed not-found state for a missing conversation', async ({ page }) => {
  await page.route('**/api/messages/conversations**', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 404 }),
  )
  await signInViaHttp(page, '/message/chat/conv-missing')

  await expect(page.getByRole('alert')).toContainText('会话不存在')
})

test('loads, cursor-paginates, and refreshes the feed', async ({ page }) => {
  const cursors: Array<string | null> = []
  let firstPageCalls = 0
  await page.route('**/api/feed**', async (route) => {
    const url = new URL(route.request().url())
    expect(url.pathname).toBe('/api/feed')
    const cursor = url.searchParams.get('cursor')
    cursors.push(cursor)
    if (cursor === 'page-2') {
      await route.fulfill({
        body: JSON.stringify({
          items: [feedPayload('feed-second', '第二页推荐内容', '/feed/covers/alley.jpg')],
          nextCursor: null,
        }),
        contentType: 'application/json',
      })
      return
    }
    firstPageCalls += 1
    await route.fulfill({
      body: JSON.stringify({
        items: [
          firstPageCalls === 1 ? feedPayload() : feedPayload('feed-refreshed', '刷新后的推荐内容'),
        ],
        nextCursor: firstPageCalls === 1 ? 'page-2' : null,
      }),
      contentType: 'application/json',
    })
  })
  await page.goto('/home')

  await expect(page.getByRole('heading', { name: '推荐内容', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'E2E 推荐内容', exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page
        .locator('.feed-card img')
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true)
  await page.getByRole('button', { name: '加载更多内容' }).click()
  await expect(page.getByRole('link', { name: '第二页推荐内容', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '刷新推荐' }).click()
  await expect(page.getByRole('link', { name: '刷新后的推荐内容', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '第二页推荐内容', exact: true })).toHaveCount(0)
  expect(cursors).toEqual([null, 'page-2', null])
})

test('renders an explicit empty feed state', async ({ page }) => {
  await page.route('**/api/feed**', (route) =>
    route.fulfill({
      body: JSON.stringify({ items: [], nextCursor: null }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home')

  await expect(page.getByRole('heading', { name: '暂时没有推荐内容' })).toBeVisible()
})

test('renders feed HTTP 503 without a page exception', async ({ page }) => {
  await page.route('**/api/feed**', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
  )
  await page.goto('/home')

  await expect(page.getByRole('alert')).toContainText('HTTP 请求失败（503）')
})

test('rejects an external cover URL from a feed response', async ({ page }) => {
  await page.route('**/api/feed**', (route) =>
    route.fulfill({
      body: JSON.stringify({
        items: [feedPayload('feed-external', '不安全封面', 'https://example.test/cover.jpg')],
        nextCursor: null,
      }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home')

  await expect(page.getByRole('alert')).toContainText('Feed page 字段无效')
})

test('searches and cursor-paginates feed results', async ({ page }) => {
  const cursors: Array<string | null> = []
  await page.route('**/api/feed/search**', async (route) => {
    const url = new URL(route.request().url())
    expect(url.searchParams.get('q')).toBe('Vue')
    const cursor = url.searchParams.get('cursor')
    cursors.push(cursor)
    await route.fulfill({
      body: JSON.stringify(
        cursor === 'search-2'
          ? {
              items: [feedPayload('feed-vue-second', 'Vue 搜索第二页')],
              nextCursor: null,
            }
          : { items: [feedPayload('feed-vue', 'Vue 搜索结果')], nextCursor: 'search-2' },
      ),
      contentType: 'application/json',
    })
  })
  await page.goto('/home/search?q=Vue')

  await expect(page.getByRole('heading', { name: '搜索内容' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Vue 搜索结果', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '加载更多搜索结果' }).click()
  await expect(page.getByRole('link', { name: 'Vue 搜索第二页', exact: true })).toBeVisible()
  expect(cursors).toEqual([null, 'search-2'])
})

test('validates an oversized search query before HTTP', async ({ page }) => {
  let requests = 0
  await page.route('**/api/feed/search**', (route) => {
    requests += 1
    return route.abort()
  })
  await page.goto(`/home/search?q=${'a'.repeat(51)}`)

  await expect(page.getByRole('alert')).toContainText('搜索关键词必须为 1–50 个字符')
  expect(requests).toBe(0)
})

test('renders an explicit empty search result', async ({ page }) => {
  await page.route('**/api/feed/search**', (route) =>
    route.fulfill({
      body: JSON.stringify({ items: [], nextCursor: null }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home/search?q=不存在')

  await expect(page.getByRole('heading', { name: '没有找到“不存在”' })).toBeVisible()
})

test('loads and reloads a stable feed detail deep link', async ({ page }) => {
  let requests = 0
  await page.route('**/api/feed/feed-e2e', (route) => {
    requests += 1
    return route.fulfill({
      body: JSON.stringify({ item: feedPayload(), media: mediaSourceResponse }),
      contentType: 'application/json',
    })
  })
  await page.goto('/home/content/feed-e2e')

  await expect(page.getByRole('heading', { name: 'E2E 推荐内容' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '播放器只接受用户操作' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'E2E 推荐内容' })).toBeVisible()
  expect(requests).toBe(2)
})

test('plays local media only after user activation and exposes keyboard controls', async ({
  page,
}) => {
  const mediaRequests: Array<{ range?: string; url: string }> = []
  page.on('request', (request) => {
    if (request.url().endsWith('/feed/media/field-demo.mp4')) {
      mediaRequests.push({
        url: request.url(),
        ...(request.headers().range ? { range: request.headers().range } : {}),
      })
    }
  })
  await page.route('**/api/feed/feed-e2e', (route) =>
    route.fulfill({
      body: JSON.stringify({ item: feedPayload(), media: mediaSourceResponse }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home/content/feed-e2e')
  const media = page.getByTestId('media-element')

  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    'content',
    /media-src 'self'/,
  )
  await expect(page.getByTestId('playback-status')).toHaveText('已暂停')
  await expect(media).not.toHaveAttribute('autoplay', '')
  expect(await media.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
  expect(await media.evaluate((element: HTMLVideoElement) => element.currentTime)).toBe(0)

  await page.getByRole('button', { name: '播放', exact: true }).click()
  await expect(page.getByTestId('playback-status')).toHaveText('播放中')
  await expect
    .poll(() => media.evaluate((element: HTMLVideoElement) => element.currentTime))
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  await expect(page.getByTestId('playback-status')).toHaveText('已暂停')

  await page.getByLabel('媒体播放器').focus()
  await page.keyboard.press('m')
  await expect(page.getByRole('button', { name: '静音', exact: true })).toBeVisible()
  await page.keyboard.press(' ')
  await expect(page.getByTestId('playback-status')).toHaveText('播放中')
  expect(mediaRequests.length).toBeGreaterThan(0)
  expect(mediaRequests.every((request) => request.url.startsWith('http://127.0.0.1:4173/'))).toBe(
    true,
  )
})

test('reaches ended and can replay the local media fixture', async ({ page }) => {
  await page.route('**/api/feed/feed-e2e', (route) =>
    route.fulfill({
      body: JSON.stringify({ item: feedPayload(), media: mediaSourceResponse }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home/content/feed-e2e')
  const media = page.getByTestId('media-element')
  await page.getByRole('button', { name: '播放', exact: true }).click()
  await media.evaluate((element: HTMLVideoElement) => {
    element.currentTime = Math.max(0, element.duration - 0.15)
  })

  await expect(page.getByTestId('playback-status')).toHaveText('播放结束', { timeout: 5000 })
  await expect(page.getByRole('button', { name: '重新播放', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '重新播放', exact: true }).click()
  await expect(page.getByTestId('playback-status')).toHaveText('播放中')
})

test('renders a media element error for a missing local MP4', async ({ page }) => {
  await page.route('**/api/feed/feed-e2e', (route) =>
    route.fulfill({
      body: JSON.stringify({
        item: feedPayload(),
        media: { ...mediaSourceResponse, src: '/feed/media/missing.mp4' },
      }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home/content/feed-e2e')

  await expect(page.getByRole('alert')).toContainText('媒体加载失败')
  await expect(page.getByTestId('playback-status')).toHaveText('播放失败')
})

test('rejects an external media URL before creating a video request', async ({ page }) => {
  let externalRequests = 0
  await page.route('https://media.example.test/**', (route) => {
    externalRequests += 1
    return route.abort()
  })
  await page.route('**/api/feed/feed-e2e', (route) =>
    route.fulfill({
      body: JSON.stringify({
        item: feedPayload(),
        media: { ...mediaSourceResponse, src: 'https://media.example.test/video.mp4' },
      }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home/content/feed-e2e')

  await expect(page.getByRole('alert')).toContainText('Feed detail 字段无效')
  expect(externalRequests).toBe(0)
})

test('disables media transitions under reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/api/feed/feed-e2e', (route) =>
    route.fulfill({
      body: JSON.stringify({ item: feedPayload(), media: mediaSourceResponse }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home/content/feed-e2e')

  await expect(page.getByTestId('playback-status')).toHaveText('已暂停')
  expect(
    await page
      .getByRole('button', { name: '播放', exact: true })
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe('0s')
})

test('serves the local MP4 with byte-range responses', async ({ request }) => {
  const response = await request.get('/feed/media/field-demo.mp4', {
    headers: { Range: 'bytes=0-99' },
  })

  expect(response.status()).toBe(206)
  expect(response.headers()['accept-ranges']).toBe('bytes')
  expect(response.headers()['content-range']).toBe('bytes 0-99/31973')
  expect((await response.body()).byteLength).toBe(100)
})

test('renders a typed not-found state for missing feed detail', async ({ page }) => {
  await page.route('**/api/feed/feed-missing', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 404 }),
  )
  await page.goto('/home/content/feed-missing')

  await expect(page.getByRole('alert')).toContainText('内容不存在')
})

test('rejects an invalid feed ID before HTTP', async ({ page }) => {
  let requests = 0
  await page.route('**/api/feed/**', (route) => {
    requests += 1
    return route.abort()
  })
  await page.goto('/home/content/bad.id')

  await expect(page.getByRole('alert')).toContainText('内容地址无效')
  expect(requests).toBe(0)
})

test('redirects the legacy video detail URL without content identity', async ({ page }) => {
  await page.route('**/api/feed**', (route) =>
    route.fulfill({
      body: JSON.stringify({ items: [feedPayload()], nextCursor: null }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/video-detail')

  await expect(page).toHaveURL(/\/home$/)
  await expect(page.getByRole('heading', { name: '推荐内容', exact: true })).toBeVisible()
})

test('loads and cursor-paginates public feed comments', async ({ page }) => {
  const cursors: Array<string | null> = []
  await mockFeedDetail(page)
  await page.route('**/api/feed/feed-e2e/comments**', async (route) => {
    const cursor = new URL(route.request().url()).searchParams.get('cursor')
    cursors.push(cursor)
    await route.fulfill({
      body: JSON.stringify(
        cursor === 'comments-2'
          ? { comments: [commentPayload('comment-2', '第二页评论')], nextCursor: null }
          : { comments: [commentPayload()], nextCursor: 'comments-2' },
      ),
      contentType: 'application/json',
    })
  })
  await page.goto('/home/content/feed-e2e')
  await expect(page.getByText('E2E 评论', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '加载更多评论' }).click()
  await expect(page.getByText('第二页评论')).toBeVisible()
  expect(cursors).toEqual([null, 'comments-2'])
})

test('redirects an unauthenticated like write to login', async ({ page }) => {
  await mockFeedDetail(page)
  await page.goto('/home/content/feed-e2e')
  await page.getByRole('button', { name: /喜欢/ }).click()
  await expect(page).toHaveURL(/\/login\/password\?redirect=\/home\/content\/feed-e2e$/)
  await expect(page.getByRole('heading', { name: '手机号密码登录' })).toBeVisible()
})

test('restores comment focus after login redirect', async ({ page }) => {
  await mockFeedDetail(page)
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ body: JSON.stringify(authSessionResponse), contentType: 'application/json' }),
  )
  await page.goto('/home/content/feed-e2e')
  await page.getByLabel('发表评论').fill('登录后继续')
  await page.getByRole('button', { name: '登录后评论' }).click()
  await fillValidPasswordLogin(page)
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page).toHaveURL(/\/home\/content\/feed-e2e#comment-form$/)
  await expect(page.getByLabel('发表评论')).toBeFocused()
})

test('optimistically likes and accepts the versioned server result', async ({ page }) => {
  let likeBody: { expectedVersion?: number; liked?: boolean } = {}
  await mockFeedDetail(page)
  await page.route('**/api/feed/feed-e2e/like', async (route) => {
    likeBody = route.request().postDataJSON()
    await new Promise((resolve) => setTimeout(resolve, 150))
    await route.fulfill({
      body: JSON.stringify({ feedId: 'feed-e2e', liked: true, likeCount: 1001, version: 2 }),
      contentType: 'application/json',
    })
  })
  await signInViaHttp(page, '/home/content/feed-e2e')
  const button = page.getByRole('button', { name: /喜欢/ })
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('正在同步点赞…')).toBeVisible()
  await expect(page.getByRole('button', { name: /取消喜欢/ })).toContainText('1001')
  expect(likeBody).toEqual({ liked: true, expectedVersion: 1 })
})

test('rolls back an optimistic like on HTTP 409', async ({ page }) => {
  await mockFeedDetail(page)
  await page.route('**/api/feed/feed-e2e/like', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 409 }),
  )
  await signInViaHttp(page, '/home/content/feed-e2e')
  await page.getByRole('button', { name: /喜欢/ }).click()
  await expect(page.getByRole('alert')).toContainText('内容状态已更新')
  await expect(page.getByRole('button', { name: /喜欢/ })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: /喜欢/ })).toContainText('1000')
})

test('validates and duplicate-protects optimistic comment submission', async ({ page }) => {
  let requests = 0
  await mockFeedDetail(page)
  await page.route('**/api/feed/feed-e2e/comments', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        body: JSON.stringify({ comments: [], nextCursor: null }),
        contentType: 'application/json',
      })
      return
    }
    requests += 1
    await new Promise((resolve) => setTimeout(resolve, 180))
    await route.fulfill({
      body: JSON.stringify(commentPayload('comment-created', '浏览器确认评论')),
      contentType: 'application/json',
    })
  })
  await signInViaHttp(page, '/home/content/feed-e2e')
  await page.getByRole('button', { name: '发表评论' }).click()
  await expect(page.getByText('评论必须为 1–300 个字符')).toBeVisible()
  expect(requests).toBe(0)
  await page.getByLabel('发表评论').fill('浏览器确认评论')
  await page.locator('#comment-form').evaluate((form: HTMLFormElement) => {
    form.requestSubmit()
    form.requestSubmit()
  })
  await expect(page.getByText('正在发送…')).toBeVisible()
  await expect(page.getByText('浏览器确认评论')).toBeVisible()
  await expect(page.getByLabel('发表评论')).toBeFocused()
  expect(requests).toBe(1)
})

test('rolls back HTTP 429 comment and preserves the draft', async ({ page }) => {
  await mockFeedDetail(page)
  await page.route('**/api/feed/feed-e2e/comments', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          body: JSON.stringify({ comments: [], nextCursor: null }),
          contentType: 'application/json',
        })
      : route.fulfill({ body: '{}', contentType: 'application/json', status: 429 }),
  )
  await signInViaHttp(page, '/home/content/feed-e2e')
  await page.getByLabel('发表评论').fill('请保留这段输入')
  await page.getByRole('button', { name: '发表评论' }).click()
  await expect(page.getByRole('alert')).toContainText('操作过于频繁')
  await expect(page.getByLabel('发表评论')).toHaveValue('请保留这段输入')
  await expect(page.getByText('正在发送…')).toHaveCount(0)
})

test('redirects an expired comment write on HTTP 401', async ({ page }) => {
  await mockFeedDetail(page)
  await page.route('**/api/feed/feed-e2e/comments', (route) =>
    route.request().method() === 'GET'
      ? route.fulfill({
          body: JSON.stringify({ comments: [], nextCursor: null }),
          contentType: 'application/json',
        })
      : route.fulfill({ body: '{}', contentType: 'application/json', status: 401 }),
  )
  await signInViaHttp(page, '/home/content/feed-e2e')
  await page.getByLabel('发表评论').fill('session expired')
  await page.getByRole('button', { name: '发表评论' }).click()
  await expect(page).toHaveURL(
    /\/login\/password\?redirect=\/home\/content\/feed-e2e%23comment-form$/,
  )
  await expect(page.getByRole('heading', { name: '手机号密码登录' })).toBeVisible()
})

test('renders comment HTTP 503 without hiding feed detail', async ({ page }) => {
  await mockFeedDetail(page)
  await page.route('**/api/feed/feed-e2e/comments**', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
  )
  await page.goto('/home/content/feed-e2e')
  await expect(page.getByRole('heading', { name: 'E2E 推荐内容' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('HTTP 请求失败（503）')
})

test('renders a parser error for invalid comment payload', async ({ page }) => {
  await mockFeedDetail(page)
  await page.route('**/api/feed/feed-e2e/comments**', (route) =>
    route.fulfill({
      body: JSON.stringify({ comments: [{ body: '' }], nextCursor: null }),
      contentType: 'application/json',
    }),
  )
  await page.goto('/home/content/feed-e2e')
  await expect(page.getByRole('alert')).toContainText('评论列表字段无效')
})

test('loads paginated notifications and marks all read', async ({ page }) => {
  let reads = 0
  await page.route('**/api/notifications**', async (route) => {
    if (route.request().method() === 'POST') {
      reads += 1
      await route.fulfill({
        body: JSON.stringify({ ids: ['notice-1', 'notice-2'], readAt: '2026-09-01T02:00:00Z' }),
        contentType: 'application/json',
      })
      return
    }
    const cursor = new URL(route.request().url()).searchParams.get('cursor')
    await route.fulfill({
      body: JSON.stringify(
        cursor
          ? {
              notifications: [
                {
                  id: 'notice-2',
                  kind: 'task',
                  title: '任务通知',
                  body: '第二页',
                  createdAt: '2026-09-01T01:00:00Z',
                  read: false,
                },
              ],
              nextCursor: null,
            }
          : {
              notifications: [
                {
                  id: 'notice-1',
                  kind: 'system',
                  title: '系统通知',
                  body: '第一页',
                  createdAt: '2026-09-01T01:00:00Z',
                  read: false,
                },
              ],
              nextCursor: 'p2',
            },
      ),
      contentType: 'application/json',
    })
  })
  await signInViaHttp(page, '/message/notifications')
  await page.getByRole('button', { name: '加载更多通知' }).click()
  await expect(page.getByText('第二页')).toBeVisible()
  await page.getByRole('button', { name: '全部已读' }).click()
  await expect(page.getByText('0 条未读')).toBeVisible()
  expect(reads).toBe(1)
})

test('renders notification 503 without losing the route', async ({ page }) => {
  await page.route('**/api/notifications**', (route) =>
    route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
  )
  await signInViaHttp(page, '/message/notifications')
  await expect(page.getByRole('alert')).toContainText('HTTP 请求失败（503）')
})

test('validates attachment MIME before upload', async ({ page }) => {
  let uploads = 0
  await page.route('**/api/messages/conversations/**/attachments', (route) => {
    uploads += 1
    return route.abort()
  })
  await page.route('**/api/messages/conversations/conv-e2e/messages', (route) =>
    route.fulfill({ body: JSON.stringify(messageThreadResponse), contentType: 'application/json' }),
  )
  await page.route('**/api/messages/conversations/conv-e2e/read', (route) =>
    route.fulfill({
      body: JSON.stringify({ conversationId: 'conv-e2e', readAt: '2026-09-01T01:00:00Z' }),
      contentType: 'application/json',
    }),
  )
  await signInViaHttp(page, '/message/chat/conv-e2e')
  await page
    .getByLabel('选择附件')
    .setInputFiles({ name: 'bad.gif', mimeType: 'image/gif', buffer: Buffer.from('x') })
  await expect(page.getByRole('alert')).toContainText('只支持 JPEG、PNG 或 MP4')
  expect(uploads).toBe(0)
})
