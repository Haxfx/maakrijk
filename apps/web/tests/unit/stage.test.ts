import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import GameStage from '~/components/game/GameStage.vue'
import { MAX_ZOOM_FACTOR, type Bounds, clampView, fitView, fitZoom, panBy, projectedSize } from '~/game/view'

const world: Bounds = { minX: -6, maxX: 6, minZ: -4, maxZ: 4 }

describe('camera maths', () => {
  it('fits the whole world inside the viewport', () => {
    for (const [w, h] of [
      [390, 500],
      [844, 300],
      [1366, 600],
    ] as const) {
      const z = fitZoom(world, w, h)
      const size = projectedSize(world)
      expect(size.w * z).toBeLessThanOrEqual(w)
      expect(size.h * z).toBeLessThanOrEqual(h)
    }
  })

  it('centres on the world', () => {
    const v = fitView({ minX: 0, maxX: 10, minZ: 2, maxZ: 4 }, 400, 400)
    expect([v.targetX, v.targetZ]).toEqual([5, 3])
  })

  it('never zooms out past "all" or in past the limit', () => {
    const fit = fitZoom(world, 400, 400)
    expect(clampView({ targetX: 0, targetZ: 0, zoom: fit / 10 }, world, 400, 400).zoom).toBeCloseTo(fit)
    expect(clampView({ targetX: 0, targetZ: 0, zoom: fit * 100 }, world, 400, 400).zoom).toBeCloseTo(fit * MAX_ZOOM_FACTOR)
  })

  it('never pans outside the world', () => {
    const v = clampView({ targetX: 99, targetZ: -99, zoom: 10 }, world, 400, 400)
    expect([v.targetX, v.targetZ]).toEqual([6, -4])
  })

  it('pan there and back returns to the start', () => {
    const start = { targetX: 1, targetZ: 2, zoom: 20 }
    const back = panBy(panBy(start, 37, -12), -37, 12)
    expect(back.targetX).toBeCloseTo(1)
    expect(back.targetZ).toBeCloseTo(2)
  })

  it('dragging right moves the world right (camera goes left)', () => {
    const v = panBy({ targetX: 0, targetZ: 0, zoom: 10 }, 100, 0)
    // Screen right is world (+x, -z); the camera target moves the other way.
    expect(v.targetX).toBeLessThan(0)
    expect(v.targetZ).toBeGreaterThan(0)
  })
})

describe('GameStage', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('shows a clear message when WebGL is missing', async () => {
    // happy-dom has no WebGL, like a very old or locked-down device.
    const w = mount(GameStage, { props: { bounds: world } })
    await nextTick()
    expect(w.get('[role="status"]').text()).toContain('kan de spelwereld niet tekenen')
    expect(w.find('canvas').exists()).toBe(false)
    w.unmount()
  })
})

describe('front (picture-book) view', () => {
  const b: Bounds = { minX: -5, maxX: 5, minZ: 0, maxZ: 8 }

  it('fits the width and stands the picture on the bottom edge of a tall screen', () => {
    const v = fitView(b, 400, 1000, 'front')
    expect(v.zoom).toBeCloseTo((400 * 0.94) / 10)
    // Screen y of world height y: H/2 - (y - target) * zoom. The bounds'
    // bottom sits one side-margin above the screen bottom.
    const bottomOnScreen = 1000 / 2 - (b.minZ - v.targetZ) * v.zoom
    expect(bottomOnScreen).toBeCloseTo(1000 - 400 * 0.03)
  })

  it('centres on a wide screen', () => {
    const v = fitView(b, 1600, 400, 'front')
    expect(v.targetZ).toBeCloseTo(4)
    expect(v.targetX).toBeCloseTo(0)
  })

  it('drags the picture with the finger', () => {
    const v = panBy({ targetX: 0, targetZ: 0, zoom: 10 }, 100, 50, 'front')
    expect(v).toEqual({ targetX: -10, targetZ: 5, zoom: 10 })
  })

  it('keeps the iso maths unchanged by default', () => {
    expect(projectedSize(b)).toEqual(projectedSize(b, 'iso'))
  })
})
