import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const screenshotRoot = resolve(projectRoot, 'docs/round-4/screenshots')
const outputFile = resolve(projectRoot, 'docs/round-4/generated/browser-states.json')
const baseUrl = process.env.ROUND4_BASE_URL || 'http://127.0.0.1:4173'

const session = {
  user: { id: 'visual-user', displayName: '视觉验证用户' },
  accessToken: 'visual-access-token',
}

async function fillValidForm(page, password = 'douyin-demo') {
  await page.getByRole('textbox', { name: '手机号', exact: true }).fill('13800138000')
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('checkbox').check()
}

async function main() {
  await mkdir(screenshotRoot, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const results = []

  async function capture(id, path, prepare, verify) {
    const context = await browser.newContext({
      colorScheme: 'dark',
      locale: 'zh-CN',
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    if (prepare) await prepare(page)
    await page.goto(new URL(path, baseUrl).toString(), { waitUntil: 'domcontentloaded' })
    await verify(page)
    const screenshot = `${id}.png`
    await page.screenshot({ path: resolve(screenshotRoot, screenshot), fullPage: true })
    results.push({ id, finalUrl: page.url(), pageErrors, screenshot: `screenshots/${screenshot}` })
    await context.close()
  }

  try {
    await capture('login-entry', '/login', undefined, (page) =>
      page.getByRole('heading', { name: '登录看朋友内容' }).waitFor(),
    )
    await capture('password-validation', '/login/password', undefined, async (page) => {
      await page.getByRole('button', { name: '登录' }).click()
      await page.getByText('请输入有效的中国大陆手机号').waitFor()
    })
    await capture(
      'password-unauthorized',
      '/login/password',
      (page) =>
        page.route('**/api/auth/login', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 401 }),
        ),
      async (page) => {
        await fillValidForm(page, 'wrong-pass')
        await page.getByRole('button', { name: '登录' }).click()
        await page.getByRole('alert').getByText('手机号或密码不正确。').waitFor()
      },
    )
    await capture(
      'password-503',
      '/login/password',
      (page) =>
        page.route('**/api/auth/login', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
        ),
      async (page) => {
        await fillValidForm(page)
        await page.getByRole('button', { name: '登录' }).click()
        await page.getByRole('alert').getByText('HTTP 请求失败（503）。').waitFor()
      },
    )
    await capture(
      'password-success',
      '/login/password?redirect=/',
      (page) =>
        page.route('**/api/auth/login', (route) =>
          route.fulfill({
            body: JSON.stringify(session),
            contentType: 'application/json',
            status: 200,
          }),
        ),
      async (page) => {
        await fillValidForm(page)
        await page.getByRole('button', { name: '登录' }).click()
        await page.getByText('视觉验证用户').waitFor()
      },
    )
  } finally {
    await browser.close()
  }

  if (results.some((result) => result.pageErrors.length)) {
    throw new Error('Login visual capture encountered page errors')
  }
  await writeFile(
    outputFile,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`,
  )
  console.log(`Captured ${results.length} login states`)
}

await main()
