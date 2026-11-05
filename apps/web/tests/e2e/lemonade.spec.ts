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
  await expect(page.getByTestId('goal')).toContainText('Koop citroenen en suiker')
}

const coins = (page: Page) => page.getByTestId('coins')
const stock = (page: Page) => page.getByTestId('stock')
const jug = (page: Page) => page.getByTestId('jug')

test('a full round: buy, make, open, serve four customers, see the summary', async ({ page }) => {
  await startLemonade(page)
  await expect(coins(page)).toHaveText('12 munten')
  await expect(page.getByRole('img', { name: 'Spelwereld' })).toBeVisible()

  // Double click: still one purchase.
  await page.getByRole('button', { name: 'Koop voor 1 kan · 4 munten' }).dblclick()
  await expect(coins(page)).toHaveText('8 munten')
  await expect(stock(page)).toContainText('Citroenen 3 · Suiker 1')

  await page.getByRole('button', { name: 'Maak limonade' }).click()
  await expect(page.getByTestId('making')).toBeVisible()
  await expect(stock(page)).toContainText('Citroenen 0 · Suiker 0')
  await expect(page.getByTestId('goal')).toContainText('Open je kraam')
  await expect(jug(page)).toContainText('4 bekers', { timeout: 6000 })

  await page.getByRole('button', { name: 'Open de kraam' }).click()
  const serve = page.getByTestId('serve')
  for (let i = 1; i <= 4; i++) {
    await expect(serve).toBeEnabled({ timeout: 6000 })
    await expect(page.getByTestId('goal')).toContainText('Geef de klant een beker')
    await serve.click()
    await expect(coins(page)).toHaveText(`${8 + 2 * i} munten`)
    await expect(jug(page)).toContainText(i === 3 ? '1 beker' : `${4 - i} bekers`)
  }
  await expect(page.getByTestId('goal')).toContainText('Je ronde is klaar!')
  await expect(coins(page)).toHaveText('16 munten')

  // After a refresh the game is exactly where it was.
  await page.reload()
  await expect(coins(page)).toHaveText('16 munten')
  await expect(page.getByTestId('goal')).toContainText('Je ronde is klaar!')
})

test('refresh while the jug is being made: no second jug, ready by server time', async ({ page }) => {
  await startLemonade(page, 'Kan')
  await page.getByRole('button', { name: 'Koop voor 1 kan · 4 munten' }).click()
  await expect(coins(page)).toHaveText('8 munten')
  await page.getByRole('button', { name: 'Maak limonade' }).click()
  await expect(page.getByTestId('making')).toBeVisible()
  await page.reload()
  await expect(coins(page)).toHaveText('8 munten')
  await expect(stock(page)).toContainText('Citroenen 0 · Suiker 0')
  await expect(jug(page)).toContainText('4 bekers', { timeout: 6000 })
  await expect(page.getByRole('button', { name: 'Maak limonade' })).toHaveCount(0)
})

test('a refusal is explained and changes nothing', async ({ page }) => {
  await startLemonade(page, 'Nee')
  // 12 lemons one by one is impossible to reach; buy sugar until storage is full.
  for (let i = 0; i < 4; i++) {
    await page.getByRole('button', { name: '+1 suiker' }).click()
    await expect(coins(page)).toHaveText(`${11 - i} munten`)
  }
  await page.getByRole('button', { name: '+1 suiker' }).click()
  await expect(page.getByRole('alert')).toContainText('Zoveel past er niet')
  await expect(coins(page)).toHaveText('8 munten')
})

test('the stage only draws when something changes', async ({ page }) => {
  await startLemonade(page, 'Rust')
  await page.waitForFunction(() => 'frames' in ((window as unknown as { __mkStage?: object }).__mkStage ?? {}))
  await page.waitForTimeout(500)
  const frames = () => page.evaluate(() => (window as unknown as { __mkStage: { frames: number } }).__mkStage.frames)
  const a = await frames()
  await page.waitForTimeout(1000)
  expect(await frames()).toBe(a)
  // Zooming draws again.
  await page.getByRole('img', { name: 'Spelwereld' }).hover()
  await page.mouse.wheel(0, -400)
  await expect.poll(frames).toBeGreaterThan(a)
  await expect(page.getByRole('button', { name: 'Alles bekijken' })).toBeVisible()
  await page.getByRole('button', { name: 'Alles bekijken' }).click()
  await expect(page.getByRole('button', { name: 'Alles bekijken' })).toHaveCount(0)
})

for (const vp of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]) {
  test(`world and actions both visible at ${vp.width}×${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp)
    await startLemonade(page, `V${vp.width}`)
    await page.getByRole('button', { name: 'Koop voor 1 kan · 4 munten' }).click()
    await page.getByRole('button', { name: 'Maak limonade' }).click()
    await page.getByRole('button', { name: 'Open de kraam' }).click()
    const serve = page.getByTestId('serve')
    await expect(serve).toBeVisible()
    await expect(serve).toBeInViewport()
    const box = await page.getByRole('img', { name: 'Spelwereld' }).boundingBox()
    expect(box!.height).toBeGreaterThan(150)
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
    expect(overflow).toBe(false)
  })
}
