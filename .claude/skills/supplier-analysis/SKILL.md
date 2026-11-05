---
name: supplier-analysis
description: "Analisa exposição, concentração e comportamento por fornecedor."
---

# Supplier Analysis

Analisa exposição, concentração e comportamento por fornecedor.


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

## Métricas possíveis
- Total aberto.
- Total vencido.
- % vencido.
- Bucket médio/idade média ponderada.
- Quantidade de documentos.
- Concentração no total.
- Top invoices e exceções.

## Regras
- Normalizar aliases do fornecedor somente com mapeamento confiável.
- Evitar somar moedas diferentes sem regra de conversão.
- Separar fornecedor com saldo crédito quando necessário.
