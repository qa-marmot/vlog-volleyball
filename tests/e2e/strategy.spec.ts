import { test, expect, type Page } from '@playwright/test'
import { testEmail, registerAndLogin } from './helpers'

async function createTeamWithSixPlayers(page: Page) {
  await registerAndLogin(page, testEmail())
  await page.goto('/teams/new')
  await page.fill('#name', '作戦E2Eチーム')
  await page.click('button[type="submit"]')
  await page.waitForURL(url => {
    const path = new URL(url).pathname
    return path.startsWith('/teams/') && path !== '/teams/new' && !path.includes('/players')
  }, { timeout: 10000 })
  const teamId = new URL(page.url()).pathname.split('/teams/')[1]

  for (let i = 0; i < 6; i++) {
    await page.goto(`/teams/${teamId}/players/new`)
    await page.fill('#name', `選手${i + 1}`)
    await page.fill('#number', String(i + 1))
    await page.click('button[type="submit"]')
    await page.waitForURL(`**/teams/${teamId}`)
  }

  return { teamId }
}

async function createDraftStrategyPlan(page: Page, teamId: string) {
  await page.goto(`/teams/${teamId}/strategy`)
  await page.fill('#strategy-name', 'E2E作戦プラン')
  const selects = page.locator('.base-rotation-select')
  for (let i = 0; i < 6; i++) {
    await selects.nth(i).selectOption({ index: i + 1 })
  }
  await page.click('#strategy-create-form button[type="submit"]')
  await page.waitForURL(new RegExp(`/teams/${teamId}/strategy/[^/]+$`), { timeout: 10000 })
  return new URL(page.url()).pathname.split('/').pop() ?? ''
}

test.describe('作戦ボード', () => {
  test('ownerがドラフト作戦プランを作成できる', async ({ page }) => {
    const { teamId } = await createTeamWithSixPlayers(page)
    await createDraftStrategyPlan(page, teamId)

    await expect(page.locator('header')).toContainText('E2E作戦プラン')
    await expect(page.locator('#plan-status')).toHaveValue('draft')
  })

  test('memberは作戦作成フォームが表示されず閲覧専用になる', async ({ page, browser }) => {
    const { teamId } = await createTeamWithSixPlayers(page)
    const inviteCode = (await page.locator('.score-number').first().textContent())?.trim() ?? ''
    expect(inviteCode).toMatch(/^[A-Z2-9]{6}$/)

    const memberContext = await browser.newContext()
    const memberPage = await memberContext.newPage()
    await registerAndLogin(memberPage, testEmail())
    await memberPage.goto('/teams/join')
    await memberPage.fill('#code', inviteCode)
    await memberPage.click('button[type="submit"]')
    await memberPage.waitForURL(`**/teams/${teamId}`)

    await memberPage.goto(`/teams/${teamId}/strategy`)
    await expect(memberPage.locator('#strategy-create-form')).toHaveCount(0)
    await expect(memberPage.locator('main')).toContainText('閲覧専用')

    await memberContext.close()
  })

  test('印刷表示の用途別モードを開ける', async ({ page }) => {
    const { teamId } = await createTeamWithSixPlayers(page)
    const planId = await createDraftStrategyPlan(page, teamId)

    await page.goto(`/teams/${teamId}/strategy/${planId}/print?mode=coach`)
    await expect(page.locator('main')).toContainText('表示: coach')
    await page.goto(`/teams/${teamId}/strategy/${planId}/print?mode=player`)
    await expect(page.locator('main')).toContainText('表示: player')
    await page.goto(`/teams/${teamId}/strategy/${planId}/print?mode=cards`)
    await expect(page.locator('main')).toContainText('表示: cards')
  })
})
