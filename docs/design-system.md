# Kinetic Dark Health — Design System Reference

Este documento formaliza as regras visuais, tokens e padrões de UI/UX do **Fit-Tracker**, garantindo coerência em todas as telas desenvolvidas.

---

## 1. Filosofia Visual (Kinetic Dark Health)
- **Tom de Marca:** Atlético, pro-grade, instrumental e cirúrgico. Remete à telemetria de alta performance e monitores de métricas esportivas (estilo watchOS e monitores biométricos).
- **Abordagem de Superfície:** Fundo ultra escuro contínuo (`#10141a`) com camadas estratificadas em cinzas profundos (`#181c22` a `#31353c`) e bordas nítidas de 1px (`#30363d`).
- **Fotônica Semântica (Luminescence):** Os macronutrientes funcionam como canais luminosos autoiluminados sobre a escuridão absoluta.

---

## 2. Canais Semânticos de Métricas

| Canal | Função Biológica | Cor Base | Cor Ativa / Neon | Container / Glow |
| :--- | :--- | :--- | :--- | :--- |
| **Primário** | Proteína / Síntese Muscular | `#10b981` | `#4edea3` | `rgba(16, 185, 129, 0.25)` |
| **Secundário** | Hidratação / Consumo de Água | `#03b5d3` | `#4cd7f6` | `rgba(76, 215, 246, 0.25)` |
| **Terciário** | Energia / Calorias & Gasto | `#ff7e2d` | `#ffb690` | `rgba(255, 126, 45, 0.25)` |

---

## 3. Escala de Superfícies & Profundidade

- **`colors.background` / `colors.surface` (`#10141a`):** Canvas de base profundo (máxima economia OLED).
- **`colors.surfaceLowest` (`#0a0e14`):** Fundo translúcido do cabeçalho superior e da barra de navegação inferior.
- **`colors.surfaceLow` (`#181c22`):** Camada padrão de cards estruturais.
- **`colors.surfaceContainer` (`#1c2026`):** Trilhas de progresso e pílulas embutidas nos cards.
- **`colors.surfaceHigh` (`#262a31`):** Badges de status, dias ativos e estados selecionados.
- **`colors.surfaceHighest` (`#31353c`):** Trilhas de barras horizontais e contornos secundários.
- **`colors.strokeCrisp` (`#30363d`):** Borda estrutural de 1px aplicada a todos os cards elevados.

---

## 4. Tipografia

A tipografia utiliza números tabulares claros para evitar saltos visuais em contadores e dita a hierarquia:

- **`headlineLg` (32px / 38px line / 700):** Títulos principais.
- **`headlineMd` (24px / 30px line / 700):** Cabeçalhos de seção.
- **`headlineSm` (20px / 26px line / 600):** Título do app e nomes de métricas nos cards.
- **`metricNumeralLg` (28px / 32px line / 800):** Valor numérico central dos gráficos de rosca e totais diários.
- **`metricNumeralSm` (18px / 22px line / 700):** Números em tabelas, listagens e linhas de resumo.
- **`bodyLg` (16px / 24px line / 400):** Texto de leitura longo.
- **`bodyMd` (14px / 20px line / 400):** Textos descritivos e subtítulos.
- **`labelMd` (13px / 16px line / 600):** Labels de botões e cartões de métrica.
- **`labelSm` (11px / 14px line / 600):** Dias da semana, status badges e tags de contexto.
- **`unitCaption` (10px / 12px line / 700):** Unidades (`g`, `ml`, `kcal`, `left`) em caixa alta com tracking aberto.

---

## 5. Espaçamentos & Raios de Borda

- **Gaps e Margens:**
  - `spacing.xs`: 4px (espaçamento entre número e unidade ou indicador e texto)
  - `spacing.sm`: 8px (distância entre rótulo e barra de progresso)
  - `spacing.gutterMobile`: 12px (espaço entre as duas colunas de cards de rosca)
  - `spacing.md`: 16px (margem externa da tela e padding interno padrão dos cards)
  - `spacing.lg`: 24px (espaçamento vertical entre grandes blocos)
  - `spacing.xl`: 32px (respiro inferior e separação de seções)

- **Raios de Borda (`radii`):**
  - `radii.sm`: 4px (badges pequenas)
  - `radii.md`: 8px (tags, caixas de dias da semana no calendário)
  - `radii.lg`: 12px (botões de ação e ícones de avatar)
  - `radii.xl`: 16px (cards de conteúdo padrão e cards de macro)
  - `radii.full`: 9999px (pílulas de status, botão FAB flutuante e medidores circulares)

---

## 6. Padrões de Componentes

1. **DonutChartCard:** Gráfico de rosca SVG desacoplado que renderiza o valor restante no centro e a barra de meta concluída logo abaixo, suportando qualquer canal semântico (`primary` para Proteína, `secondary` para Água).
2. **WeeklyConsistencyCard:** Dashboard de 7 dias com círculos/quadrados com cantos arredondados contendo ícones de `check` para metas batidas e traços para dias incompletos.
3. **CTA de Ação Rápida:** Botão de largura total com gradiente esmeralda (`#4edea3` -> `#10b981`) e sombra com photonic bloom para acesso imediato ao registro de refeição/água.
4. **TabBar Flutuante Nativa:** Barra inferior com efeito de vidro fosco (`#0a0e14` com opacidade), ícones de 22px e botão central de inclusão rápida (FAB) suspenso e destacado em verde néon.
