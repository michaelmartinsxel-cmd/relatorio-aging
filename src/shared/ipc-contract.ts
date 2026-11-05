/**
 * Typed IPC contract shared between main, preload and renderer.
 * The renderer never touches the filesystem directly — every filesystem
 * or workbook operation goes through one of these channels.
 */
import type {
  AgingDateChoice,
  ColumnMapping,
  Currency,
  Dataset,
  IncompleteDataPolicy,
  PipelineResult,
  SheetSummary
} from '@core/types'

export const IPC = {
  openFileDialog: 'file:open-dialog',
  inspectWorkbook: 'file:inspect-workbook',
  chooseSheet: 'file:choose-sheet',
  runPipeline: 'pipeline:run',
  pipelineProgress: 'pipeline:progress',
  chooseDestinationFolder: 'export:choose-folder',
  exportReport: 'export:run',
  getAppVersion: 'app:version'
} as const

export interface OpenFileDialogResult {
  canceled: boolean
  filePath?: string
  fileName?: string
  fileSizeBytes?: number
  importedAt?: string
}

export interface InspectWorkbookRequest {
  filePath: string
}

export interface InspectWorkbookResult {
  sheets: SheetSummary[]
  suggestedSheet?: string
}

export interface RunPipelineRequest {
  filePath: string
  sheetName: string
  headerRow: number
  columnMapping: ColumnMapping
  agingDate: AgingDateChoice
  incompleteDataPolicy: IncompleteDataPolicy
  currencyChoice?: Currency
}

export type PipelineStage =
  | 'reading'
  | 'validating'
  | 'calculating'
  | 'reconciling'
  | 'generating'
  | 'ready'
  | 'error'

export interface PipelineProgressEvent {
  stage: PipelineStage
  message?: string
}

export interface RunPipelineResponse {
  ok: boolean
  error?: string
  result?: PipelineResult
  dataset?: Dataset
}

export interface ChooseDestinationFolderResult {
  canceled: boolean
  folderPath?: string
}

export interface ExportReportRequest {
  destinationFolder: string
  result: PipelineResult
  dataset: Dataset
  sourceFilePath: string
}

export interface ExportReportResponse {
  ok: boolean
  error?: string
  outputPath?: string
}

/** Surface exposed on window.api via the preload contextBridge. */
export interface PreloadApi {
  openFileDialog: () => Promise<OpenFileDialogResult>
  inspectWorkbook: (req: InspectWorkbookRequest) => Promise<InspectWorkbookResult>
  runPipeline: (req: RunPipelineRequest) => Promise<RunPipelineResponse>
  onPipelineProgress: (cb: (evt: PipelineProgressEvent) => void) => () => void
  chooseDestinationFolder: () => Promise<ChooseDestinationFolderResult>
  exportReport: (req: ExportReportRequest) => Promise<ExportReportResponse>
  getAppVersion: () => Promise<string>
}
