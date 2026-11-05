import { expect, test, type Page } from '@playwright/test'

// Each test gets a fresh browser context, so a fresh anonymous household.

async function createPlayer(page: Page, name: string, avatarIndex = 0) {
  await page.getByTestId('new-player').click()
  await page.getByTestId('nickname-input').fill(name)
  await page.getByRole('radio').nth(avatarIndex).check({ force: true })
  await page.getByTestId('profile-submit').click()
  await expect(page.getByRole('button', { name: `Spelen als ${name}` })).toBeVisible()
}

test('create, choose, refresh, remove: the manual 0.1 scenario', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wie speelt er?' })).toBeVisible()

  await createPlayer(page, 'Testkind A', 0)
  await createPlayer(page, 'Testkind B', 3)

  await page.getByRole('button', { name: 'Spelen als Testkind A' }).click()
  await expect(page).toHaveURL(/\/start$/)
  await expect(page.getByRole('heading', { name: 'Hoi Testkind A!' })).toBeVisible()
  await expect(page.getByTestId('no-businesses')).toBeVisible()
  await expect(page.getByText(/binnenkort/i)).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hoi Testkind A!' })).toBeVisible()

  // Back to the list and remove B, with confirmation.
  await page.getByRole('button', { name: 'Andere speler' }).click()
  await page.getByTestId('manage-toggle').click()
  await page.getByTestId('remove-Testkind B').click()
  await expect(page.getByRole('dialog')).toContainText('Dit kun je niet terugdraaien')
  await page.getByTestId('remove-confirm').click()
  await expect(page.getByTestId('profile-card')).toHaveCount(1)
  await page.reload()
  await expect(page.getByTestId('profile-card')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Spelen als Testkind A' })).toBeVisible()
})

test('another household does not see the profiles', async ({ page, browser }) => {
  await page.goto('/')
  await createPlayer(page, 'Alleen hier')
  const other = await browser.newContext()
  const p2 = await other.newPage()
  await p2.goto('/')
  await expect(p2.getByText('Maak eerst een speler aan.')).toBeVisible()
  await expect(p2.getByTestId('profile-card')).toHaveCount(0)
  await other.close()
})

test('a too long nickname shows a message and saves nothing', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('new-player').click()
  await page.getByTestId('nickname-input').fill('a'.repeat(25))
  await page.getByTestId('profile-submit').click()
  await expect(page.getByTestId('form-error')).toHaveText('Een bijnaam heeft 1 tot 20 tekens.')
  await page.getByRole('button', { name: 'Annuleren' }).click()
  await expect(page.getByTestId('profile-card')).toHaveCount(0)
})

test('the same nickname twice is refused', async ({ page }) => {
  await page.goto('/')
  await createPlayer(page, 'Sam')
  await page.getByTestId('new-player').click()
  await page.getByTestId('nickname-input').fill('sam')
  await page.getByTestId('profile-submit').click()
  await expect(page.getByTestId('form-error')).toContainText('bestaat al')
})

test('rename keeps the player and shows the new name', async ({ page }) => {
  await page.goto('/')
  await createPlayer(page, 'Noor')
  await page.getByTestId('manage-toggle').click()
  await page.getByRole('button', { name: 'Aanpassen' }).click()
  await page.getByTestId('nickname-input').fill('Noortje')
  await page.getByTestId('profile-submit').click()
  await page.getByTestId('manage-toggle').click()
  await expect(page.getByRole('button', { name: 'Spelen als Noortje' })).toBeVisible()
})

test('settings: big text and reduced motion persist on this device', async ({ page }) => {
  await page.goto('/instellingen')
  await page.getByText('Grote tekst').click()
  await page.getByText('Minder beweging').click()
  await expect(page.locator('html')).toHaveClass(/big-text/)
  await expect(page.locator('html')).toHaveClass(/reduce-motion/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/big-text/)
  await expect(page.getByTestId('setting-bigText')).toBeChecked()
})

test('diagnose shows matching versions and the test database', async ({ page }) => {
  await page.goto('/diagnose')
  await expect(page.getByText('Pagina en server passen bij elkaar.')).toBeVisible()
  await expect(page.getByTestId('diag-Database')).toHaveText('maakrijk_test')
  await expect(page.getByTestId('build-mismatch')).toHaveCount(0)
})

test('a contract mismatch shows the banner', async ({ page }) => {
  await page.route('**/api/version', async (route) => {
    const res = await route.fetch()
    const body = await res.json()
    await route.fulfill({ response: res, json: { ...body, contract: body.contract + 1 } })
  })
  await page.goto('/')
  await expect(page.getByTestId('build-mismatch')).toContainText('De server is nieuwer')
})
