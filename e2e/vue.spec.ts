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

async function fillValidPasswordLogin(page: Page, password = 'douyin-demo') {
  await page.getByRole('textbox', { name: '手机号', exact: true }).fill('13800138000')
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('checkbox').check()
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
