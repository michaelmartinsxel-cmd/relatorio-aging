---
name: 00-excel-orchestrator
description: "Coordena todas as demais skills e decide a sequência segura de trabalho para qualquer solicitação envolvendo Excel."
---

# Excel Orchestrator

Coordena todas as demais skills e decide a sequência segura de trabalho para qualquer solicitação envolvendo Excel.


## Princípios obrigatórios

1. **Preservação antes de alteração.** Ao editar workbook existente, inspecione primeiro estrutura, fórmulas, tabelas, nomes definidos, gráficos, validações, formatação condicional, objetos e dependências.
2. **Nunca substituir lógica por valores fixos** quando a planilha espera comportamento dinâmico. Valores derivados devem permanecer por fórmula sempre que aplicável.
3. **Alterações mínimas e rastreáveis.** Modifique somente o necessário e registre o que foi alterado, motivo, evidência e impacto esperado.
4. **Não confiar apenas no arquivo salvo.** Validar conteúdo, fórmulas e renderização antes da entrega.
5. **Sem adivinhações silenciosas.** Se uma classificação ou regra não puder ser comprovada, marcar como `REVIEW_REQUIRED` em vez de inventar uma conclusão.
6. **Preservar o original.** Por padrão, trabalhar em cópia e manter o arquivo-fonte inalterado.
7. **Precisão financeira.** Não arredondar valores intermediários sem regra explícita; preservar datas, moedas, sinais, casas decimais e semântica contábil.
8. **Escalabilidade.** Preferir operações em bloco, tabelas estruturadas, fórmulas preenchíveis e regras reaproveitáveis a alterações célula por célula.
9. **Compatibilidade.** Não remover recursos de Excel apenas porque a biblioteca utilizada não os entende. Se um recurso não puder ser preservado com segurança, interromper aquela alteração e registrar a limitação.
10. **Entrega verificável.** Um workbook só está concluído após inspeção estrutural, varredura de erros, validação dos principais totais e checagem visual dos elementos alterados.

## Política de ferramentas

- Em ambientes OpenAI/ChatGPT que disponibilizem `artifact_tool`, ele é a ferramenta preferencial e obrigatória para criação e edição de `.xlsx` quando as regras do host assim determinarem.
- Utilize APIs em bloco (`range.values`, `range.formulas`, `fill_down`, tabelas, inspeção e renderização) em vez de loops célula a célula.
- `openpyxl`, `pandas`, LibreOffice ou outros engines só podem ser utilizados quando o ambiente de execução explicitamente permitir. Nunca escolha uma biblioteca que possa destruir recursos existentes do workbook sem avaliar o risco.
- Não usar conversão para CSV como método de edição de um workbook complexo, pois isso elimina fórmulas, estilos, gráficos, validações e múltiplas abas.

## Acione quando
- A solicitação envolve criação, edição, correção, auditoria, análise ou entrega de um workbook.
- Há mais de uma categoria de trabalho: dados + fórmulas + gráficos + validação, por exemplo.

## Fluxo obrigatório
1. Identificar objetivo, arquivo de origem e formato esperado de saída.
2. Classificar a tarefa como `CREATE`, `EDIT`, `REPAIR`, `AUDIT`, `ANALYZE` ou `RECONCILE`.
3. Se houver workbook existente, acionar `excel-workbook-inspector` antes de qualquer escrita.
4. Criar um plano mínimo de alterações e identificar riscos de compatibilidade.
5. Acionar somente as skills necessárias.
6. Acionar `excel-quality-control` antes da exportação.
7. Acionar `excel-change-log` para registrar as alterações.
8. Entregar arquivo final e, quando solicitado, relatório paralelo de mudanças/pendências.

## Matriz de roteamento
- Fórmulas → `excel-formula-engine`
- Layout/estilo → `excel-formatting`
- Tabelas/ranges → `excel-tables-ranges`
- Gráficos → `excel-chart-engine`
- Dashboards → `excel-dashboard-builder`
- Pivot → `excel-pivot-analysis`
- Limpeza → `excel-data-cleaning`
- Validações → `excel-data-validation`
- Formatação condicional → `excel-conditional-formatting`
- Conciliação → `excel-reconciliation`
- Aging/AP → `ap-aging-analysis`
- Classificações → `classification-validation`
- Resumo executivo → `executive-summary-builder`
- Renderização → `excel-render-validation`
- Auditoria final → `excel-quality-control`
