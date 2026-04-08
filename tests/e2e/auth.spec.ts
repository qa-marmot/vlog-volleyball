import { test, expect } from '@playwright/test'
import { testEmail, TEST_PASSWORD, registerAndLogin } from './helpers'

test.describe('認証フロー', () => {
  test.describe('ログインページ', () => {
    test('ページが表示される', async ({ page }) => {
      await page.goto('/login')
      await expect(page.locator('h1')).toContainText('ログイン')
    })

    test('未認証でダッシュボードにアクセスすると /login にリダイレクト', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/login/)
    })

    test('メールアドレスが空のとき送信できない', async ({ page }) => {
      await page.goto('/login')
      await page.fill('#password', TEST_PASSWORD)
      await page.click('button[type="submit"]')
      // ブラウザのバリデーションによりフォームが送信されない
      await expect(page).toHaveURL(/\/login/)
    })

    test('存在しないアカウントでログインするとエラー', async ({ page }) => {
      await page.goto('/login')
      await page.fill('#email', 'nonexistent@example.com')
      await page.fill('#password', 'wrongpassword')
      await page.click('button[type="submit"]')
      await expect(page.locator('#error-msg')).toBeVisible()
      await expect(page.locator('#error-msg')).toContainText('パスワード')
    })

    test('登録済みアカウントでログインできる', async ({ page }) => {
      const email = testEmail()
      // 先に登録
      await registerAndLogin(page, email)
      // ログアウト
      await page.click('button#logout-btn')
      await page.waitForURL('**/login')
      // 再ログイン
      await page.fill('#email', email)
      await page.fill('#password', TEST_PASSWORD)
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL(/\/dashboard/)
    })
  })

  test.describe('新規登録', () => {
    test('ページが表示される', async ({ page }) => {
      await page.goto('/register')
      await expect(page.locator('h1')).toContainText('アカウント作成')
    })

    test('新規ユーザーを登録してダッシュボードへ遷移する', async ({ page }) => {
      const email = testEmail()
      await registerAndLogin(page, email)
      await expect(page).toHaveURL(/\/dashboard/)
    })

    test('パスワードが一致しないとエラー', async ({ page }) => {
      await page.goto('/register')
      await page.fill('#email', testEmail())
      await page.fill('#password', TEST_PASSWORD)
      await page.fill('#confirm', 'different-password')
      await page.click('button[type="submit"]')
      await expect(page.locator('#error-msg')).toContainText('一致しません')
    })

    test('パスワードが 8 文字未満のとエラー', async ({ page }) => {
      await page.goto('/register')
      await page.fill('#email', testEmail())
      await page.fill('#password', 'short')
      await page.fill('#confirm', 'short')
      await page.click('button[type="submit"]')
      await expect(page.locator('#error-msg')).toContainText('8文字以上')
    })

    test('同じメールアドレスで二重登録するとエラー', async ({ page }) => {
      const email = testEmail()
      await registerAndLogin(page, email)
      await page.click('button#logout-btn')
      await page.waitForURL('**/login')
      await page.goto('/register')
      await page.fill('#email', email)
      await page.fill('#password', TEST_PASSWORD)
      await page.fill('#confirm', TEST_PASSWORD)
      await page.click('button[type="submit"]')
      await expect(page.locator('#error-msg')).toBeVisible()
    })
  })

  test.describe('ログアウト', () => {
    test('ログアウトすると /login にリダイレクト', async ({ page }) => {
      const email = testEmail()
      await registerAndLogin(page, email)
      await page.click('button#logout-btn')
      await expect(page).toHaveURL(/\/login/)
    })

    test('ログアウト後にダッシュボードへアクセスすると /login', async ({ page }) => {
      const email = testEmail()
      await registerAndLogin(page, email)
      await page.click('button#logout-btn')
      await page.waitForURL('**/login')  // ログアウト完了を待つ
      await page.goto('/dashboard')
      await expect(page).toHaveURL(/\/login/)
    })
  })
})
