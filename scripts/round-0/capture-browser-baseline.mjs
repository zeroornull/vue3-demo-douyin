import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(scriptDirectory, '../..')
const screenshotRoot = resolve(projectRoot, 'docs/round-0/screenshots')
const outputFile = resolve(projectRoot, 'docs/round-0/generated/browser-smoke.json')
const baseUrl = process.env.LEGACY_BASE_URL || 'http://127.0.0.1:4173'

const cases = [
  { id: 'home-mobile', path: '/home', viewport: { width: 390, height: 844 } },
  {
    id: 'search-mobile',
    path: '/home/search',
    viewport: { width: 390, height: 844 },
  },
  { id: 'shop-mobile', path: '/shop', viewport: { width: 390, height: 844 } },
  {
    id: 'shop-detail-mobile',
    path: '/shop/detail',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'shop-to-detail-mobile',
    path: '/shop',
    action: 'shop-to-detail',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'message-mobile',
    path: '/message',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'chat-mobile',
    path: '/message/chat',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'message-to-chat-mobile',
    path: '/message',
    action: 'message-to-chat',
    viewport: { width: 390, height: 844 },
  },
  { id: 'profile-mobile', path: '/me', viewport: { width: 390, height: 844 } },
  {
    id: 'edit-profile-mobile',
    path: '/me/edit-userinfo',
    viewport: { width: 390, height: 844 },
  },
  {
    id: 'profile-to-edit-mobile',
    path: '/me',
    action: 'profile-to-edit',
    viewport: { width: 390, height: 844 },
  },
  { id: 'login-mobile', path: '/login', viewport: { width: 390, height: 844 } },
  {
    id: 'video-detail-mobile',
    path: '/video-detail',
    viewport: { width: 390, height: 844 },
  },
  { id: 'home-narrow', path: '/home', viewport: { width: 360, height: 640 } },
  { id: 'home-desktop', path: '/home', viewport: { width: 1280, height: 720 } },
]

async function capture(browser, testCase) {
  const mobile = testCase.viewport.width < 500
  const context = await browser.newContext({
    colorScheme: 'dark',
    deviceScaleFactor: 1,
    hasTouch: mobile,
    isMobile: mobile,
    locale: 'zh-CN',
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Shanghai',
    userAgent: mobile
      ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36'
      : undefined,
    viewport: testCase.viewport,
  })
  const page = await context.newPage()
  const consoleMessages = []
  const pageErrors = []
  const requestFailures = []
  const responses = []

  page.on('console', (message) => {
    consoleMessages.push({
      location: message.location(),
      text: message.text(),
      type: message.type(),
    })
  })
  page.on('pageerror', (error) => {
    pageErrors.push({ message: error.message, stack: error.stack ?? null })
  })
  page.on('requestfailed', (request) => {
    requestFailures.push({
      errorText: request.failure()?.errorText ?? 'unknown',
      method: request.method(),
      resourceType: request.resourceType(),
      url: request.url(),
    })
  })
  page.on('response', (response) => {
    responses.push({
      resourceType: response.request().resourceType(),
      status: response.status(),
      url: response.url(),
    })
  })

  const startedAt = new Date().toISOString()
  let navigationError = null
  let actionError = null
  let responseStatus = null
  const url = new URL(testCase.path, baseUrl).toString()

  try {
    const response = await page.goto(url, {
      timeout: 30_000,
      waitUntil: 'domcontentloaded',
    })
    responseStatus = response?.status() ?? null
    await page.waitForTimeout(4_000)

    if (testCase.action === 'shop-to-detail') {
      await page.locator('.goods').first().click({ timeout: 15_000 })
      await page.waitForURL('**/shop/detail', { timeout: 15_000 })
      await page.waitForTimeout(2_000)
    } else if (testCase.action === 'message-to-chat') {
      await page.locator('.friend').first().click({ timeout: 15_000 })
      await page.waitForURL('**/message/chat', { timeout: 15_000 })
      await page.waitForTimeout(1_000)
    } else if (testCase.action === 'profile-to-edit') {
      await page.getByText('编辑资料', { exact: true }).first().click({ timeout: 15_000 })
      await page.waitForURL('**/me/edit-userinfo', { timeout: 15_000 })
      await page.waitForTimeout(1_000)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (responseStatus === null) navigationError = message
    else actionError = message
  }

  await page
    .addStyleTag({
      content:
        '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; caret-color: transparent !important; }',
    })
    .catch(() => undefined)

  const screenshot = `${testCase.id}.png`
  await page.screenshot({
    path: resolve(screenshotRoot, screenshot),
    fullPage: false,
  })

  const pageState = await page
    .evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0]
      const resources = performance.getEntriesByType('resource')
      return {
        bodyTextSample: document.body?.innerText.slice(0, 500) ?? '',
        counts: {
          anchors: document.querySelectorAll('a').length,
          buttons: document.querySelectorAll('button,[role="button"]').length,
          images: document.images.length,
          inputs: document.querySelectorAll('input,textarea,select').length,
          videos: document.querySelectorAll('video').length,
        },
        documentTitle: document.title,
        finalUrl: location.href,
        navigation:
          navigation && 'domContentLoadedEventEnd' in navigation
            ? {
                domContentLoadedMs: Math.round(navigation.domContentLoadedEventEnd),
                loadEventMs: Math.round(navigation.loadEventEnd),
                responseEndMs: Math.round(navigation.responseEnd),
              }
            : null,
        resourceCount: resources.length,
        scrollHeight: document.documentElement.scrollHeight,
      }
    })
    .catch((error) => ({ evaluationError: error.message }))

  const result = {
    ...testCase,
    startedAt,
    finishedAt: new Date().toISOString(),
    url,
    responseStatus,
    navigationError,
    actionError,
    screenshot: `screenshots/${screenshot}`,
    pageState,
    consoleMessages,
    consoleErrorCount: consoleMessages.filter((message) => message.type === 'error').length,
    pageErrors,
    requestFailures,
    nonSuccessfulResponses: responses.filter((response) => response.status >= 400),
    responseCount: responses.length,
  }

  await context.close()
  return result
}

async function main() {
  await mkdir(screenshotRoot, { recursive: true })
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  })
  const results = []

  try {
    for (const testCase of cases) {
      process.stdout.write(`Capturing ${testCase.id}... `)
      const result = await capture(browser, testCase)
      results.push(result)
      console.log(
        `status=${result.responseStatus} consoleErrors=${result.consoleErrorCount} pageErrors=${result.pageErrors.length} requestFailures=${result.requestFailures.length}`,
      )
    }
  } finally {
    await browser.close()
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    browser: 'Google Chrome via Playwright 1.62.1',
    total: results.length,
    successfulDocuments: results.filter((result) => result.responseStatus === 200).length,
    navigationFailures: results.filter((result) => result.navigationError).length,
    actionFailures: results.filter((result) => result.actionError).length,
    casesWithConsoleErrors: results.filter((result) => result.consoleErrorCount > 0).length,
    casesWithPageErrors: results.filter((result) => result.pageErrors.length > 0).length,
    casesWithRequestFailures: results.filter((result) => result.requestFailures.length > 0).length,
    results,
  }

  await writeFile(outputFile, `${JSON.stringify(summary, null, 2)}\n`)
  console.log(`Browser baseline written to ${outputFile}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
