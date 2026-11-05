/**
 * Best-effort automatic recognition of physical column headers against the
 * conceptual fields the app needs (section 6). Only surfaces a mapping;
 * never invents data. Ambiguous required fields are reported so the caller
 * (UI mapping dialog) can ask the user instead of guessing.
 */
import {
  ColumnCandidate,
  ColumnMapping,
  ConceptualField,
  MappingSuggestion,
  OPTIONAL_FIELDS,
  REQUIRED_FIELDS
} from '@core/types'

/** Alias lists — deliberately generous since they only ever *suggest*, never overwrite the source. */
const ALIASES: Record<ConceptualField, string[]> = {
  account: ['account', 'g/l account', 'gl account', 'conta', 'account number', 'main account'],
  accountDescription: [
    'account description',
    'g/l description',
    'gl description',
    'account name',
    'descricao da conta',
    'descrição da conta',
    'description'
  ],
  category: ['category', 'classification', 'categoria', 'classificacao', 'classificação', 'class'],
  amount: [
    'amount',
    'amount lc',
    'amount in local currency',
    'valor',
    'net amount',
    'amount in doc. curr.',
    'local currency amount',
    'lc amount'
  ],
  dueDate: ['due date', 'net due date', 'data de vencimento', 'vencimento', 'due dt'],
  company: ['company', 'empresa'],
  companyCode: ['company code', 'codigo da empresa', 'código da empresa', 'bukrs'],
  supplier: ['supplier', 'vendor', 'fornecedor', 'account holder'],
  supplierName: ['supplier name', 'vendor name', 'nome do fornecedor'],
  documentNumber: ['document number', 'doc number', 'documento', 'doc. number'],
  invoiceNumber: ['invoice number', 'invoice', 'nota fiscal', 'nf'],
  currency: ['currency', 'moeda', 'curr', 'doc. currency', 'local currency'],
  paymentStatus: ['payment status', 'status', 'status de pagamento'],
  documentDate: ['document date', 'doc date', 'data do documento'],
  postingDate: ['posting date', 'data de lancamento', 'data de lançamento', 'bldat'],
  reference: ['reference', 'referencia', 'referência', 'ref']
}

function normalize(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function scoreHeader(field: ConceptualField, header: string): number {
  const h = normalize(header)
  const aliases = ALIASES[field]
  for (const alias of aliases) {
    if (h === normalize(alias)) return 100
  }
  for (const alias of aliases) {
    const a = normalize(alias)
    if (h.includes(a) || a.includes(h)) return 70
  }
  return 0
}

export function suggestMapping(columnHeaders: string[]): MappingSuggestion {
  const mapping: ColumnMapping = {}
  const candidatesByField: MappingSuggestion['candidatesByField'] = {}
  const ambiguousFields: ConceptualField[] = []

  const allFields = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]

  for (const field of allFields) {
    const candidates: ColumnCandidate[] = columnHeaders
      .map((h) => ({ field, physicalColumn: h, score: scoreHeader(field, h) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)

    if (candidates.length === 0) continue
    candidatesByField[field] = candidates

    const best = candidates[0]
    const tiedWithBest = candidates.filter((c) => c.score === best.score)

    if (tiedWithBest.length === 1) {
      mapping[field] = best.physicalColumn
    } else if (REQUIRED_FIELDS.includes(field)) {
      ambiguousFields.push(field)
    } else {
      // For optional fields, pick the first candidate rather than blocking the flow.
      mapping[field] = best.physicalColumn
    }
  }

  const unmappedRequiredFields = REQUIRED_FIELDS.filter((f) => !mapping[f])

  return { mapping, ambiguousFields, candidatesByField, unmappedRequiredFields }
}
