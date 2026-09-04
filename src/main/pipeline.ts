import { Worker } from 'node:worker_threads'
import { join } from 'node:path'
import { loadWorkbook } from '@core/excel/reader'
import { Dataset, PipelineResult } from '@core/types'
import type { PipelineProgressEvent, RunPipelineRequest } from '@shared/ipc-contract'

export async function inspectWorkbook(filePath: string) {
  const workbook = await loadWorkbook(filePath)
  const suggested = workbook.sheets.find((s) => s.looksLikeDataSheet)?.name
  return { sheets: workbook.sheets, suggestedSheet: suggested }
}

export interface PipelineRunOutcome {
  ok: boolean
  error?: string
  dataset?: Dataset
  result?: PipelineResult
}

function workerEntryPath(): string {
  // electron-vite always builds the main process to out/main (dev and
  // prod alike), so __dirname reliably points there and the worker's
  // compiled sibling is always worker/parse-worker.js.
  return join(__dirname, 'worker/parse-worker.js')
}

export function runPipelineInWorker(
  request: RunPipelineRequest,
  onProgress: (evt: PipelineProgressEvent) => void
): Promise<PipelineRunOutcome> {
  return new Promise((resolvePromise) => {
    let settled = false
    const worker = new Worker(workerEntryPath(), { workerData: request })

    worker.on('message', (msg: any) => {
      if (msg.kind === 'progress') {
        onProgress({ stage: msg.stage, message: msg.message })
      } else if (msg.kind === 'done') {
        settled = true
        resolvePromise({ ok: true, dataset: msg.dataset, result: msg.result })
        void worker.terminate()
      } else if (msg.kind === 'error') {
        settled = true
        onProgress({ stage: 'error', message: msg.message })
        resolvePromise({ ok: false, error: msg.message })
        void worker.terminate()
      }
    })

    worker.on('error', (err) => {
      if (settled) return
      settled = true
      onProgress({ stage: 'error', message: err.message })
      resolvePromise({ ok: false, error: err.message })
    })

    worker.on('exit', (code) => {
      if (settled) return
      settled = true
      resolvePromise({ ok: false, error: `Worker exited unexpectedly (code ${code}).` })
    })
  })
}
