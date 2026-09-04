/**
 * Aging bucket assignment (section 9). Buckets are mutually exclusive and
 * exhaustive over every finite integer daysPastDue value — no gaps, no
 * overlap. Boundary values (0,1,30,31,60,61,90,91,180,181,360,361) are the
 * ones that most commonly break naive implementations and are covered by
 * dedicated tests.
 */
import { Bucket } from '@core/types'

export function assignBucket(daysPastDue: number): Bucket {
  if (daysPastDue <= 0) return 'NOT_DUE'
  if (daysPastDue <= 30) return 'B1_30'
  if (daysPastDue <= 60) return 'B31_60'
  if (daysPastDue <= 90) return 'B61_90'
  if (daysPastDue <= 180) return 'B91_180'
  if (daysPastDue <= 360) return 'B181_360'
  return 'OVER_360'
}
