import { suggestMapping } from '@core/mapping/detect'
import { ConceptualField, OPTIONAL_FIELDS, REQUIRED_FIELDS } from '@core/types'
import { useAppStore } from '../state/store'

const FIELD_LABEL: Record<ConceptualField, string> = {
  account: 'Account',
  accountDescription: 'Account Description',
  category: 'Category',
  amount: 'Amount',
  dueDate: 'Due Date',
  company: 'Company',
  companyCode: 'Company Code',
  supplier: 'Supplier',
  supplierName: 'Supplier Name',
  documentNumber: 'Document Number',
  invoiceNumber: 'Invoice Number',
  currency: 'Currency',
  paymentStatus: 'Payment Status',
  documentDate: 'Document Date',
  postingDate: 'Posting Date',
  reference: 'Reference'
}

export default function MappingDialog(): JSX.Element {
  const sheets = useAppStore((s) => s.sheets)
  const selectedSheet = useAppStore((s) => s.selectedSheet)
  const columnMapping = useAppStore((s) => s.columnMapping)
  const setColumnMapping = useAppStore((s) => s.setColumnMapping)
  const setStage = useAppStore((s) => s.setStage)

  const sheet = sheets.find((s) => s.name === selectedSheet)
  const headers = sheet?.columnHeaders ?? []
  const missingRequired = REQUIRED_FIELDS.filter((f) => !columnMapping[f])

  function update(field: ConceptualField, value: string): void {
    const next = { ...columnMapping, [field]: value || undefined }
    const stillMissing = REQUIRED_FIELDS.filter((f) => !next[f])
    setColumnMapping(next, stillMissing)
  }

  function resetToAuto(): void {
    if (!sheet) return
    const suggestion = suggestMapping(sheet.columnHeaders)
    setColumnMapping(suggestion.mapping, suggestion.unmappedRequiredFields)
  }

  function confirm(): void {
    if (missingRequired.length > 0) return
    setStage('agingDate')
  }

  return (
    <div className="modal-overlay">
      <div className="card modal-card">
        <h2>Confirm Column Mapping</h2>
        <p className="section-meta">
          Alguns campos essenciais não puderam ser identificados automaticamente com certeza, ou ficaram ambíguos.
          Confirme o mapeamento das colunas físicas do arquivo antes de continuar.
        </p>

        <h3 style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase' }}>Required</h3>
        {REQUIRED_FIELDS.map((field) => (
          <div className="field-row" key={field}>
            <label className="field-required">{FIELD_LABEL[field]}</label>
            <select value={columnMapping[field] ?? ''} onChange={(e) => update(field, e.target.value)}>
              <option value="">— select column —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}

        <h3 style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', marginTop: 16 }}>
          Optional (when available)
        </h3>
        {OPTIONAL_FIELDS.map((field) => (
          <div className="field-row" key={field}>
            <label>{FIELD_LABEL[field]}</label>
            <select value={columnMapping[field] ?? ''} onChange={(e) => update(field, e.target.value)}>
              <option value="">— not used —</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        ))}

        {missingRequired.length > 0 && (
          <p className="error-text">
            Missing required fields: {missingRequired.map((f) => FIELD_LABEL[f]).join(', ')}
          </p>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={resetToAuto}>
            Reset to automatic
          </button>
          <button className="btn" onClick={() => setStage('sheet')}>
            Back
          </button>
          <button className="btn btn-primary" onClick={confirm} disabled={missingRequired.length > 0}>
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
