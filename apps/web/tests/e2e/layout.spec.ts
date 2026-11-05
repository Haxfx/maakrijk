import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'

// Layout checks at the four review viewports, with and without big text.
// Screenshots go to SHOT_DIR when set (used for the release candidate).
const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'landscape', width: 844, height: 390 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1366, height: 768 },
]
const shotDir = process.env.SHOT_DIR

async function shot(page: Page, name: string) {
  if (!shotDir || test.info().project.name !== 'chromium') return
  mkdirSync(shotDir, { recursive: true })
  await page.screenshot({ path: `${shotDir}/${name}.png`, fullPage: true })
}

/** No horizontal scroll, and every visible button is at least 48 px on its short side. */
async function checkLayout(page: Page) {
  const r = await page.evaluate(() => {
    const small: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('button, a, [role=switch]')) {
      const b = el.getBoundingClientRect()
      if (b.width === 0 || b.height === 0) continue
      const target = el.matches('[role=switch]') ? el.closest('label')!.getBoundingClientRect() : b
      if (Math.min(target.width, target.height) < 47.5) small.push(`${el.textContent?.trim() || el.getAttribute('aria-label')} ${Math.round(target.width)}x${Math.round(target.height)}`)
    }
    return { overflow: document.documentElement.scrollWidth - window.innerWidth, small }
  })
  expect(r.overflow, 'horizontal overflow').toBeLessThanOrEqual(0)
  expect(r.small, 'touch targets below 48 px').toEqual([])
}

for (const big of [false, true]) {
  for (const vp of viewports) {
    test(`layout ${vp.name}${big ? ' big text' : ''}`, async ({ page }) => {
      await page.setViewportSize(vp)
      const suffix = `${vp.name}${big ? '-bigtext' : ''}`
      if (big) {
        await page.goto('/instellingen')
        await page.getByText('Grote tekst').click()
      }
      await page.goto('/')
      await expect(page.getByRole('heading', { name: 'Wie speelt er?' })).toBeVisible()
      for (const [i, name] of ['Luca', 'Noor', 'Sam'].entries()) {
        await page.getByTestId('new-player').click()
        await page.getByTestId('nickname-input').fill(name)
        await page.getByRole('radio').nth(i * 2).check({ force: true })
        if (i === 0) await shot(page, `new-player-${suffix}`)
        await page.getByTestId('profile-submit').click()
        await expect(page.getByRole('button', { name: `Spelen als ${name}` })).toBeVisible()
      }
      await checkLayout(page)
      await shot(page, `players-${suffix}`)

      await page.getByTestId('manage-toggle').click()
      await checkLayout(page)
      await page.getByTestId('remove-Sam').click()
      await shot(page, `remove-${suffix}`)
      await page.getByRole('button', { name: 'Annuleren' }).click()
      await page.getByTestId('manage-toggle').click()

      await page.getByRole('button', { name: 'Spelen als Luca' }).click()
      await expect(page.getByRole('heading', { name: 'Hoi Luca!' })).toBeVisible()
      await checkLayout(page)
      await shot(page, `start-${suffix}`)

      await page.goto('/instellingen')
      await checkLayout(page)
      await shot(page, `settings-${suffix}`)
    })
  }
}
