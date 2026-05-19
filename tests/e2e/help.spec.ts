import { test, expect } from '@playwright/test'

test.describe('ヘルプページ', () => {
  test('認証なしでアクセスできる', async ({ page }) => {
    await page.goto('/help')
    await expect(page).toHaveTitle(/V-Log/)
    await expect(page.locator('h1')).toContainText('V-Log の使い方')
  })

  test('5つのステップが表示される', async ({ page }) => {
    await page.goto('/help')
    // 番号付きステップ（1〜5）
    for (let i = 1; i <= 5; i++) {
      await expect(
        page.locator('.card').filter({ hasText: `${i}` }).first()
      ).toBeVisible()
    }
  })

  test('FAQ アコーディオンが展開できる', async ({ page }) => {
    await page.goto('/help')
    const first = page.locator('details').first()
    await first.click()
    await expect(first).toHaveAttribute('open', '')
  })

  test('ヘッダーに V-Log ロゴが表示される', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('header')).toContainText('V-Log')
  })

  test('「始める」ボタンが /register にリンクしている', async ({ page }) => {
    await page.goto('/help')
    const link = page.getByRole('link', { name: '始める' }).first()
    await expect(link).toHaveAttribute('href', '/register')
  })

  test('ログインリンクが /login にリンクしている', async ({ page }) => {
    await page.goto('/help')
    const loginLink = page.locator('header').getByRole('link', { name: 'ログイン' })
    await expect(loginLink).toHaveAttribute('href', '/login')
  })

  test('作戦ボードガイドへ移動できる', async ({ page }) => {
    await page.goto('/help')
    const guideLink = page.getByRole('link', { name: '作戦ボードガイド' })
    await expect(guideLink).toHaveAttribute('href', '/help/strategy-board')
    await guideLink.click()
    await expect(page).toHaveURL(/\/help\/strategy-board$/)
    await expect(page.locator('h1')).toContainText('ローテーション作戦ボードの使い方')
  })

  test('作戦ボードガイドの主要セクションが表示される', async ({ page }) => {
    await page.goto('/help/strategy-board')
    await expect(page.locator('body')).toContainText('1プラン = 1セット')
    await expect(page.locator('body')).toContainText('共有範囲の選び方')
    await expect(page.locator('body')).toContainText('よくあるミス')
  })
})
