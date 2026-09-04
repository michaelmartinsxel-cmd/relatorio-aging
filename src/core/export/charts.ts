/**
 * Injects native OOXML chart parts into the .xlsx buffer produced by
 * ExcelJS, which does not itself support writing charts. Every chart is
 * bound to a real, non-empty data range already written to the Overview
 * sheet (see export/workbook.ts ChartAnchorInfo) — never an empty chart,
 * never a dangling reference (section 27).
 */
import JSZip from 'jszip'
import { ChartAnchorInfo } from '@core/export/workbook'

interface ChartSpec {
  id: number
  title: string
  type: 'bar' | 'pie'
  catRange: string
  dataRange: string
  anchorCell: string
}

const CONTENT_TYPES_CHART = '<Override PartName="/xl/charts/chart{ID}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'
const CONTENT_TYPES_DRAWING = '<Override PartName="/xl/drawings/drawing{ID}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'

export async function injectOverviewCharts(xlsxBuffer: Buffer, anchors: ChartAnchorInfo): Promise<Buffer> {
  const zip = await JSZip.loadAsync(xlsxBuffer)

  const specs: ChartSpec[] = [
    {
      id: 1,
      title: 'Aging Distribution',
      type: 'bar',
      catRange: anchors.agingDistribution.catRange,
      dataRange: anchors.agingDistribution.dataRange,
      anchorCell: anchors.agingDistribution.anchorCell
    },
    {
      id: 2,
      title: 'Exposure by Category',
      type: 'pie',
      catRange: anchors.exposureByCategory.catRange,
      dataRange: anchors.exposureByCategory.dataRange,
      anchorCell: anchors.exposureByCategory.anchorCell
    },
    {
      id: 3,
      title: 'Overdue vs Not Due',
      type: 'pie',
      catRange: anchors.overdueVsNotDue.catRange,
      dataRange: anchors.overdueVsNotDue.dataRange,
      anchorCell: anchors.overdueVsNotDue.anchorCell
    }
  ]

  const overviewSheetPath = await findOverviewSheetPath(zip)
  const overviewSheetXml = await zip.file(overviewSheetPath)!.async('string')

  // 1. chart{n}.xml parts
  for (const spec of specs) {
    zip.file(`xl/charts/chart${spec.id}.xml`, buildChartXml(spec))
  }

  // 2. one drawing part anchoring all three charts on the Overview sheet
  zip.file('xl/drawings/drawing1.xml', buildDrawingXml(specs))
  zip.file(
    'xl/drawings/_rels/drawing1.xml.rels',
    buildDrawingRels(specs)
  )

  // 3. chart rels (each chart part needs a (mostly empty) rels file for style/colors — optional, so we omit and keep minimal valid charts)

  // 4. wire the worksheet to the drawing
  const sheetRelsPath = overviewSheetPath.replace('worksheets/', 'worksheets/_rels/') + '.rels'
  const existingSheetRels = zip.file(sheetRelsPath)
  const drawingRId = 'rIdDrawing1'
  if (existingSheetRels) {
    const relsXml = await existingSheetRels.async('string')
    const updated = relsXml.replace(
      '</Relationships>',
      `<Relationship Id="${drawingRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`
    )
    zip.file(sheetRelsPath, updated)
  } else {
    zip.file(
      sheetRelsPath,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="${drawingRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`
    )
  }

  const sheetWithDrawing = overviewSheetXml.includes('</worksheet>')
    ? overviewSheetXml.replace('</worksheet>', `<drawing r:id="${drawingRId}"/></worksheet>`)
    : overviewSheetXml
  zip.file(overviewSheetPath, sheetWithDrawing)

  // 5. Content_Types
  const contentTypesPath = '[Content_Types].xml'
  const contentTypesXml = await zip.file(contentTypesPath)!.async('string')
  let updatedContentTypes = contentTypesXml
  for (const spec of specs) {
    updatedContentTypes = updatedContentTypes.replace(
      '</Types>',
      CONTENT_TYPES_CHART.replace('{ID}', String(spec.id)) + '</Types>'
    )
  }
  updatedContentTypes = updatedContentTypes.replace(
    '</Types>',
    CONTENT_TYPES_DRAWING.replace('{ID}', '1') + '</Types>'
  )
  zip.file(contentTypesPath, updatedContentTypes)

  const out = await zip.generateAsync({ type: 'nodebuffer' })
  return out
}

async function findOverviewSheetPath(zip: JSZip): Promise<string> {
  const workbookXml = await zip.file('xl/workbook.xml')!.async('string')
  const relsXml = await zip.file('xl/_rels/workbook.xml.rels')!.async('string')

  const sheetMatch = /<sheet[^>]*name="Overview"[^>]*r:id="(rId\d+)"/.exec(workbookXml)
  if (!sheetMatch) throw new Error('Overview sheet not found in generated workbook.')
  const rId = sheetMatch[1]

  const relMatch = new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]+)"`).exec(relsXml)
  if (!relMatch) throw new Error('Could not resolve Overview sheet relationship.')
  const target = relMatch[1].replace(/^\.?\//, '')
  return `xl/${target}`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildChartXml(spec: ChartSpec): string {
  const seriesXml =
    spec.type === 'bar'
      ? `<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:v>${esc(spec.title)}</c:v></c:tx>
          <c:cat><c:strRef><c:f>${esc(spec.catRange)}</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>${esc(spec.dataRange)}</c:f></c:numRef></c:val>
        </c:ser><c:axId val="111111111"/><c:axId val="222222222"/></c:barChart>
        <c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>
        <c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/></c:valAx>`
      : `<c:pieChart><c:varyColors val="1"/><c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:v>${esc(spec.title)}</c:v></c:tx>
          <c:cat><c:strRef><c:f>${esc(spec.catRange)}</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>${esc(spec.dataRange)}</c:f></c:numRef></c:val>
        </c:ser></c:pieChart>`

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title><c:tx><c:rich><a:bodyPr/><a:p><a:r><a:t>${esc(spec.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea><c:layout/>${seriesXml}</c:plotArea>
    <c:legend><c:legendPos val="b"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`
}

function buildDrawingXml(specs: ChartSpec[]): string {
  const anchors = specs
    .map((spec, i) => {
      const { col, row } = cellToColRow(spec.anchorCell)
      return `<xdr:twoCellAnchor>
        <xdr:from><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
        <xdr:to><xdr:col>${col + 6}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row + 14}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
        <xdr:graphicFrame macro="">
          <xdr:nvGraphicFramePr>
            <xdr:cNvPr id="${i + 2}" name="Chart ${spec.id}"/>
            <xdr:cNvGraphicFramePr/>
          </xdr:nvGraphicFramePr>
          <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
          <a:graphic>
            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
              <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rIdChart${spec.id}"/>
            </a:graphicData>
          </a:graphic>
        </xdr:graphicFrame>
        <xdr:clientData/>
      </xdr:twoCellAnchor>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
${anchors}
</xdr:wsDr>`
}

function buildDrawingRels(specs: ChartSpec[]): string {
  const rels = specs
    .map(
      (spec) =>
        `<Relationship Id="rIdChart${spec.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${spec.id}.xml"/>`
    )
    .join('')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels}</Relationships>`
}

function cellToColRow(cell: string): { col: number; row: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(cell)
  if (!m) return { col: 0, row: 0 }
  const letters = m[1]
  let col = 0
  for (let i = 0; i < letters.length; i++) col = col * 26 + (letters.charCodeAt(i) - 64)
  return { col: col - 1, row: Number(m[2]) - 1 }
}
