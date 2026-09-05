import { ReconciliationReport } from '@core/types'
import { minorToMajor } from '@core/format'

export default function ReconciliationBanner({ report }: { report: ReconciliationReport }): JSX.Element | null {
  if (report.ok) {
    return <div className="reconciliation-banner ok">✓ Reconciled — all totals match.</div>
  }

  return (
    <div className="reconciliation-banner error">
      <div className="title">RECONCILIATION ERROR</div>
      <p style={{ margin: 0 }}>
        Um ou mais totais não reconciliaram. Este relatório não deve ser considerado final até que a diferença seja
        revisada (linhas com Due Date ausente/ inválido não recebem bucket e por isso são excluídas das tabelas de
        aging, embora contem no total de origem).
      </p>
      <table>
        <thead>
          <tr>
            <th className="text-left">Check</th>
            <th>Expected</th>
            <th>Calculated</th>
            <th>Difference</th>
          </tr>
        </thead>
        <tbody>
          {report.checks
            .filter((c) => !c.ok)
            .map((c) => (
              <tr key={c.name}>
                <td className="text-left">{c.name}</td>
                <td>{minorToMajor(c.expectedMinor).toFixed(2)}</td>
                <td>{minorToMajor(c.calculatedMinor).toFixed(2)}</td>
                <td>{minorToMajor(c.differenceMinor).toFixed(2)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}
