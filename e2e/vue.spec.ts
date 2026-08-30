import { expect, test } from '@playwright/test'

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
})

test('renders an explicit not-found route', async ({ page }) => {
  await page.goto('/not-yet-migrated')
  await expect(page.getByRole('heading', { name: '这个页面还没有迁移。' })).toBeVisible()
  await expect(page.getByRole('link', { name: '返回迁移概览' })).toHaveAttribute('href', '/')
})
