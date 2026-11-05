/**
 * Only the validations required to safely produce the report (section 20).
 * This is not a data-quality tool: it does not fix, infer or reclassify —
 * it only decides whether the pipeline can proceed and what currency
 * question (if any) must be put to the user.
 */
import { ColumnMapping, REQUIRED_FIELDS } from '@core/types'

export interface MappingValidation {
  ok: boolean
  missingFields: string[]
}

export function validateMapping(mapping: ColumnMapping): MappingValidation {
  const missingFields = REQUIRED_FIELDS.filter((f) => !mapping[f])
  return { ok: missingFields.length === 0, missingFields }
}

export interface CurrencyCheck {
  currencies: string[]
  isMulti: boolean
}

export function checkCurrencies(currencies: (string | undefined)[]): CurrencyCheck {
  const set = new Set(currencies.filter((c): c is string => !!c))
  return { currencies: [...set], isMulti: set.size > 1 }
}
