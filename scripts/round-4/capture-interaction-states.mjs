import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const screenshotRoot = resolve(root, 'docs/round-4/screenshots')
const outputFile = resolve(root, 'docs/round-4/generated/interaction-browser-states.json')
const baseUrl = process.env.ROUND4_BASE_URL || 'http://127.0.0.1:4173'
const auth = { user: { id: 'e2e-user', displayName: 'E2E 用户' }, accessToken: 'token' }
const item = {
  id: 'feed-e2e',
  author: { userId: 'a', displayName: 'E2E 作者', handle: 'author' },
  caption: 'E2E 推荐内容',
  coverUrl: '/feed/covers/field.jpg',
  durationSeconds: 42,
  likeCount: 1000,
  commentCount: 1,
  shareCount: 10,
  publishedAt: '2026-08-31T01:00:00Z',
  tags: ['E2E'],
}
const media = {
  src: '/feed/media/field-demo.mp4',
  mimeType: 'video/mp4',
  posterUrl: '/feed/covers/field.jpg',
  durationSeconds: 4,
}
const comment = (id = 'comment-1', body = '稳定评论状态') => ({
  id,
  feedId: 'feed-e2e',
  author: { userId: 'reader', displayName: '评论读者' },
  body,
  createdAt: '2026-08-31T03:00:00Z',
  likeCount: 2,
  likedByViewer: false,
  version: 1,
})

async function signIn(page) {
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({ body: JSON.stringify(auth), contentType: 'application/json' }),
  )
  await page.goto(
    `${baseUrl}/login/password?redirect=${encodeURIComponent('/home/content/feed-e2e')}`,
  )
  await page.getByRole('textbox', { name: '手机号', exact: true }).fill('13800138000')
  await page.locator('input[name="password"]').fill('douyin-demo')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: '登录' }).click()
}

async function main() {
  await mkdir(screenshotRoot, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const results = []
  async function capture(id, authenticated, configure, interact, verify) {
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
      route.fulfill({ body: JSON.stringify({ item, media }), contentType: 'application/json' }),
    )
    await page.route('**/api/feed/feed-e2e/comments**', (route) =>
      route.fulfill({
        body: JSON.stringify({ comments: [comment()], nextCursor: null }),
        contentType: 'application/json',
      }),
    )
    await configure(page)
    if (authenticated) await signIn(page)
    else await page.goto(`${baseUrl}/home/content/feed-e2e`)
    await page.getByRole('heading', { name: '点赞与评论' }).waitFor()
    await interact(page)
    await verify(page)
    await page.waitForTimeout(120)
    if (await page.locator('.feed-interactions').count()) {
      await page.locator('.feed-interactions').scrollIntoViewIfNeeded()
    }
    await page.evaluate(() => window.scrollTo({ top: 0 }))
    const screenshot = `${id}.png`
    await page.screenshot({ path: resolve(screenshotRoot, screenshot), fullPage: true })
    results.push({ id, finalUrl: page.url(), pageErrors, screenshot: `screenshots/${screenshot}` })
    await context.close()
  }
  try {
    await capture(
      'interaction-comments',
      false,
      async () => undefined,
      async () => undefined,
      (p) => p.getByText('稳定评论状态').waitFor(),
    )
    await capture(
      'interaction-liked',
      true,
      (p) =>
        p.route('**/api/feed/feed-e2e/like', (r) =>
          r.fulfill({
            body: JSON.stringify({ feedId: 'feed-e2e', liked: true, likeCount: 1001, version: 2 }),
            contentType: 'application/json',
          }),
        ),
      (p) => p.getByRole('button', { name: /喜欢/ }).click(),
      (p) => p.getByRole('button', { name: /取消喜欢/ }).waitFor(),
    )
    await capture(
      'interaction-like-conflict',
      true,
      (p) =>
        p.route('**/api/feed/feed-e2e/like', (r) =>
          r.fulfill({ body: '{}', contentType: 'application/json', status: 409 }),
        ),
      (p) => p.getByRole('button', { name: /喜欢/ }).click(),
      (p) =>
        p
          .getByRole('alert')
          .getByText(/内容状态已更新/)
          .waitFor(),
    )
    await capture(
      'interaction-comment-pending',
      true,
      (p) =>
        p.route('**/api/feed/feed-e2e/comments', async (r) => {
          if (r.request().method() === 'GET') return r.fallback()
          await new Promise((done) => setTimeout(done, 1200))
          return r.fulfill({
            body: JSON.stringify(comment('created', '正在确认的评论')),
            contentType: 'application/json',
          })
        }),
      async (p) => {
        await p.getByLabel('发表评论').fill('正在确认的评论')
        await p.getByRole('button', { name: '发表评论' }).click()
      },
      (p) => p.getByText('正在发送…').waitFor(),
    )
    await capture(
      'interaction-comment-success',
      true,
      (p) =>
        p.route('**/api/feed/feed-e2e/comments', (r) =>
          r.request().method() === 'GET'
            ? r.fallback()
            : r.fulfill({
                body: JSON.stringify(comment('created', '确认后的评论')),
                contentType: 'application/json',
              }),
        ),
      async (p) => {
        await p.getByLabel('发表评论').fill('确认后的评论')
        await p.getByRole('button', { name: '发表评论' }).click()
      },
      (p) => p.getByText('确认后的评论').waitFor(),
    )
    await capture(
      'interaction-rate-limit',
      true,
      (p) =>
        p.route('**/api/feed/feed-e2e/comments', (r) =>
          r.request().method() === 'GET'
            ? r.fallback()
            : r.fulfill({ body: '{}', contentType: 'application/json', status: 429 }),
        ),
      async (p) => {
        await p.getByLabel('发表评论').fill('保留草稿')
        await p.getByRole('button', { name: '发表评论' }).click()
      },
      (p) =>
        p
          .getByRole('alert')
          .getByText(/操作过于频繁/)
          .waitFor(),
    )
    await capture(
      'interaction-comments-503',
      false,
      (p) =>
        p.route('**/api/feed/feed-e2e/comments**', (r) =>
          r.fulfill({ body: '{}', contentType: 'application/json', status: 503 }),
        ),
      async () => undefined,
      (p) => p.getByRole('alert').getByText(/503/).waitFor(),
    )
    await capture(
      'interaction-login-required',
      false,
      async () => undefined,
      (p) => p.getByRole('button', { name: /喜欢/ }).click(),
      (p) => p.getByRole('heading', { name: '手机号密码登录' }).waitFor(),
    )
  } finally {
    await browser.close()
  }
  if (results.some((result) => result.pageErrors.length))
    throw new Error('Interaction visual capture encountered page errors')
  await writeFile(
    outputFile,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2)}\n`,
  )
  console.log(`Captured ${results.length} interaction states`)
}

await main()
