# Excel Agent Skills — Biblioteca modular

Pacote de skills para agentes de IA que criam, modificam, auditam, conciliam e validam planilhas Excel.

## Como usar

Use `00-excel-orchestrator/SKILL.md` como porta de entrada. O orquestrador deve selecionar as skills especializadas conforme a tarefa. Em workbooks existentes, `excel-workbook-inspector` deve ser executada antes de qualquer escrita e `excel-quality-control` deve ser executada antes de toda entrega final.

## Filosofia

O pacote foi desenhado para evitar os erros mais comuns de agentes em Excel: sobrescrever fórmulas com valores, destruir gráficos ou nomes definidos, perder validações, salvar gráficos vazios, alterar classificações sem base suficiente e entregar arquivos sem reconciliação ou inspeção visual.

## Grupos

**Core:** orchestrator, inspector, workbook-engine, data-editor, formulas, formatting, tables/ranges.  
**Analytics:** dashboards, charts, pivots, reconciliation, financial modeling.  
**Controls:** audit, validation, conditional formatting, render validation, preserve workbook, change log, quality control.  
**AP/Aging:** AP aging, bucket validation, classification validation, supplier analysis, payment status, executive summary.

## Sequência padrão

`Inspect → Baseline → Plan → Edit/Analyze → Recalculate → Reconcile → Render → Audit → Change Log → QC → Export`

## Arquivos de apoio

- `manifest.json`: catálogo das skills.
- `MASTER_AGENT_PROMPT.md`: prompt consolidado para configurar um agente que utilize a biblioteca.
- `QUALITY_CHECKLIST.md`: checklist de entrega.
