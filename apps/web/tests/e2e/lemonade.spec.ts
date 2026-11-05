import { expect, test, type Page } from '@playwright/test'

// The lemonade idle clicker through the real UI, against Rust + Postgres.
// The server clock runs in real time: the stand sells 1 cup every 4 s by
// itself, starting with the first command. Checks right after the start
// stay inside those first 4 s; later checks allow for cups sold by itself.

async function startLemonade(page: Page, name = 'Limo') {
  await page.goto('/')
  await page.getByTestId('new-player').click()
  await page.getByTestId('nickname-input').fill(name)
  await page.getByRole('radio').first().check({ force: true })
  await page.getByTestId('profile-submit').click()
  await page.getByRole('button', { name: `Spelen als ${name}` }).click()
  await page.getByTestId('card-lemonade').getByRole('button', { name: 'Spelen' }).click()
  await expect(page).toHaveURL(/\/limonade\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId('goal')).toContainText('verkoopt vanzelf')
}

const coins = (page: Page) => page.getByTestId('coins')
const spot = (page: Page, id: string) => page.getByTestId(`spot-${id}`)
const press = (page: Page) => spot(page, 'press')
const coinCount = async (page: Page) => Number((await coins(page).innerText()).replace(/\D/g, ''))

async function tapPress(page: Page, n: number) {
  for (let i = 0; i < n; i++) await press(page).click({ delay: 0 })
}

test('the stand sells by itself, visibly', async ({ page }) => {
  await startLemonade(page)
  await expect(coins(page)).toHaveText('12 munten')
  await expect(page.getByTestId('per-minute')).toHaveText('Vanzelf: +15 per minuut')
  await expect(page.getByRole('progressbar', { name: 'Volgende beker' })).toBeVisible()
  // Nothing tapped: after ~4 s the first cup sells (+2) and its jug is bought (-4).
  await expect(coins(page)).toHaveText('10 munten', { timeout: 7000 })
  await expect(page.getByTestId('float-jug')).toHaveText('-4 citroenen en suiker')
  await expect(coins(page)).toHaveText('12 munten', { timeout: 7000 })
  // The server agrees after a refresh.
  await page.reload()
  await expect.poll(() => coinCount(page)).toBeGreaterThanOrEqual(12)
})

test('tapping the press sells extra cups at once', async ({ page }) => {
  await startLemonade(page, 'Tik')
  await expect(press(page)).toHaveAccessibleName('Pers limonade: 1 beker, 2 munten')
  // The press is never the hint: selling by itself is the core.
  await expect(press(page).locator('.hint-ring')).toHaveCount(0)
  await press(page).click()
  await expect(coins(page)).toHaveText('10 munten')
  await tapPress(page, 3)
  await expect(coins(page)).toHaveText('16 munten')
  await page.waitForLoadState('networkidle')
  await page.reload()
  await expect.poll(() => coinCount(page)).toBeGreaterThanOrEqual(16)
})

test('the helper is pointed at and makes the stand sell faster by itself', async ({ page }) => {
  await startLemonade(page, 'Hulp')
  await tapPress(page, 8) // 12 + 16 - 8 = 20
  await expect(spot(page, 'helper').locator('.hint-ring')).toHaveCount(1, { timeout: 4000 })
  await expect(page.getByTestId('goal')).toContainText('hulpje')
  await spot(page, 'helper').click()
  const card = page.getByRole('dialog', { name: 'Hulpje' })
  await expect(card.getByTestId('upgrade-now')).toHaveText('15 bekers per minuut vanzelf')
  await expect(card.getByTestId('upgrade-next')).toHaveText('45 bekers per minuut vanzelf')
  await expect(card.getByTestId('upgrade-price')).toHaveText('15')
  await card.getByTestId('upgrade-buy').click()
  await expect(card).toHaveCount(0)
  await expect(page.getByTestId('per-minute')).toHaveText('Vanzelf: +45 per minuut')
})

test('an upgrade you cannot afford says how much is missing', async ({ page }) => {
  await startLemonade(page, 'Arm')
  await spot(page, 'advert').click()
  const card = page.getByRole('dialog', { name: 'Reclame' })
  await expect(card.getByText(/Je hebt nog \d+ munten nodig\./)).toBeVisible()
  await expect(card.getByTestId('upgrade-buy')).toBeDisabled()
  await card.getByRole('button', { name: 'Sluiten' }).click()
  await expect(card).toHaveCount(0)
})

test('a refused upgrade explains why; nothing is spent', async ({ page }) => {
  await startLemonade(page, 'Vast')
  // 12 coins buy the 10-coin press, but then the next jug cannot be paid.
  await spot(page, 'press-up').click()
  await page.getByTestId('upgrade-buy').click()
  await expect(page.getByRole('alert')).toContainText('volgende kan')
  await expect(coins(page)).toHaveText('12 munten')
})

test('the till shows sold, materials and what is left', async ({ page }) => {
  await startLemonade(page, 'Kassa')
  await tapPress(page, 4)
  await page.waitForLoadState('networkidle')
  await spot(page, 'till').click()
  const sheet = page.getByRole('dialog', { name: 'Je kassa' })
  for (const k of ['sold', 'materials', 'left']) await expect(sheet.getByTestId(`stats-${k}`)).toHaveText(/\d+/)
  const n = async (k: string) => Number((await sheet.getByTestId(`stats-${k}`).innerText()).replace(/\D/g, ''))
  expect(await n('sold')).toBeGreaterThanOrEqual(8)
  expect((await n('sold')) - (await n('materials'))).toBe(await n('left'))
  await sheet.getByRole('button', { name: 'Verder spelen' }).click()
  await expect(sheet).toHaveCount(0)
})

test('the stand can be played with the keyboard', async ({ page }) => {
  await startLemonade(page, 'Toets')
  await press(page).focus()
  await page.keyboard.press('Enter')
  await expect(coins(page)).toHaveText('10 munten')
})

test('the stage only draws when something changes', async ({ page }) => {
  await startLemonade(page, 'Rust')
  await page.waitForFunction(() => 'frames' in ((window as unknown as { __mkStage?: object }).__mkStage ?? {}))
  await page.waitForTimeout(300)
  const frames = () => page.evaluate(() => (window as unknown as { __mkStage: { frames: number } }).__mkStage.frames)
  // Within the first 4 s nothing sells, so nothing should be drawn.
  const a = await frames()
  await page.waitForTimeout(1000)
  expect(await frames()).toBe(a)
  const before = await press(page).boundingBox()
  // Over the scenery at the left, not over a tappable object.
  await page.mouse.move(60, 400)
  await page.mouse.wheel(0, -400)
  await expect.poll(frames).toBeGreaterThan(a)
  await expect.poll(async () => (await press(page).boundingBox())!.width).toBeGreaterThan(before!.width)
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
    for (const id of ['press', 'press-up', 'till', 'helper', 'advert', 'tree']) {
      const s = spot(page, id)
      await expect(s).toBeInViewport()
      const box = (await s.boundingBox())!
      expect(Math.min(box.width, box.height), id).toBeGreaterThanOrEqual(48)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
}
