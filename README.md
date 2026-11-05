# AP Aging Report Generator

Aplicativo desktop (Electron/Windows) que gera automaticamente **Aging by
Category**, **Aging by Account** e um **Overview** executivo a partir de uma
base Excel de AP já classificada.

A classificação existente no arquivo é sempre a fonte oficial: o app apenas
lê, agrupa e apresenta — nunca cria, altera ou infere categorias/contas, e o
arquivo original nunca é modificado.

## Fluxo

```
Upload → Sheet/Mapping → Aging Date → Calculate → Reconcile → Overview / Aging by Category / Aging by Account → Export
```

## Stack

- Electron + electron-vite + React + TypeScript
- ExcelJS (leitura/escrita `.xlsx`/`.xlsm`), SheetJS (`.xls` legado), PapaParse (`.csv`)
- Zustand para estado da UI, Recharts para os gráficos da tela
- Vitest para testes unitários e de integração do núcleo (`src/core`)

## Desenvolvimento

```bash
npm install
npm run dev          # app em modo desenvolvimento
npm test             # suíte de testes (unit + integração)
npm run typecheck    # checagem de tipos (main/preload/core + renderer)
npm run gen:fixtures # regenera as planilhas sintéticas de teste em tests/fixtures
npm run package:win  # gera o instalador NSIS para Windows em release/
```

## Arquitetura

Toda a lógica de negócio vive em `src/core/` — puro TypeScript, sem
dependência de Electron ou React, testável isoladamente com Vitest:

- `core/excel/reader.ts` — leitura somente-leitura do workbook (sem macros, sem links externos)
- `core/parse/` — parsers de data (serial Excel, ambiguidade dd/mm vs mm/dd) e valor monetário (pt-BR, en-US, SAP)
- `core/mapping/detect.ts` — reconhecimento automático de colunas
- `core/aging/` — cálculo de Days Past Due e atribuição de buckets
- `core/aggregation/` — Aging by Category, Aging by Account, Overview, filtros
- `core/reconciliation/reconcile.ts` — o gate obrigatório: `Total Source = Total Aging = Total by Category = Total by Account`
- `core/export/` — geração do `.xlsx` de saída (ExcelJS) com gráficos nativos injetados via OOXML

O processo `main` do Electron orquestra tudo isso a partir de um
`worker_thread` (para não travar a UI em arquivos grandes), expõe apenas uma
superfície IPC tipada (`src/shared/ipc-contract.ts`) e é o único lugar que
toca o sistema de arquivos — o renderer nunca acessa disco diretamente.

## Reconciliação

Antes de qualquer relatório ser apresentado como confiável, o app valida:

- `Total Source = Total Aging`
- `Total Aging by Category = Total Source`
- `Total Aging by Account = Total Source`

Se qualquer verificação falhar (por exemplo, linhas com Due Date ausente ou
inválido, que não recebem bucket), a interface exibe **RECONCILIATION
ERROR** com Expected / Calculated / Difference — a diferença nunca é
ocultada.

## Fora de escopo (v1)

Classification Engine, reclassificação automática, Supplier Risk, Payment/Cash
Forecast, AR Aging, Working Capital, DPO/DSO, edição da base de origem.
