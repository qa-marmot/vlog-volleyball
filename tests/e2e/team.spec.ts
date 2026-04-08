import { test, expect } from '@playwright/test'
import { testEmail, registerAndLogin } from './helpers'

test.describe('チーム管理', () => {
  test.describe('チーム作成', () => {
    test('チームを作成してチームページに遷移する', async ({ page }) => {
      await registerAndLogin(page, testEmail())
      await page.click('a[href="/teams/new"]')
      await expect(page).toHaveURL(/\/teams\/new/)

      await page.fill('#name', 'テストチームA')
      await page.click('button[type="submit"]')
      // チームページへリダイレクト
      await page.waitForURL(/\/teams\/[^/]+$/)
      await expect(page.locator('header')).toContainText('テストチームA')
    })

    test('チーム名が空のとき送信できない', async ({ page }) => {
      await registerAndLogin(page, testEmail())
      await page.goto('/teams/new')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL(/\/teams\/new/)
    })

    test('作成後のチームページに招待コードが表示される', async ({ page }) => {
      await registerAndLogin(page, testEmail())
      await page.goto('/teams/new')
      await page.fill('#name', 'コードテストチーム')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/teams\/[^/]+$/)
      // 6文字の招待コードが表示されていること
      const codeEl = page.locator('.score-number').first()
      await expect(codeEl).toBeVisible()
      const codeText = await codeEl.textContent()
      expect(codeText?.trim()).toMatch(/^[A-Z2-9]{6}$/)
    })

    test('ダッシュボードに作成したチームが表示される', async ({ page }) => {
      await registerAndLogin(page, testEmail())
      await page.goto('/teams/new')
      await page.fill('#name', 'ダッシュボード確認チーム')
      await page.click('button[type="submit"]')
      await page.goto('/dashboard')
      await expect(page.locator('main')).toContainText('ダッシュボード確認チーム')
    })
  })

  test.describe('招待コードで参加', () => {
    test('無効な招待コードはエラーになる', async ({ page }) => {
      await registerAndLogin(page, testEmail())
      await page.goto('/teams/join')
      await page.fill('#code', 'XXXXXX')
      await page.click('button[type="submit"]')
      await expect(page.locator('#error-msg')).toBeVisible()
    })

    test('招待コードで別ユーザーがチームに参加できる', async ({ page, browser }) => {
      // オーナーがチームを作成
      const ownerEmail = testEmail()
      await registerAndLogin(page, ownerEmail)
      await page.goto('/teams/new')
      await page.fill('#name', '参加テストチーム')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/teams\/[^/]+$/)

      const codeEl = page.locator('.score-number').first()
      const inviteCode = (await codeEl.textContent())?.trim() ?? ''
      expect(inviteCode).toMatch(/^[A-Z2-9]{6}$/)

      // 別ユーザーが参加
      const memberContext = await browser.newContext()
      const memberPage = await memberContext.newPage()
      await registerAndLogin(memberPage, testEmail())
      await memberPage.goto('/teams/join')
      await memberPage.fill('#code', inviteCode)
      await memberPage.click('button[type="submit"]')
      await memberPage.waitForURL(/\/teams\/[^/]+$/)
      await expect(memberPage.locator('header')).toContainText('参加テストチーム')

      await memberContext.close()
    })
  })

  test.describe('選手管理', () => {
    test('選手を追加できる', async ({ page }) => {
      await registerAndLogin(page, testEmail())
      await page.goto('/teams/new')
      await page.fill('#name', '選手テストチーム')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/teams\/[^/]+$/)

      await page.click('a[href$="/players/new"]')
      await expect(page).toHaveURL(/\/players\/new$/)

      await page.fill('#name', '山田 太郎')
      await page.fill('#number', '10')
      await page.selectOption('#position', 'OH')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/teams\/[^/]+$/)
      await expect(page.locator('main')).toContainText('山田 太郎')
    })

    test('リベロのチェックでポジションが L に設定される', async ({ page }) => {
      await registerAndLogin(page, testEmail())
      await page.goto('/teams/new')
      await page.fill('#name', 'リベロテストチーム')
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/teams\/[^/]+$/)

      await page.click('a[href$="/players/new"]')
      await page.fill('#name', '鈴木 花子')
      await page.fill('#number', '1')
      await page.check('#isLibero')
      const posValue = await page.inputValue('#position')
      expect(posValue).toBe('L')
    })

    test('選手を削除できる', async ({ page }) => {
      await registerAndLogin(page, testEmail())
      await page.goto('/teams/new')
      await page.fill('#name', '削除テストチーム')
      await page.click('button[type="submit"]')
      await page.waitForURL(url => {
        const path = new URL(url).pathname
        return path.startsWith('/teams/') && path !== '/teams/new' && !path.includes('/players')
      }, { timeout: 10000 })
      const teamId = new URL(page.url()).pathname.split('/teams/')[1]

      await page.goto(`/teams/${teamId}/players/new`)
      await page.fill('#name', '削除対象選手')
      await page.fill('#number', '99')
      await page.click('button[type="submit"]')
      await page.waitForURL(`**/teams/${teamId}`)
      await expect(page.locator('main')).toContainText('削除対象選手')

      // 削除ボタンの data-player-id を取得してブラウザ内 fetch で削除
      const deleteBtn = page.locator('.delete-player-btn').first()
      const playerId = await deleteBtn.getAttribute('data-player-id')
      const status = await page.evaluate(
        ({ tid, pid }) => fetch(`/api/teams/${tid}/players/${pid}`, { method: 'DELETE' }).then(r => r.status),
        { tid: teamId, pid: playerId }
      )
      expect(status).toBe(200)
      await page.reload()
      await expect(page.locator('main')).not.toContainText('削除対象選手')
    })
  })
})
