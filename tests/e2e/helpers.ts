import type { Page } from '@playwright/test'

/** ランダムなテスト用メールアドレスを生成 */
export function testEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`
}

export const TEST_PASSWORD = 'password123'

/** 新規登録してダッシュボードへ遷移する */
export async function registerAndLogin(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto('/register')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.fill('#confirm', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
}

/** 既存ユーザーでログインしてダッシュボードへ遷移する */
export async function login(page: Page, email: string, password = TEST_PASSWORD) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard')
}
