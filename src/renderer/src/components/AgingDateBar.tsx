import { useState } from 'react'
import { useAppStore } from '../state/store'

export default function AgingDateBar(): JSX.Element {
  const columnMapping = useAppStore((s) => s.columnMapping)
  const sheets = useAppStore((s) => s.sheets)
  const selectedSheet = useAppStore((s) => s.selectedSheet)
  const fileInfo = useAppStore((s) => s.fileInfo)
  const agingDateChoice = useAppStore((s) => s.agingDateChoice)
  const setAgingDateChoice = useAppStore((s) => s.setAgingDateChoice)
  const incompleteDataPolicy = useAppStore((s) => s.incompleteDataPolicy)
  const setIncompleteDataPolicy = useAppStore((s) => s.setIncompleteDataPolicy)
  const setStage = useAppStore((s) => s.setStage)
  const setProgressStage = useAppStore((s) => s.setProgressStage)
  const setPipelineOutcome = useAppStore((s) => s.setPipelineOutcome)
  const setError = useAppStore((s) => s.setError)

  const [kind, setKind] = useState<'today' | 'manual' | 'fromFile'>(agingDateChoice.kind)
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10))
  const [fromFileColumn, setFromFileColumn] = useState('')

  const sheet = sheets.find((s) => s.name === selectedSheet)
  const dateLikeHeaders = sheet?.columnHeaders ?? []

  async function start(): Promise<void> {
    if (!fileInfo || !sheet) return

    let choice = agingDateChoice
    if (kind === 'today') choice = { kind: 'today' }
    else if (kind === 'manual') choice = { kind: 'manual', isoDate: manualDate }
    else choice = { kind: 'fromFile', column: fromFileColumn }
    setAgingDateChoice(choice)

    setStage('processing')
    const unsubscribe = window.api.onPipelineProgress((evt) => setProgressStage(evt.stage))
    try {
      const res = await window.api.runPipeline({
        filePath: fileInfo.filePath,
        sheetName: sheet.name,
        headerRow: sheet.headerRow,
        columnMapping,
        agingDate: choice,
        incompleteDataPolicy
      })
      if (!res.ok || !res.dataset || !res.result) {
        setError(res.error ?? 'Unknown pipeline error.')
        return
      }
      setPipelineOutcome(res.dataset, res.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      unsubscribe()
    }
  }

  return (
    <div className="center-screen">
      <div className="card upload-card" style={{ width: 520 }}>
        <h1 style={{ fontSize: 18 }}>Aging Date / Reporting Date</h1>
        <p>Escolha a data de referência que será usada em todos os cálculos do relatório.</p>

        <div style={{ textAlign: 'left' }}>
          <div className="field-row">
            <label>
              <input type="radio" checked={kind === 'today'} onChange={() => setKind('today')} /> Use current date
            </label>
          </div>
          <div className="field-row">
            <label>
              <input type="radio" checked={kind === 'manual'} onChange={() => setKind('manual')} /> Manual date
            </label>
            <input
              type="date"
              value={manualDate}
              disabled={kind !== 'manual'}
              onChange={(e) => setManualDate(e.target.value)}
            />
          </div>
          <div className="field-row">
            <label>
              <input type="radio" checked={kind === 'fromFile'} onChange={() => setKind('fromFile')} /> From file
              column
            </label>
            <select
              disabled={kind !== 'fromFile'}
              value={fromFileColumn}
              onChange={(e) => setFromFileColumn(e.target.value)}
            >
              <option value="">— select column —</option>
              {dateLikeHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>

          <h3 style={{ fontSize: 13, color: '#6b7280', textTransform: 'uppercase', marginTop: 18 }}>
            Missing Category
          </h3>
          <div className="field-row">
            <label>
              <input
                type="checkbox"
                checked={incompleteDataPolicy.treatBlankCategoryAsUnclassified}
                onChange={(e) => setIncompleteDataPolicy({ treatBlankCategoryAsUnclassified: e.target.checked })}
              />{' '}
              Treat blank Category as &quot;Unclassified&quot;
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={() => setStage('mapping')}>
            Back
          </button>
          <button
            className="btn btn-primary"
            onClick={start}
            disabled={(kind === 'fromFile' && !fromFileColumn) || (kind === 'manual' && !manualDate)}
          >
            Generate Report
          </button>
        </div>
      </div>
    </div>
  )
}
