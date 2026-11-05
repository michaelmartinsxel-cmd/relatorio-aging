/** Minor-unit -> presentation formatting. All calculation stays in integer minor units; this is the only place that turns them into decimals for display/export. */
export function minorToMajor(minor: number): number {
  return minor / 100
}

export function formatMoney(minor: number, currency: string): string {
  const major = minorToMajor(minor)
  const sign = major < 0 ? '-' : ''
  const abs = Math.abs(major).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${sign}${currency} ${abs}`
}

export function formatPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

export function formatIsoDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
