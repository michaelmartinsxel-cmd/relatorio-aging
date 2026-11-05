import { describe, expect, it } from 'vitest'
import { assignBucket } from '@core/aging/buckets'
import { BUCKET_ORDER } from '@core/types'

describe('assignBucket — boundary values (section 9)', () => {
  const cases: [number, string][] = [
    [-5, 'NOT_DUE'],
    [0, 'NOT_DUE'],
    [1, 'B1_30'],
    [30, 'B1_30'],
    [31, 'B31_60'],
    [60, 'B31_60'],
    [61, 'B61_90'],
    [90, 'B61_90'],
    [91, 'B91_180'],
    [180, 'B91_180'],
    [181, 'B181_360'],
    [360, 'B181_360'],
    [361, 'OVER_360'],
    [10000, 'OVER_360']
  ]

  for (const [dpd, expected] of cases) {
    it(`dpd=${dpd} -> ${expected}`, () => {
      expect(assignBucket(dpd)).toBe(expected)
    })
  }

  it('every integer from -10 to 1000 belongs to exactly one bucket (no gaps/overlap)', () => {
    for (let dpd = -10; dpd <= 1000; dpd++) {
      const bucket = assignBucket(dpd)
      expect(BUCKET_ORDER).toContain(bucket)
    }
  })

  it('bucket assignment is monotonic non-decreasing with dpd', () => {
    let lastIndex = 0
    for (let dpd = -10; dpd <= 1000; dpd++) {
      const idx = BUCKET_ORDER.indexOf(assignBucket(dpd))
      expect(idx).toBeGreaterThanOrEqual(lastIndex)
      lastIndex = idx
    }
  })
})
