import { BrowserWindow, dialog } from 'electron'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'

export async function showOpenFileDialog(window: BrowserWindow): Promise<
  | { canceled: true }
  | { canceled: false; filePath: string; fileName: string; fileSizeBytes: number; importedAt: string }
> {
  const res = await dialog.showOpenDialog(window, {
    title: 'Select the AP source Excel file',
    properties: ['openFile'],
    filters: [
      { name: 'Excel Workbook', extensions: ['xlsx', 'xlsm'] },
      { name: 'Legacy Excel', extensions: ['xls'] },
      { name: 'CSV', extensions: ['csv'] }
    ]
  })
  if (res.canceled || res.filePaths.length === 0) return { canceled: true }

  const filePath = res.filePaths[0]
  const stats = await stat(filePath)
  return {
    canceled: false,
    filePath,
    fileName: basename(filePath),
    fileSizeBytes: stats.size,
    importedAt: new Date().toISOString()
  }
}

export async function showChooseFolderDialog(
  window: BrowserWindow
): Promise<{ canceled: true } | { canceled: false; folderPath: string }> {
  const res = await dialog.showOpenDialog(window, {
    title: 'Choose the destination folder for the report',
    properties: ['openDirectory', 'createDirectory']
  })
  if (res.canceled || res.filePaths.length === 0) return { canceled: true }
  return { canceled: false, folderPath: res.filePaths[0] }
}
