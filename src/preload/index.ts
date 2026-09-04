import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type {
  ChooseDestinationFolderResult,
  ExportReportRequest,
  ExportReportResponse,
  InspectWorkbookRequest,
  InspectWorkbookResult,
  OpenFileDialogResult,
  PipelineProgressEvent,
  PreloadApi,
  RunPipelineRequest,
  RunPipelineResponse
} from '@shared/ipc-contract'

/**
 * The only surface the renderer can reach. No Node globals, no filesystem
 * access, no arbitrary IPC channel — just this typed set of calls (section
 * 29: the renderer never touches the filesystem directly).
 */
const api: PreloadApi = {
  openFileDialog: () => ipcRenderer.invoke(IPC.openFileDialog) as Promise<OpenFileDialogResult>,
  inspectWorkbook: (req: InspectWorkbookRequest) =>
    ipcRenderer.invoke(IPC.inspectWorkbook, req) as Promise<InspectWorkbookResult>,
  runPipeline: (req: RunPipelineRequest) => ipcRenderer.invoke(IPC.runPipeline, req) as Promise<RunPipelineResponse>,
  onPipelineProgress: (cb: (evt: PipelineProgressEvent) => void) => {
    const listener = (_: unknown, evt: PipelineProgressEvent): void => cb(evt)
    ipcRenderer.on(IPC.pipelineProgress, listener)
    return () => ipcRenderer.removeListener(IPC.pipelineProgress, listener)
  },
  chooseDestinationFolder: () =>
    ipcRenderer.invoke(IPC.chooseDestinationFolder) as Promise<ChooseDestinationFolderResult>,
  exportReport: (req: ExportReportRequest) => ipcRenderer.invoke(IPC.exportReport, req) as Promise<ExportReportResponse>,
  getAppVersion: () => ipcRenderer.invoke(IPC.getAppVersion) as Promise<string>
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('api', api)
} else {
  // @ts-expect-error fallback for contextIsolation disabled (never expected in production)
  window.api = api
}
