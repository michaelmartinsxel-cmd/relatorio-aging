import { useState } from 'react'
import { useAppStore } from '../state/store'
import { useFilteredResult } from '../state/selectors'
import Overview from '../pages/Overview'
import AgingByCategory from '../pages/AgingByCategory'
import AgingByAccount from '../pages/AgingByAccount'
import SourceData from '../pages/SourceData'
import DrilldownModal from './DrilldownModal'

type Page = 'overview' | 'byCategory' | 'byAccount' | 'sourceData'

export default function ReportShell(): JSX.Element {
  const [page, setPage] = useState<Page>('overview')
  const dataset = useAppStore((s) => s.dataset)
  const reset = useAppStore((s) => s.reset)
  const [exportStatus, setLocalExportStatus] = useState<'idle' | 'exporting' | 'done' | 'error'>('idle')
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  const result = useFilteredResult()

  if (!dataset || !result) return <></>

  async function handleExport(): Promise<void> {
    if (!dataset || !result) return
    const folder = await window.api.chooseDestinationFolder()
    if (folder.canceled || !folder.folderPath) return

    setLocalExportStatus('exporting')
    setExportMessage(null)
    try {
      const res = await window.api.exportReport({
        destinationFolder: folder.folderPath,
        result,
        dataset,
        sourceFilePath: useAppStore.getState().fileInfo?.filePath ?? ''
      })
      if (res.ok) {
        setLocalExportStatus('done')
        setExportMessage(res.outputPath ?? null)
      } else {
        setLocalExportStatus('error')
        setExportMessage(res.error ?? 'Export failed.')
      }
    } catch (err) {
      setLocalExportStatus('error')
      setExportMessage(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">AP Aging Report</div>
        <nav className="sidebar-nav">
          <NavItem label="Overview" active={page === 'overview'} onClick={() => setPage('overview')} />
          <NavItem label="Aging by Category" active={page === 'byCategory'} onClick={() => setPage('byCategory')} />
          <NavItem label="Aging by Account" active={page === 'byAccount'} onClick={() => setPage('byAccount')} />
          <NavItem label="Source Data" active={page === 'sourceData'} onClick={() => setPage('sourceData')} />
        </nav>
        <button className="btn" style={{ margin: 14 }} onClick={reset}>
          New Report
        </button>
      </aside>

      <div className="main-area">
        <header className="app-header">
          <span className="file-name">{dataset.fileName}</span>
          <span className="meta">Aging calculated as of: {formatDateDisplay(dataset.agingDateIso)}</span>
          <span className="meta">Currency: {dataset.currency}</span>
          <div className="spacer" />
          {exportStatus === 'done' && exportMessage && (
            <span className="meta" style={{ color: 'var(--success)' }}>
              Exported: {exportMessage}
            </span>
          )}
          {exportStatus === 'error' && exportMessage && (
            <span className="meta" style={{ color: 'var(--danger)' }}>
              {exportMessage}
            </span>
          )}
          <button className="btn btn-primary" onClick={handleExport} disabled={exportStatus === 'exporting'}>
            {exportStatus === 'exporting' ? 'Exporting…' : 'Export'}
          </button>
        </header>

        <div className="page-content">
          {page === 'overview' && <Overview result={result} />}
          {page === 'byCategory' && <AgingByCategory result={result} />}
          {page === 'byAccount' && <AgingByAccount result={result} />}
          {page === 'sourceData' && <SourceData dataset={dataset} />}
        </div>
      </div>

      <DrilldownModal />
    </div>
  )
}

function NavItem({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): JSX.Element {
  return (
    <button className={`sidebar-nav-item ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  )
}

function formatDateDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
