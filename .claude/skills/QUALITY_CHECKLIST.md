# Quality Checklist — Excel

Marcar cada item como PASS / FAIL / N/A antes da entrega.

## Estrutura
- [ ] Arquivo exportado e reaberto corretamente.
- [ ] Abas críticas preservadas.
- [ ] Tabelas e nomes definidos críticos preservados.
- [ ] Nenhum recurso crítico foi removido inadvertidamente.

## Fórmulas
- [ ] Sem novos `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?` ou `#N/A` inesperados.
- [ ] Fórmulas alteradas seguem o padrão lógico esperado.
- [ ] Totais/subtotais cobrem os ranges corretos.
- [ ] Derived values continuam dinâmicos quando deveriam ser.

## Dados
- [ ] Contagem de registros reconciliada.
- [ ] Chaves/duplicidades validadas.
- [ ] Datas e números mantiveram tipos corretos.
- [ ] Valores financeiros reconciliam com a fonte.

## Visual
- [ ] Gráficos alterados renderizam com dados.
- [ ] Nenhum objeto cobre conteúdo crítico.
- [ ] Headers e valores estão legíveis.
- [ ] Formatos de moeda/data/% estão corretos.

## Auditoria
- [ ] Change log concluído.
- [ ] Alterações automáticas têm evidência suficiente.
- [ ] Ambiguidades estão em REVIEW_REQUIRED.
- [ ] Anomalias pré-existentes estão separadas de erros introduzidos.

## Aging/AP quando aplicável
- [ ] `as_of_date` definida.
- [ ] Buckets sem gap/overlap.
- [ ] Soma dos buckets = população aplicável.
- [ ] Créditos/pagamentos parciais tratados corretamente.
- [ ] Top suppliers/KPIs reconciliam com a base.
