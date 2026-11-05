import { useState } from 'react'
import { suggestMapping } from '@core/mapping/detect'
import { useAppStore } from '../state/store'

export default function UploadScreen(): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const fileInfo = useAppStore((s) => s.fileInfo)
  const sheets = useAppStore((s) => s.sheets)
  const selectedSheet = useAppStore((s) => s.selectedSheet)
  const stage = useAppStore((s) => s.stage)
  const setFileInfo = useAppStore((s) => s.setFileInfo)
  const setSheets = useAppStore((s) => s.setSheets)
  const setSelectedSheet = useAppStore((s) => s.setSelectedSheet)
  const setStage = useAppStore((s) => s.setStage)
  const setColumnMapping = useAppStore((s) => s.setColumnMapping)
  const setError = useAppStore((s) => s.setError)

  async function handlePickFile(): Promise<void> {
    setLocalError(null)
    setBusy(true)
    try {
      const res = await window.api.openFileDialog()
      if (res.canceled || !res.filePath) {
        setBusy(false)
        return
      }
      setFileInfo({
        filePath: res.filePath,
        fileName: res.fileName!,
        fileSizeBytes: res.fileSizeBytes!,
        importedAt: res.importedAt!
      })
      const inspected = await window.api.inspectWorkbook({ filePath: res.filePath })
      if (inspected.sheets.length === 0) {
        setLocalError('No readable sheet was found in this file.')
        setBusy(false)
        return
      }
      setSheets(inspected.sheets, inspected.suggestedSheet)
      setStage('sheet')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  function proceedToMapping(): void {
    const sheet = sheets.find((s) => s.name === selectedSheet)
    if (!sheet) return
    const suggestion = suggestMapping(sheet.columnHeaders)
    setColumnMapping(suggestion.mapping, suggestion.unmappedRequiredFields)
    if (suggestion.unmappedRequiredFields.length > 0 || suggestion.ambiguousFields.length > 0) {
      setStage('mapping')
    } else {
      setStage('agingDate')
    }
  }

  return (
    <div className="center-screen">
      <div className="card upload-card">
        <h1>AP Aging Report</h1>
        <p>Importe sua base Excel para gerar automaticamente o Aging por Categoria e por Conta.</p>

        {stage === 'upload' && (
          <>
            <div className="dropzone">
              <p>Arraste seu arquivo Excel aqui</p>
              <p style={{ margin: '10px 0' }}>ou</p>
              <button className="btn btn-primary" onClick={handlePickFile} disabled={busy}>
                {busy ? 'Loading…' : 'Selecionar arquivo'}
              </button>
            </div>
            {localError && <p className="error-text">{localError}</p>}
          </>
        )}

        {stage === 'sheet' && fileInfo && (
          <div style={{ textAlign: 'left' }}>
            <div className="field-row">
              <label>File</label>
              <span>{fileInfo.fileName}</span>
            </div>
            <div className="field-row">
              <label>Size</label>
              <span>{(fileInfo.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="field-row">
              <label>Imported at</label>
              <span>{new Date(fileInfo.importedAt).toLocaleString()}</span>
            </div>
            {sheets.length > 1 && (
              <div className="field-row">
                <label className="field-required">Sheet</label>
                <select value={selectedSheet ?? ''} onChange={(e) => setSelectedSheet(e.target.value)}>
                  {sheets.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name} ({s.rowCount} rows{s.looksLikeDataSheet ? '' : ' — may not be data'})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {sheets.length === 1 && (
              <div className="field-row">
                <label>Sheet</label>
                <span>{sheets[0].name}</span>
              </div>
            )}
            <div className="field-row">
              <label>Records</label>
              <span>{sheets.find((s) => s.name === selectedSheet)?.rowCount ?? 0}</span>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setStage('upload')}>
                Back
              </button>
              <button className="btn btn-primary" onClick={proceedToMapping}>
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
