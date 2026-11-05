import { expect, test, type Page } from '@playwright/test'

// One complete lemonade round through the real UI, against Rust + Postgres.
// The server clock runs in real time: a jug takes 3 s, customers come every 2.5 s.

async function startLemonade(page: Page, name = 'Limo') {
  await page.goto('/')
  await page.getByTestId('new-player').click()
  await page.getByTestId('nickname-input').fill(name)
  await page.getByRole('radio').first().check({ force: true })
  await page.getByTestId('profile-submit').click()
  await page.getByRole('button', { name: `Spelen als ${name}` }).click()
  await page.getByTestId('card-lemonade').getByRole('button', { name: 'Spelen' }).click()
  await expect(page).toHaveURL(/\/limonade\/[0-9a-f-]{36}$/)
  await expect(page.getByTestId('goal')).toContainText('Tik op de kist en de suikerpot')
}

const coins = (page: Page) => page.getByTestId('coins')
const crate = (page: Page) => page.getByTestId('spot-lemons')
const jar = (page: Page) => page.getByTestId('spot-sugar')
const press = (page: Page) => page.getByTestId('spot-press')
const board = (page: Page) => page.getByTestId('spot-board')
const count = (page: Page, what: 'lemons' | 'sugar' | 'jug') => page.getByTestId(`${what}-count`)

/** Tap the crate three times and the sugar pot once: 12 → 8 coins. */
async function buyForJug(page: Page, start = 12) {
  for (let i = 1; i <= 3; i++) {
    await crate(page).click()
    await expect(coins(page)).toHaveText(`${start - i} munten`)
  }
  await jar(page).click()
  await expect(coins(page)).toHaveText(`${start - 4} munten`)
}

test('a full round, all by tapping the stand: buy, make, open, serve four customers', async ({ page }) => {
  await startLemonade(page)
  await expect(coins(page)).toHaveText('12 munten')
  await expect(page.getByRole('img', { name: 'Spelwereld' })).toBeVisible()
  // The crate is pointed at first, and its label says what it does.
  await expect(crate(page)).toHaveAccessibleName('Koop een citroen, 1 munt. Je hebt 0 citroenen')
  await expect(crate(page).locator('.hint-ring')).toHaveCount(1)

  await buyForJug(page)
  await expect(count(page, 'lemons')).toHaveText('3')
  await expect(count(page, 'sugar')).toHaveText('1')
  await expect(press(page).locator('.hint-ring')).toHaveCount(1)

  await press(page).click()
  await expect(page.getByTestId('making')).toBeVisible()
  // Empty: the badge goes away.
  await expect(count(page, 'lemons')).toHaveCount(0)
  await expect(count(page, 'jug')).toHaveText('4', { timeout: 6000 })
  await expect(page.getByTestId('goal')).toContainText('Tik op het bord')

  await board(page).click()
  await expect(board(page)).toHaveAccessibleName('Kraam sluiten')
  for (let i = 1; i <= 4; i++) {
    const serve = page.getByTestId('serve')
    await expect(serve).toBeEnabled({ timeout: 6000 })
    await expect(page.getByTestId('goal')).toContainText('Tik op een klant')
    // Double tap: still one payment per customer.
    if (i === 2) await serve.dblclick()
    else await serve.click()
    await expect(coins(page)).toHaveText(`${8 + 2 * i} munten`)
    if (i < 4) await expect(count(page, 'jug')).toHaveText(`${4 - i}`)
    else await expect(count(page, 'jug')).toHaveCount(0)
  }

  const dialog = page.getByRole('dialog', { name: 'Ronde klaar!' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Je hebt alle 4 klanten geholpen.')
  await expect(page.getByTestId('summary-sold')).toContainText('8')
  await expect(page.getByTestId('summary-materials')).toContainText('4')
  await expect(page.getByTestId('summary-left')).toContainText('4')

  // After a refresh the game is exactly where it was, summary included.
  await page.reload()
  await expect(coins(page)).toHaveText('16 munten')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Volgende ronde' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('goal')).toContainText('Tik op de kist en de suikerpot')
})

test('closing early by tapping the board: summary shows what was sold, leftover cups stay', async ({ page }) => {
  await startLemonade(page, 'Vroeg')
  await buyForJug(page)
  await press(page).click()
  await expect(count(page, 'jug')).toHaveText('4', { timeout: 6000 })
  await board(page).click()
  await expect(page.getByTestId('serve')).toBeEnabled({ timeout: 6000 })
  await page.getByTestId('serve').click()
  await expect(coins(page)).toHaveText('10 munten')
  await board(page).click()
  const dialog = page.getByRole('dialog', { name: 'Ronde klaar!' })
  await expect(dialog).toContainText('Je hebt 1 van de 4 klanten geholpen.')
  await expect(page.getByTestId('summary-sold')).toContainText('2')
  await expect(page.getByTestId('summary-materials')).toContainText('1')
  await expect(page.getByTestId('summary-left')).toContainText('1')
  await dialog.getByRole('button', { name: 'Volgende ronde' }).click()
  await expect(count(page, 'jug')).toHaveText('3')
  await expect(board(page)).toHaveAccessibleName('Open de kraam')
})

test('refresh while the jug is being made: no second jug, ready by server time', async ({ page }) => {
  await startLemonade(page, 'Kan')
  await buyForJug(page)
  await press(page).click()
  await expect(page.getByTestId('making')).toBeVisible()
  await page.reload()
  await expect(coins(page)).toHaveText('8 munten')
  await expect(count(page, 'lemons')).toHaveCount(0)
  await expect(count(page, 'sugar')).toHaveCount(0)
  await expect(count(page, 'jug')).toHaveText('4', { timeout: 6000 })
  // Tapping the press again is refused: the jug is not empty.
  await press(page).click()
  await expect(page.getByRole('alert')).toContainText('Er zit nog limonade in de kan')
  await expect(count(page, 'jug')).toHaveText('4')
})

test('a refused tap is explained, shakes, and changes nothing', async ({ page }) => {
  await startLemonade(page, 'Nee')
  for (let i = 0; i < 4; i++) {
    await jar(page).click()
    await expect(coins(page)).toHaveText(`${11 - i} munten`)
  }
  await jar(page).click()
  await expect(page.getByRole('alert')).toContainText('Zoveel past er niet')
  await expect(jar(page)).toHaveClass(/is-shaking/)
  await expect(coins(page)).toHaveText('8 munten')
  await expect(count(page, 'sugar')).toHaveText('4')
})

test('the stand works with the keyboard', async ({ page }) => {
  await startLemonade(page, 'Toets')
  await crate(page).focus()
  await page.keyboard.press('Enter')
  await expect(coins(page)).toHaveText('11 munten')
  await expect(count(page, 'lemons')).toHaveText('1')
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
  const before = await crate(page).boundingBox()
  await page.mouse.move(600, 200)
  await page.mouse.wheel(0, -400)
  await expect.poll(frames).toBeGreaterThan(a)
  await expect.poll(async () => (await crate(page).boundingBox())!.width).toBeGreaterThan(before!.width)
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
    await buyForJug(page)
    await press(page).click()
    await expect(count(page, 'jug')).toHaveText('4', { timeout: 6000 })
    await board(page).click()
    await expect(page.getByTestId('serve')).toBeEnabled({ timeout: 6000 })
    for (const spot of [crate(page), jar(page), press(page), board(page), page.getByTestId('serve')]) {
      await expect(spot).toBeInViewport()
      const box = (await spot.boundingBox())!
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(48)
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
}
