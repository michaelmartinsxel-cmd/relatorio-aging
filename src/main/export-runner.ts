import { rename, writeFile, mkdtemp } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { buildReportWorkbook } from '@core/export/workbook'
import { injectOverviewCharts } from '@core/export/charts'
import type { ExportReportRequest, ExportReportResponse } from '@shared/ipc-contract'

export async function runExport(req: ExportReportRequest): Promise<ExportReportResponse> {
  const destinationFolder = resolve(req.destinationFolder)
  const sourcePath = resolve(req.sourceFilePath)

  const timestamp = formatTimestamp(new Date())
  const outputFileName = `AP_Aging_Report_${timestamp}.xlsx`
  const outputPath = join(destinationFolder, outputFileName)

  if (resolve(outputPath) === sourcePath) {
    return { ok: false, error: 'The destination file cannot overwrite the original source file.' }
  }

  try {
    const { workbook, chartAnchors } = buildReportWorkbook(req.dataset, req.result)
    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer
    const withCharts = await injectOverviewCharts(buffer, chartAnchors)

    // Atomic write: temp file in the same target directory, then rename.
    const tempDir = await mkdtemp(join(tmpdir(), 'ap-aging-'))
    const tempPath = join(tempDir, outputFileName)
    await writeFile(tempPath, withCharts)
    await rename(tempPath, outputPath)

    return { ok: true, outputPath }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function formatTimestamp(d: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`
}
