import { expect, test, type Page } from '@playwright/test'

// The lemonade clicker through the real UI, against Rust + Postgres.
// The server clock runs in real time.

async function startLemonade(page: Page, name = 'Limo') {
  await page.goto('/')
  await page.getByTestId('new-player').click()
  await page.getByTestId('nickname-input').fill(name)
  await page.getByRole('radio').first().check({ force: true })
  await page.getByTestId('profile-submit').click()
  await page.getByRole('button', { name: `Spelen als ${name}` }).click()
  await page.getByTestId('card-lemonade').getByRole('button', { name: 'Spelen' }).click()
  await expect(page).toHaveURL(/\/limonade\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId('goal')).toContainText('Tik op de pers')
}

const coins = (page: Page) => page.getByTestId('coins')
const spot = (page: Page, id: string) => page.getByTestId(`spot-${id}`)
const press = (page: Page) => spot(page, 'press')

/** Tap the press `n` times, quickly. */
async function tapPress(page: Page, n: number) {
  for (let i = 0; i < n; i++) await press(page).click({ delay: 0 })
}

/** Wait until the server has answered every tap (coins stop changing). */
async function settled(page: Page) {
  await page.waitForTimeout(500)
  await page.waitForLoadState('networkidle')
}

test('tap the press to sell lemonade; coins count at once and the server agrees', async ({ page }) => {
  await startLemonade(page)
  await expect(coins(page)).toHaveText('12 munten')
  await expect(page.getByRole('img', { name: 'Spelwereld' })).toBeVisible()
  await expect(press(page)).toHaveAccessibleName('Pers limonade: 1 beker, 2 munten')
  await expect(press(page).locator('.hint-ring')).toHaveCount(1)

  await press(page).click()
  // +2 for the cup, -4 for the first jug's lemons and sugar.
  await expect(coins(page)).toHaveText('10 munten')
  await expect(page.getByTestId('float-cost')).toHaveText('-4 citroenen en suiker')
  await expect(page.getByTestId('jug-count')).toHaveText('3')
  await tapPress(page, 3)
  await expect(coins(page)).toHaveText('16 munten')
  await settled(page)
  await page.reload()
  await expect(coins(page)).toHaveText('16 munten')
  await expect(page.getByTestId('jug-count')).toHaveCount(0)
})

test('buy the better press by tapping its arrow; taps are then worth more', async ({ page }) => {
  await startLemonade(page, 'Pers')
  await tapPress(page, 4)
  await expect(coins(page)).toHaveText('16 munten')
  // The arrow on the press is gold and pointed at.
  await expect(spot(page, 'press-up').locator('.hint-ring')).toHaveCount(1, { timeout: 4000 })
  await expect(page.getByTestId('goal')).toContainText('verbeteren')
  await spot(page, 'press-up').click()
  const card = page.getByRole('dialog', { name: 'Betere pers' })
  await expect(card).toBeVisible()
  await expect(card.getByTestId('upgrade-now')).toHaveText('1 beker per tik')
  await expect(card.getByTestId('upgrade-next')).toHaveText('2 bekers per tik')
  await expect(card.getByTestId('upgrade-price')).toHaveText('10')
  await card.getByTestId('upgrade-buy').click()
  await expect(card).toHaveCount(0)
  await expect(coins(page)).toHaveText('6 munten')
  await expect(press(page)).toHaveAccessibleName('Pers limonade: 2 bekers, 4 munten')
  await tapPress(page, 2)
  await expect(coins(page)).toHaveText('10 munten')
})

test('an upgrade you cannot afford says how much is missing', async ({ page }) => {
  await startLemonade(page, 'Arm')
  await spot(page, 'helper').click()
  const card = page.getByRole('dialog', { name: 'Hulpje' })
  await expect(card.getByText('Je hebt nog 8 munten nodig.')).toBeVisible()
  await expect(card.getByTestId('upgrade-buy')).toBeDisabled()
  await card.getByRole('button', { name: 'Sluiten' }).click()
  await expect(card).toHaveCount(0)
})

test('a refused upgrade shakes and explains; nothing is spent', async ({ page }) => {
  await startLemonade(page, 'Vast')
  // 12 coins buy the 10-coin press, but then the next jug cannot be paid.
  await spot(page, 'press-up').click()
  await page.getByTestId('upgrade-buy').click()
  await expect(page.getByRole('alert')).toContainText('volgende kan')
  await expect(coins(page)).toHaveText('12 munten')
})

test('the till shows sold, materials and what is left', async ({ page }) => {
  await startLemonade(page, 'Kassa')
  await tapPress(page, 5)
  await expect(coins(page)).toHaveText('14 munten')
  await settled(page)
  await spot(page, 'till').click()
  const sheet = page.getByRole('dialog', { name: 'Je kassa' })
  await expect(sheet.getByTestId('stats-sold')).toContainText('10')
  await expect(sheet.getByTestId('stats-materials')).toContainText('8')
  await expect(sheet.getByTestId('stats-left')).toContainText('2')
  await sheet.getByRole('button', { name: 'Verder spelen' }).click()
  await expect(sheet).toHaveCount(0)
})

test('the stand can be played with the keyboard', async ({ page }) => {
  await startLemonade(page, 'Toets')
  await press(page).focus()
  await expect(press(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(coins(page)).toHaveText('10 munten')
})

test('the stage only draws when something changes', async ({ page }) => {
  await startLemonade(page, 'Rust')
  await page.waitForFunction(() => 'frames' in ((window as unknown as { __mkStage?: object }).__mkStage ?? {}))
  await page.waitForTimeout(500)
  const frames = () => page.evaluate(() => (window as unknown as { __mkStage: { frames: number } }).__mkStage.frames)
  const a = await frames()
  await page.waitForTimeout(1000)
  expect(await frames()).toBe(a)
  // Zooming draws again, and the tap targets follow the objects.
  const before = await press(page).boundingBox()
  await page.mouse.move(600, 200)
  await page.mouse.wheel(0, -400)
  await expect.poll(frames).toBeGreaterThan(a)
  await expect.poll(async () => (await press(page).boundingBox())!.width).toBeGreaterThan(before!.width)
  await expect(page.getByRole('button', { name: 'Alles bekijken' })).toBeVisible()
  await page.getByRole('button', { name: 'Alles bekijken' }).click()
  await expect(page.getByRole('button', { name: 'Alles bekijken' })).toHaveCount(0)
})

for (const vp of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`every object can be tapped without scrolling at ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp)
    await startLemonade(page, `V${vp.width}`)
    for (const id of ['press', 'press-up', 'till', 'helper', 'tree']) {
      const s = spot(page, id)
      await expect(s).toBeInViewport()
      const box = (await s.boundingBox())!
      expect(Math.min(box.width, box.height), id).toBeGreaterThanOrEqual(48)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
}
