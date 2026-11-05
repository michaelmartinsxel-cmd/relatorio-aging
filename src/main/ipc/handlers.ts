import { BrowserWindow, app, ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { ExportReportRequest, RunPipelineRequest } from '@shared/ipc-contract'
import { showChooseFolderDialog, showOpenFileDialog } from '../dialogs'
import { inspectWorkbook, runPipelineInWorker } from '../pipeline'
import { runExport } from '../export-runner'

export function registerIpcHandlers(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(IPC.openFileDialog, async () => {
    const win = getWindow()
    if (!win) return { canceled: true }
    return showOpenFileDialog(win)
  })

  ipcMain.handle(IPC.inspectWorkbook, async (_evt, req: { filePath: string }) => {
    return inspectWorkbook(req.filePath)
  })

  ipcMain.handle(IPC.runPipeline, async (evt, req: RunPipelineRequest) => {
    const outcome = await runPipelineInWorker(req, (progress) => {
      evt.sender.send(IPC.pipelineProgress, progress)
    })
    if (!outcome.ok) return { ok: false, error: outcome.error }
    return { ok: true, dataset: outcome.dataset, result: outcome.result }
  })

  ipcMain.handle(IPC.chooseDestinationFolder, async () => {
    const win = getWindow()
    if (!win) return { canceled: true }
    return showChooseFolderDialog(win)
  })

  ipcMain.handle(IPC.exportReport, async (_evt, req: ExportReportRequest) => {
    return runExport(req)
  })

  ipcMain.handle(IPC.getAppVersion, () => app.getVersion())
}
