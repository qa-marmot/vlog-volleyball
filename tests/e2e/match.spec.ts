import { test, expect } from '@playwright/test'
import { testEmail, registerAndLogin } from './helpers'

async function setupTeamWithPlayers(page: any) {
  await registerAndLogin(page, testEmail())

  // チーム作成
  await page.goto('/teams/new')
  await page.fill('#name', '試合テストチーム')
  await page.click('button[type="submit"]')
  // /teams/new ではなく UUID のページに遷移するまで待つ
  await page.waitForURL(url => {
    const path = new URL(url).pathname
    return path.startsWith('/teams/') && path !== '/teams/new' && !path.includes('/players')
  }, { timeout: 10000 })
  const teamUrl = page.url()
  const teamId = new URL(teamUrl).pathname.split('/teams/')[1]

  // 選手 6 人追加
  const players = ['田中', '鈴木', '佐藤', '伊藤', '渡辺', '高橋']
  for (let i = 0; i < players.length; i++) {
    await page.goto(`/teams/${teamId}/players/new`)
    await page.fill('#name', players[i])
    await page.fill('#number', String(i + 1))
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/teams\/[^/]+$/)
  }

  return { teamId }
}

test.describe('試合作成', () => {
  test('試合情報を入力して記録画面に遷移する', async ({ page }) => {
    const { teamId } = await setupTeamWithPlayers(page)

    await page.goto(`/matches/new?teamId=${teamId}`)
    await page.fill('#opponentName', 'ライバルチーム')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/matches\/[^/]+\/record$/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/record$/)
  })

  test('相手チーム名が空のとき送信できない', async ({ page }) => {
    const { teamId } = await setupTeamWithPlayers(page)
    await page.goto(`/matches/new?teamId=${teamId}`)
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/matches\/new/)
  })

  test('試合日がデフォルトで今日の日付', async ({ page }) => {
    const { teamId } = await setupTeamWithPlayers(page)
    await page.goto(`/matches/new?teamId=${teamId}`)
    const today = new Date().toISOString().slice(0, 10)
    const value = await page.inputValue('#matchDate')
    expect(value).toBe(today)
  })
})

test.describe('試合記録', () => {
  test('記録画面が表示される', async ({ page }) => {
    const { teamId } = await setupTeamWithPlayers(page)
    await page.goto(`/matches/new?teamId=${teamId}`)
    await page.fill('#opponentName', '記録テスト相手')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/record$/, { timeout: 10000 })
    // ヘッダーに対戦相手が表示される
    await expect(page.locator('header')).toContainText('記録テスト相手')
  })
})

test.describe('試合結果', () => {
  test('試合作成後に結果ページへアクセスできる', async ({ page }) => {
    const { teamId } = await setupTeamWithPlayers(page)

    // 試合作成
    await page.goto(`/matches/new?teamId=${teamId}`)
    await page.fill('#opponentName', '結果テスト相手')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/record$/, { timeout: 10000 })

    // record URL から matchId を取得して result に直接アクセス
    const recordUrl = page.url()
    const resultUrl = recordUrl.replace('/record', '/result')
    await page.goto(resultUrl)
    await expect(page.locator('header')).toContainText('結果テスト相手')
  })
})

test.describe('ダッシュボード 試合一覧', () => {
  test('作成した試合が試合履歴に表示される', async ({ page }) => {
    const { teamId } = await setupTeamWithPlayers(page)

    await page.goto(`/matches/new?teamId=${teamId}`)
    await page.fill('#opponentName', '一覧確認チーム')
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/record$/, { timeout: 10000 })

    await page.goto('/dashboard')
    await expect(page.locator('main')).toContainText('一覧確認チーム')
  })
})
