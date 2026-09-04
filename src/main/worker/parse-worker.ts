/**
 * Runs the heavy part of the pipeline (workbook read -> aging calculation
 * -> aggregation -> reconciliation) off the main thread, so large files
 * (section 28) never freeze the UI or IPC dispatch. Communicates purely by
 * message passing; it touches the filesystem (read-only) and nothing else.
 */
import { parentPort, workerData } from 'node:worker_threads'
import { loadWorkbook } from '@core/excel/reader'
import { buildDataset, runPipeline } from '@core/pipeline'
import { parseDateCell } from '@core/parse/date'
import { AgingDateChoice, ColumnMapping, IncompleteDataPolicy } from '@core/types'
import type { PipelineStage } from '@shared/ipc-contract'

export interface ParseWorkerInput {
  filePath: string
  sheetName: string
  headerRow: number
  columnMapping: ColumnMapping
  agingDate: AgingDateChoice
  incompleteDataPolicy: IncompleteDataPolicy
  currencyChoice?: string
}

function post(stage: PipelineStage, message?: string): void {
  parentPort?.postMessage({ kind: 'progress', stage, message })
}

async function main(): Promise<void> {
  const input = workerData as ParseWorkerInput

  try {
    post('reading')
    const workbook = await loadWorkbook(input.filePath)
    const records = workbook.getSheetRows(input.sheetName, input.headerRow)

    post('validating')
    const agingDateIso = resolveAgingDate(input.agingDate, records)

    post('calculating')
    const dataset = buildDataset({
      fileName: input.filePath.split(/[\\/]/).pop() ?? input.filePath,
      sheetName: input.sheetName,
      records,
      mapping: input.columnMapping,
      agingDateIso,
      policy: input.incompleteDataPolicy,
      currencyOverride: input.currencyChoice
    })

    post('reconciling')
    const result = runPipeline(dataset)

    post('ready')
    parentPort?.postMessage({ kind: 'done', dataset, result })
  } catch (err) {
    parentPort?.postMessage({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}

function resolveAgingDate(choice: AgingDateChoice, records: { values: Record<string, unknown> }[]): string {
  if (choice.kind === 'manual') return choice.isoDate
  if (choice.kind === 'today') return new Date().toISOString().slice(0, 10)
  // fromFile: take the first non-empty value in the given column
  for (const r of records) {
    const v = r.values[choice.column]
    if (v) {
      const iso = parseDateCell(v)
      if (iso) return iso
    }
  }
  return new Date().toISOString().slice(0, 10)
}

void main()
