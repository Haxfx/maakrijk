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
  await expect(page.getByTestId('card-lemonade')).toBeVisible()
  await expect(page.getByText(/binnenkort/i)).toHaveCount(0)

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Hoi Testkind A!' })).toBeVisible()

  // Back to the list and remove B, with confirmation.
  await page.getByRole('button', { name: 'Wissel' }).click()
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

test('the name field stops at 20 letters; an empty name shows a message', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('new-player').click()
  await page.getByTestId('nickname-input').fill('a'.repeat(25))
  await expect(page.getByTestId('nickname-input')).toHaveValue('a'.repeat(20))
  await page.getByTestId('nickname-input').fill('   ')
  await page.getByTestId('profile-submit').click()
  await expect(page.getByTestId('form-error')).toHaveText('Een bijnaam heeft 1 tot 20 letters.')
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

// RC1 F1: the gear was an inert element. Use the real header button, by mouse and keyboard.
test('the gear opens settings from both screens', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Instellingen' }).click()
  await expect(page).toHaveURL(/\/instellingen$/)
  await page.getByRole('button', { name: 'Klaar' }).click()
  await expect(page).toHaveURL(/\/$/)

  await createPlayer(page, 'Luca')
  await page.getByRole('button', { name: 'Spelen als Luca' }).click()
  await expect(page.getByRole('heading', { name: 'Hoi Luca!' })).toBeVisible()
  await page.getByRole('link', { name: 'Instellingen' }).focus()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/instellingen$/)
  await page.getByRole('button', { name: 'Klaar' }).click()
  await expect(page).toHaveURL(/\/start$/)
})

// RC1 F2: opened directly, "Klaar" must stay inside the app.
test('settings opened directly: Klaar goes to the start', async ({ page }) => {
  await page.goto('/instellingen')
  await page.getByRole('button', { name: 'Klaar' }).click()
  await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/)
  await expect(page.getByRole('heading', { name: 'Wie speelt er?' })).toBeVisible()
})

// RC1 F8: another tab filled the last place; the refused tab shows the real list.
test('a refused 9th player refreshes the list', async ({ page, context }) => {
  await page.goto('/')
  for (let i = 1; i <= 7; i++) await createPlayer(page, `Kind ${i}`)
  const other = await context.newPage()
  await other.goto('/')
  await createPlayer(other, 'Kind 8')
  await page.getByTestId('new-player').click()
  await page.getByTestId('nickname-input').fill('Kind 9')
  await page.getByTestId('profile-submit').click()
  await expect(page.getByTestId('form-error')).toContainText('Er zijn al 8 spelers')
  await page.getByRole('button', { name: 'Annuleren' }).click()
  await expect(page.getByTestId('profile-card')).toHaveCount(8)
  await expect(page.getByTestId('new-player')).toHaveCount(0)
})
