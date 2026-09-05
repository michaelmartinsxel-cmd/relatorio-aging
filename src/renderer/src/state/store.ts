import { create } from 'zustand'
import type {
  AgingDateChoice,
  ColumnMapping,
  Dataset,
  Filters,
  IncompleteDataPolicy,
  PipelineResult,
  SheetSummary
} from '@core/types'
import type { PipelineStage } from '@shared/ipc-contract'

export type AppStage = 'upload' | 'sheet' | 'mapping' | 'agingDate' | 'processing' | 'result' | 'error'

interface FileInfo {
  filePath: string
  fileName: string
  fileSizeBytes: number
  importedAt: string
}

export interface DrilldownSelection {
  kind: 'category' | 'account' | 'bucketWithinCategory' | 'bucketWithinAccount'
  category?: string
  account?: string
  bucket?: string
}

interface AppState {
  stage: AppStage
  errorMessage: string | null

  fileInfo: FileInfo | null
  sheets: SheetSummary[]
  selectedSheet: string | null

  columnMapping: ColumnMapping
  unmappedRequiredFields: string[]

  agingDateChoice: AgingDateChoice
  incompleteDataPolicy: IncompleteDataPolicy
  currencyChoice?: string

  progressStage: PipelineStage | null

  dataset: Dataset | null
  result: PipelineResult | null

  filters: Filters
  drilldown: DrilldownSelection | null

  exportStatus: 'idle' | 'choosing' | 'exporting' | 'done' | 'error'
  exportOutputPath: string | null
  exportError: string | null

  setStage: (stage: AppStage) => void
  setError: (message: string) => void
  setFileInfo: (info: FileInfo) => void
  setSheets: (sheets: SheetSummary[], suggested?: string) => void
  setSelectedSheet: (name: string) => void
  setColumnMapping: (mapping: ColumnMapping, unmapped: string[]) => void
  setAgingDateChoice: (choice: AgingDateChoice) => void
  setIncompleteDataPolicy: (policy: IncompleteDataPolicy) => void
  setCurrencyChoice: (currency: string | undefined) => void
  setProgressStage: (stage: PipelineStage) => void
  setPipelineOutcome: (dataset: Dataset, result: PipelineResult) => void
  setFilters: (filters: Filters) => void
  clearFilters: () => void
  setDrilldown: (sel: DrilldownSelection | null) => void
  setExportStatus: (status: AppState['exportStatus'], outputPath?: string | null, error?: string | null) => void
  reset: () => void
}

const initialState = {
  stage: 'upload' as AppStage,
  errorMessage: null,
  fileInfo: null,
  sheets: [],
  selectedSheet: null,
  columnMapping: {} as ColumnMapping,
  unmappedRequiredFields: [] as string[],
  agingDateChoice: { kind: 'today' } as AgingDateChoice,
  incompleteDataPolicy: { treatBlankCategoryAsUnclassified: false } as IncompleteDataPolicy,
  currencyChoice: undefined as string | undefined,
  progressStage: null,
  dataset: null,
  result: null,
  filters: {} as Filters,
  drilldown: null,
  exportStatus: 'idle' as const,
  exportOutputPath: null,
  exportError: null
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setStage: (stage) => set({ stage }),
  setError: (message) => set({ stage: 'error', errorMessage: message }),
  setFileInfo: (info) => set({ fileInfo: info }),
  setSheets: (sheets, suggested) => set({ sheets, selectedSheet: suggested ?? sheets[0]?.name ?? null }),
  setSelectedSheet: (name) => set({ selectedSheet: name }),
  setColumnMapping: (mapping, unmapped) => set({ columnMapping: mapping, unmappedRequiredFields: unmapped }),
  setAgingDateChoice: (choice) => set({ agingDateChoice: choice }),
  setIncompleteDataPolicy: (policy) => set({ incompleteDataPolicy: policy }),
  setCurrencyChoice: (currency) => set({ currencyChoice: currency }),
  setProgressStage: (stage) => set({ progressStage: stage }),
  setPipelineOutcome: (dataset, result) => set({ dataset, result, stage: 'result', progressStage: 'ready' }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
  setDrilldown: (sel) => set({ drilldown: sel }),
  setExportStatus: (status, outputPath = null, error = null) =>
    set({ exportStatus: status, exportOutputPath: outputPath, exportError: error }),
  reset: () => set({ ...initialState })
}))
