import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import shopFixture from '../../src/features/shop/data/goods.fixture.json' with { type: 'json' }

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const screenshotRoot = resolve(projectRoot, 'docs/round-3/screenshots')
const outputFile = resolve(projectRoot, 'docs/round-3/generated/browser-states.json')
const baseUrl = process.env.ROUND3_BASE_URL || 'http://127.0.0.1:4173'

const cases = [
  { id: 'health-http', path: '/health', expectedText: 'http' },
  { id: 'shop-http-success', path: '/shop', expectedText: '商品样板', body: shopFixture },
  { id: 'shop-http-empty', path: '/shop', expectedText: '目前没有商品', body: [] },
  {
    id: 'shop-http-503',
    path: '/shop',
    expectedText: 'HTTP 请求失败（503）',
    body: { message: 'maintenance' },
    status: 503,
  },
  {
    id: 'shop-http-parse-error',
    path: '/shop',
    expectedText: '商品列表必须是数组',
    body: { invalid: true },
  },
]

async function capture(browser, testCase) {
  const context = await browser.newContext({
    colorScheme: 'dark',
    locale: 'zh-CN',
    reducedMotion: 'reduce',
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()
  const consoleErrors = []
  const pageErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => pageErrors.push(error.message))

  if ('body' in testCase) {
    await page.route('**/api/shop/products', (route) =>
      route.fulfill({
        body: JSON.stringify(testCase.body),
        contentType: 'application/json',
        status: testCase.status ?? 200,
      }),
    )
  }

  const response = await page.goto(new URL(testCase.path, baseUrl).toString(), {
    waitUntil: 'domcontentloaded',
  })
  await page.getByText(testCase.expectedText, { exact: false }).first().waitFor()
  if (testCase.id === 'shop-http-success') {
    await page.waitForFunction(
      () => {
        const images = [...document.querySelectorAll('.product-card img')]
        return (
          images.length === 6 &&
          images.every(
            (image) =>
              image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0,
          )
        )
      },
      undefined,
      { timeout: 10_000 },
    )
  }
  const screenshot = `${testCase.id}.png`
  await page.screenshot({ path: resolve(screenshotRoot, screenshot), fullPage: true })
  const result = {
    id: testCase.id,
    documentStatus: response?.status() ?? null,
    finalUrl: page.url(),
    screenshot: `screenshots/${screenshot}`,
    consoleErrors,
    pageErrors,
  }
  await context.close()
  return result
}

async function main() {
  await mkdir(screenshotRoot, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const results = []
  try {
    for (const testCase of cases) {
      process.stdout.write(`Capturing ${testCase.id}... `)
      const result = await capture(browser, testCase)
      results.push(result)
      console.log(
        `pageErrors=${result.pageErrors.length} consoleErrors=${result.consoleErrors.length}`,
      )
    }
  } finally {
    await browser.close()
  }

  if (results.some((result) => result.pageErrors.length > 0)) {
    throw new Error('Round-3 visual capture encountered page errors')
  }
  const unexpectedConsoleErrors = results.filter(
    (result) =>
      result.id !== 'shop-http-503' ||
      result.consoleErrors.some((message) => !message.includes('503')) ||
      result.consoleErrors.length !== 1,
  )
  if (unexpectedConsoleErrors.some((result) => result.consoleErrors.length > 0)) {
    throw new Error('Round-3 visual capture encountered unexpected console errors')
  }

  await writeFile(
    outputFile,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        browser: 'Google Chrome via Playwright',
        results,
      },
      null,
      2,
    )}\n`,
  )
  console.log(`Round-3 browser states written to ${outputFile}`)
}

await main()
