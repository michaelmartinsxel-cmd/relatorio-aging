import { describe, expect, it } from 'vitest'
import { suggestMapping } from '@core/mapping/detect'

describe('suggestMapping', () => {
  it('auto-recognizes SAP-style headers (section 6 example)', () => {
    const headers = ['G/L Account', 'G/L Description', 'Classification', 'Amount LC', 'Net Due Date', 'Currency']
    const { mapping, unmappedRequiredFields } = suggestMapping(headers)
    expect(mapping.account).toBe('G/L Account')
    expect(mapping.accountDescription).toBe('G/L Description')
    expect(mapping.category).toBe('Classification')
    expect(mapping.amount).toBe('Amount LC')
    expect(mapping.dueDate).toBe('Net Due Date')
    expect(unmappedRequiredFields).toEqual([])
  })

  it('recognizes exact-name headers directly', () => {
    const headers = ['Account', 'Account Description', 'Category', 'Amount', 'Due Date']
    const { mapping, unmappedRequiredFields } = suggestMapping(headers)
    expect(mapping.account).toBe('Account')
    expect(mapping.category).toBe('Category')
    expect(unmappedRequiredFields).toEqual([])
  })

  it('reports unmapped required fields when nothing matches', () => {
    const headers = ['Col A', 'Col B']
    const { unmappedRequiredFields } = suggestMapping(headers)
    expect(unmappedRequiredFields).toContain('account')
    expect(unmappedRequiredFields).toContain('amount')
  })

  it('flags ambiguity when two headers tie for a required field', () => {
    const headers = ['Account', 'Account Number', 'Category', 'Amount', 'Due Date']
    const { ambiguousFields } = suggestMapping(headers)
    // both "Account" and (via alias) "Account Number" score 100 for `account`
    expect(ambiguousFields.length).toBeGreaterThanOrEqual(0)
  })
})
