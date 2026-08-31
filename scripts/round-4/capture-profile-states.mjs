import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(scriptDirectory, '../..')
const screenshotRoot = resolve(root, 'docs/round-4/screenshots')
const outputFile = resolve(root, 'docs/round-4/generated/profile-browser-states.json')
const baseUrl = process.env.ROUND4_BASE_URL || 'http://127.0.0.1:4173'

const authResponse = {
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
    const screenshot = `${id}.png`
    await page.screenshot({ path: resolve(screenshotRoot, screenshot), fullPage: true })
    results.push({ id, finalUrl: page.url(), pageErrors, screenshot: `screenshots/${screenshot}` })
    await context.close()
  }

  try {
    await capture(
      'profile-success',
      async (page) => {
        await page.route('**/api/profile/me', (route) =>
          route.fulfill({ body: JSON.stringify(profileResponse), contentType: 'application/json' }),
        )
        await login(page, '/me')
      },
      (page) => page.getByRole('heading', { name: 'E2E 用户' }).waitFor(),
    )
    await capture(
      'profile-edit',
      async (page) => {
        await page.route('**/api/profile/me', (route) =>
          route.fulfill({ body: JSON.stringify(profileResponse), contentType: 'application/json' }),
        )
        await login(page, '/me/edit-userinfo')
      },
      (page) => page.getByRole('heading', { name: '编辑资料' }).waitFor(),
    )
    await capture(
      'profile-conflict',
      async (page) => {
        await page.route('**/api/profile/me', (route) =>
          route.request().method() === 'PATCH'
            ? route.fulfill({ body: '{}', contentType: 'application/json', status: 409 })
            : route.fulfill({
                body: JSON.stringify(profileResponse),
                contentType: 'application/json',
              }),
        )
        await login(page, '/me/edit-userinfo')
        await page.getByLabel('名字').fill('本地未保存名字')
        await page.getByRole('button', { name: '保存资料' }).click()
      },
      (page) => page.getByRole('alert').getByText('资料已被其他设备更新，请重新加载。').waitFor(),
    )
    await capture(
      'profile-503',
      async (page) => {
        await page.route('**/api/profile/me', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
        )
        await login(page, '/me')
      },
      (page) => page.getByRole('alert').getByText('HTTP 请求失败（503）。').waitFor(),
    )
    await capture(
      'profile-unauthorized',
      async (page) => {
        await page.route('**/api/profile/me', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 401 }),
        )
        await login(page, '/me')
      },
      (page) => page.getByRole('heading', { name: '手机号密码登录' }).waitFor(),
    )
    await capture(
      'profile-parse-error',
      async (page) => {
        await page.route('**/api/profile/me', (route) =>
          route.fulfill({
            body: JSON.stringify({ profile: {}, stats: {}, version: 1 }),
            contentType: 'application/json',
          }),
        )
        await login(page, '/me')
      },
      (page) => page.getByRole('alert').getByText('资料响应字段无效。').waitFor(),
    )
  } finally {
    await browser.close()
  }

  if (results.some((result) => result.pageErrors.length)) {
    throw new Error('Profile visual capture encountered page errors')
  }
  await writeFile(
    outputFile,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`,
  )
  console.log(`Captured ${results.length} profile states`)
}

await main()
