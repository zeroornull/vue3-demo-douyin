import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(scriptDirectory, '../..')
const screenshotRoot = resolve(root, 'docs/round-4/screenshots')
const outputFile = resolve(root, 'docs/round-4/generated/feed-browser-states.json')
const baseUrl = process.env.ROUND4_BASE_URL || 'http://127.0.0.1:4173'

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
      'feed-list',
      async (page) => {
        await page.route('**/api/feed**', (route) =>
          route.fulfill({
            body: JSON.stringify({
              items: [
                feedPayload(),
                feedPayload('feed-alley', '巷子里的光', '/feed/covers/alley.jpg'),
              ],
              nextCursor: null,
            }),
            contentType: 'application/json',
          }),
        )
        await page.goto(`${baseUrl}/home`)
      },
      (page) => page.getByRole('link', { name: 'E2E 推荐内容', exact: true }).waitFor(),
    )
    await capture(
      'feed-refreshed',
      async (page) => {
        let calls = 0
        await page.route('**/api/feed**', (route) => {
          calls += 1
          return route.fulfill({
            body: JSON.stringify({
              items: [
                calls === 1 ? feedPayload() : feedPayload('feed-refreshed', '刷新后的推荐内容'),
              ],
              nextCursor: null,
            }),
            contentType: 'application/json',
          })
        })
        await page.goto(`${baseUrl}/home`)
        await page.getByRole('button', { name: '刷新推荐' }).click()
      },
      (page) => page.getByRole('link', { name: '刷新后的推荐内容', exact: true }).waitFor(),
    )
    await capture(
      'feed-empty',
      async (page) => {
        await page.route('**/api/feed**', (route) =>
          route.fulfill({
            body: JSON.stringify({ items: [], nextCursor: null }),
            contentType: 'application/json',
          }),
        )
        await page.goto(`${baseUrl}/home`)
      },
      (page) => page.getByRole('heading', { name: '暂时没有推荐内容' }).waitFor(),
    )
    await capture(
      'feed-503',
      async (page) => {
        await page.route('**/api/feed**', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
        )
        await page.goto(`${baseUrl}/home`)
      },
      (page) => page.getByRole('alert').getByText('HTTP 请求失败（503）。').waitFor(),
    )
    await capture(
      'feed-parse-error',
      async (page) => {
        await page.route('**/api/feed**', (route) =>
          route.fulfill({
            body: JSON.stringify({
              items: [feedPayload('feed-external', '外部封面', 'https://example.test/cover.jpg')],
              nextCursor: null,
            }),
            contentType: 'application/json',
          }),
        )
        await page.goto(`${baseUrl}/home`)
      },
      (page) => page.getByRole('alert').getByText('Feed page 字段无效。').waitFor(),
    )
    await capture(
      'feed-search-landing',
      (page) => page.goto(`${baseUrl}/home/search`),
      (page) => page.getByRole('heading', { name: '从一个明确关键词开始' }).waitFor(),
    )
    await capture(
      'feed-search-results',
      async (page) => {
        await page.route('**/api/feed/search**', (route) =>
          route.fulfill({
            body: JSON.stringify({
              items: [feedPayload('feed-vue', 'Vue 搜索结果')],
              nextCursor: null,
            }),
            contentType: 'application/json',
          }),
        )
        await page.goto(`${baseUrl}/home/search?q=Vue`)
      },
      (page) => page.getByRole('link', { name: 'Vue 搜索结果', exact: true }).waitFor(),
    )
    await capture(
      'feed-search-empty',
      async (page) => {
        await page.route('**/api/feed/search**', (route) =>
          route.fulfill({
            body: JSON.stringify({ items: [], nextCursor: null }),
            contentType: 'application/json',
          }),
        )
        await page.goto(`${baseUrl}/home/search?q=不存在`)
      },
      (page) => page.getByRole('heading', { name: '没有找到“不存在”' }).waitFor(),
    )
    await capture(
      'feed-detail',
      async (page) => {
        await page.route('**/api/feed/feed-e2e', (route) =>
          route.fulfill({
            body: JSON.stringify({ item: feedPayload(), media: mediaSourceResponse }),
            contentType: 'application/json',
          }),
        )
        await page.goto(`${baseUrl}/home/content/feed-e2e`)
      },
      (page) => page.getByRole('heading', { name: '播放器只接受用户操作' }).waitFor(),
    )
    await capture(
      'feed-not-found',
      async (page) => {
        await page.route('**/api/feed/feed-missing', (route) =>
          route.fulfill({ body: '{}', contentType: 'application/json', status: 404 }),
        )
        await page.goto(`${baseUrl}/home/content/feed-missing`)
      },
      (page) => page.getByRole('alert').getByText('内容不存在。').waitFor(),
    )
    await capture(
      'feed-invalid-id',
      (page) => page.goto(`${baseUrl}/home/content/bad.id`),
      (page) => page.getByRole('alert').getByText('内容地址无效。').waitFor(),
    )
  } finally {
    await browser.close()
  }

  if (results.some((result) => result.pageErrors.length)) {
    throw new Error('Feed visual capture encountered page errors')
  }
  await writeFile(
    outputFile,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`,
  )
  console.log(`Captured ${results.length} feed states`)
}

await main()
