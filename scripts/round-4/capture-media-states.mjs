import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(scriptDirectory, '../..')
const screenshotRoot = resolve(root, 'docs/round-4/screenshots')
const outputFile = resolve(root, 'docs/round-4/generated/media-browser-states.json')
const baseUrl = process.env.ROUND4_BASE_URL || 'http://127.0.0.1:4173'

const item = {
  id: 'feed-e2e',
  author: { userId: 'author-e2e', displayName: 'E2E 作者', handle: 'e2e_author' },
  caption: 'E2E 推荐内容',
  coverUrl: '/feed/covers/field.jpg',
  durationSeconds: 42,
  likeCount: 1000,
  commentCount: 20,
  shareCount: 10,
  publishedAt: '2026-08-31T01:00:00.000Z',
  tags: ['E2E', '迁移'],
}
const media = {
  src: '/feed/media/field-demo.mp4',
  mimeType: 'video/mp4',
  posterUrl: '/feed/covers/field.jpg',
  durationSeconds: 4,
}

async function main() {
  await mkdir(screenshotRoot, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const results = []

  async function capture(id, source, interact, verify) {
    const context = await browser.newContext({
      colorScheme: 'dark',
      locale: 'zh-CN',
      reducedMotion: 'reduce',
      viewport: { width: 390, height: 844 },
    })
    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.route('**/api/feed/feed-e2e', (route) =>
      route.fulfill({
        body: JSON.stringify({ item, media: source }),
        contentType: 'application/json',
      }),
    )
    await page.goto(`${baseUrl}/home/content/feed-e2e`)
    await page.getByRole('heading', { name: 'E2E 推荐内容' }).waitFor()
    await page.getByTestId('playback-status').waitFor()
    await interact(page)
    await verify(page)
    await page.waitForTimeout(150)
    await page.evaluate(() => window.scrollTo({ top: 0 }))
    const screenshot = `${id}.png`
    await page.screenshot({ path: resolve(screenshotRoot, screenshot), fullPage: true })
    results.push({ id, finalUrl: page.url(), pageErrors, screenshot: `screenshots/${screenshot}` })
    await context.close()
  }

  try {
    await capture(
      'media-paused',
      media,
      async () => undefined,
      (page) => page.getByTestId('playback-status').filter({ hasText: '已暂停' }).waitFor(),
    )
    await capture(
      'media-playing',
      media,
      (page) => page.getByRole('button', { name: '播放', exact: true }).click(),
      (page) => page.getByTestId('playback-status').filter({ hasText: '播放中' }).waitFor(),
    )
    await capture(
      'media-unmuted',
      media,
      (page) => page.getByRole('button', { name: '取消静音', exact: true }).click(),
      (page) => page.getByRole('button', { name: '静音', exact: true }).waitFor(),
    )
    await capture(
      'media-ended',
      media,
      async (page) => {
        await page.getByRole('button', { name: '播放', exact: true }).click()
        await page.getByTestId('media-element').evaluate((element) => {
          if (element instanceof HTMLVideoElement) {
            element.currentTime = Math.max(0, element.duration - 0.15)
          }
        })
      },
      (page) => page.getByTestId('playback-status').filter({ hasText: '播放结束' }).waitFor(),
    )
    await capture(
      'media-error',
      { ...media, src: '/feed/media/missing.mp4' },
      async () => undefined,
      (page) =>
        page
          .getByRole('alert')
          .getByText(/媒体加载失败/)
          .waitFor(),
    )
  } finally {
    await browser.close()
  }

  if (results.some((result) => result.pageErrors.length)) {
    throw new Error('Media visual capture encountered page errors')
  }
  await writeFile(
    outputFile,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`,
  )
  console.log(`Captured ${results.length} media states`)
}

await main()
