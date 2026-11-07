# FitTracker v2 — ativação e verificação

A implementação segue `../docs/Pessoal - FitTracker/FitTracker-v2-implementacao.md` (na pasta pai do repositório). O aplicativo continua usando Expo SDK 58, Expo Router, SQLite e Drizzle. O uso manual funciona sem conta; IA e nuvem são recursos separados e opcionais.

## O que foi implementado

- Nutrientes anuláveis: energia, proteína, carboidratos, gorduras, fibras, saturadas e sódio. Zero é conhecido; vazio é desconhecido. Entrada decimal com vírgula ou ponto, sem arredondar os valores gravados localmente.
- Origem global e por nutriente, canal de entrada, porção, indicação de estimativa e revisão explícita da proposta de IA. Não há pontuação metabólica ou inferência de deficiência.
- Favoritos editáveis e repetição de recentes com cópia dos valores consumidos. Porções escalam a partir da base original; g e mL não são convertidos implicitamente. Favoritos de bebidas preservam também o volume vinculado. Não se incorpora uma base alimentar externa sem verificar seus termos.
- Refeição e bebida vinculada são gravadas e excluídas em transação, com uma operação de sincronização para o grupo. O volume aparece uma vez no resumo.
- Rascunho local, incluindo imagem e texto, preservado em falha/cancelamento de IA e ao sair do formulário. O tempo total do pedido ao servidor é limitado a 20 segundos. A alternativa é desligada inicialmente; o servidor tenta no máximo dois provedores autorizados.
- Planos de metas imutáveis, data de vigência inicialmente amanhã, confirmação ao usar hoje e verificação de energia aproximada. As metas antigas são preservadas; não se atribui a meta atual a datas anteriores à primeira versão. O exemplo 2.500/120/325/80/30/2.500 é editável e exige salvar para aceitar.
- Líquidos registrados, peso, creatina opcional, treino sem cálculo de calorias gastas, contexto do dia e confirmação alimentar. Editar alimentação reabre a confirmação. O resumo também verifica a assinatura das refeições, inclusive após sincronização.
- Médias com denominador por métrica: somente dias confirmados com cobertura completa entram nas médias alimentares. Líquidos têm denominador próprio. Dias sem dados ficam ausentes; dias parciais aparecem identificados.
- Tendência de peso por médias diárias e blocos consecutivos de sete dias. A revisão pede três dias com pesagem e cinco dias confirmados com energia completa em cada semana. Duas comparações semanais persistentes fora da faixa permitem propor revisão de 100–150 kcal, nunca aplicada automaticamente. Contexto, orientação profissional, registro inicial recente de creatina e ajuste recente adiam a sugestão. A faixa percentual é configurável.
- Histórico SQL por páginas de 50, desempate por instante/ID/tipo, consultas limitadas e eventos agrupados. Respostas antigas são descartadas após mudança de período, foco ou conta. O dia local atualiza ao retornar ao aplicativo e durante a virada da data.
- Exportação de JSON com versão de esquema e restauração transacional em diário vazio, com validação, contagens e conferência dos valores. Inclui planos, favoritos, registros, rascunhos e preferências de idioma/IA; não inclui credenciais. Imagens já salvas são referências a arquivos locais, e devem ser guardadas separadamente.

## Migração local

As migrações SQL v1–v5 publicadas permanecem intactas. A v6 acrescenta entidades, índices e metadados. SQLite exige reconstruir `food_logs` para remover a obrigatoriedade de proteína e energia; a cópia preserva IDs, consumo, exclusões e valores em uma transação. Novos nutrientes antigos ficam nulos.

Antes de migrar um banco existente, o cliente cria `<nome-do-banco>.pre-v6` com `backupDatabaseSync` e executa `PRAGMA integrity_check`. Uma falha interrompe a abertura. O esquema e `user_version` mudam juntos. O primeiro plano começa na data local da migração e conserva as metas antigas. Não há como recuperar o verdadeiro horário de criação ou a procedência de antigas análises por texto: o instante anterior é preservado como consumo, e o fuso legado fica `unknown`.

## Preparar o servidor antes do cliente

1. Faça um `pg_dump` do projeto existente e restaure-o em um projeto descartável. Compare contagens, exclusões e somas por dia. Guarde uma cópia verificável antes de qualquer alteração em produção.
2. Aplique `supabase/migrations/202611060001_fittracker_v2.sql` no projeto de teste e depois no projeto de destino. `supabase/schema.sql` contém a mesma definição para bootstrap. Nunca aplique o SQL antigo de políticas abertas, mantido apenas como fixture em `tests/fixtures`.
3. A migração remove todas as políticas antigas, revoga leitura anônima e escrita direta e permite leitura autenticada somente do proprietário. Registros antigos sem proprietário continuam privados e não podem ser reivindicados por uma conta pública. As escritas v2 passam pela RPC com revisão esperada; clientes antigos não conseguem apagar os campos novos.
4. Configure o acesso por e-mail no Supabase Auth. No template do e-mail, use `{{ .Token }}` para enviar o código; o aplicativo usa `signInWithOtp` e `verifyOtp` com tipo `email`. Confira expiração, SMTP e limites de envio no projeto.
5. Configure os segredos de IA no servidor usando `supabase/functions/.env.example` como referência. Publique a função `analyze-food`. `supabase/config.toml` desliga apenas a verificação legada do gateway; a função exige bearer token e valida o usuário com `auth.getUser` antes de qualquer chamada a provedores.
6. Teste com duas contas: A não pode ler/escrever/excluir os registros de B; sem sessão não há acervo remoto. Valide a função com sessão expirada, limite diário e provedor indisponível. Ela consome uma cota atômica de até 30 pedidos por conta/dia, limita o corpo a 8 MB e não registra alimentação ou fotos em logs.
7. Se chaves Gemini/Groq já foram distribuídas no cliente antigo, revogue-as e substitua-as nos provedores. Não basta removê-las de uma nova compilação. O cliente novo não lê `EXPO_PUBLIC_GEMINI_API_KEY` ou `EXPO_PUBLIC_GROQ_API_KEY`, nem usa chaves privadas digitadas no aparelho.
8. Gere uma nova development build/binário contendo os módulos oficiais de arquivos, compartilhamento e seleção de documentos. Só então distribua o cliente v2. Não envie uma atualização OTA com módulos nativos ausentes do binário anterior.

Os modelos de IA são configuráveis por `GEMINI_MODEL`/`GROQ_MODEL`; confirme disponibilidade e permissões na sua conta. Não foi usado um segredo real nem realizada uma chamada paga aos provedores nesta implementação.

## Primeiro uso e importação do diário

No modo local, exporte o JSON. Configure o projeto com URL HTTPS e chave pública anon/publishable; chaves de servidor são rejeitadas. Entre por e-mail. Cada projeto/conta tem um arquivo SQLite distinto, com fila, cursores, conflitos e rascunhos próprios; sair retorna ao diário local.

Antes de habilitar a sincronização, restaure o arquivo em um diário de conta vazio. Importar de outro escopo cria cópias com novos IDs e remapeia os vínculos; não tenta reivindicar registros antigos remotos. Consumo, datas, nutrientes e confirmação são preservados. O arquivo local de origem permanece intacto. Restaurar no mesmo escopo mantém os IDs. A restauração não ativa a autorização de nuvem.

Em Configurações, habilite a sincronização separadamente. A IA pode ser usada com conta mesmo sem sincronizar o diário. Uma sessão expirada suspende o acesso remoto; os rascunhos da conta ficam guardados no seu banco para o próximo acesso.

## Protocolo e limites operacionais

- Revisão é atribuída no servidor; o relógio do aparelho não decide qual edição vence. Cada operação tem um UUID persistido antes do envio. A primeira tentativa congela o corpo; perder a resposta permite repetir o mesmo identificador e obter o recibo anterior.
- Conflitos mantêm a alteração local pendente e a versão remota guardada. Configurações apresenta valores e exclusões, com “Usar a nuvem” ou “Manter este aparelho”. Manter gera uma nova operação sobre a revisão remota e pode conflitar novamente. O grupo refeição/bebida é resolvido junto.
- Confirmação e marcação de treino têm uma entidade canônica por proprietário/data; criação concorrente em aparelhos offline gera conflito, em vez de duplicar o dia.
- Planos são versões imutáveis. A substituição de uma mesma data referencia a versão/revisão aceita anterior; alterações concorrentes geram conflito.
- Pull usa `(server_updated_at, id)`, páginas de até 500, aplicação idempotente e checkpoint na mesma transação local. Grupos são lidos completos por RPC e aplicados juntos, mesmo quando cruzam páginas.
- A releitura incremental sobrepõe cinco minutos; uma reconciliação completa paginada ocorre na primeira sincronização e após 24 horas, ou pelo botão “Reconciliar acervo completo”. Isso cobre transações antigas confirmadas fora de ordem; não promete ordenação incremental estrita por commit.
- Tombstones e recibos são retidos. Antes de definir expurgo, estabeleça uma política segura para todos os aparelhos e para a janela de reenvio. Os planos, cursores e registros de conta não incluem preferência de provedor/idioma de outro dispositivo.
- “Sincronizado” exige uma rodada confirmada, ausência de alterações e ausência de conflitos. Uma gravação local nunca depende do sucesso de rede.

## Verificação executável

Com Node 24 e dependências instaladas:

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run test:postgres
npm run bench:local
npx expo export --platform android --output-dir /tmp/fittracker-v2-android
```

`test:postgres` exige os binários PostgreSQL (por padrão `/usr/lib/postgresql/18/bin`; ajuste `PG_BIN_DIR`). O script cria um cluster em `/tmp` com socket local, testa bootstrap e atualização do esquema antigo e remove o cluster ao terminar. Não se conecta ao seu Supabase. Os testes SQLite usam o SQLite real do Node com um adaptador de teste para o driver Drizzle; não substituem a validação do módulo nativo.

A suíte cobre migrações v1–v5, rollback, decimais, nulos e zero, favorito imutável, volume vinculado, confirmação, metas históricas, páginas de histórico, backup/restauração/importação, perda de resposta, edição durante envio, conflito, 501 timestamps iguais, reconciliação tardia e troca de conta. Na rodada final, 30 testes locais/IA e 10 testes Postgres passaram. Lint e TypeScript passaram sem avisos. A função de IA é testada com respostas simuladas e checada com `deno check`. Os testes Postgres verificam autorização real com papéis e `auth.uid()` de teste, CAS, idempotência, tombstones, grupos, metas concorrentes e limite de uso.

Medição preliminar neste computador, durante empacotamento Android concorrente, Node 24.11.1 Linux/x64, SQLite 3.50.4, banco em memória com 10 mil registros sintéticos, 100 amostras após aquecimento:

| Operação | P95 observado |
| --- | ---: |
| Consultas locais do painel | 40,72 ms |
| Primeira página de 50 registros | 27,18 ms |
| Análise de 30 dias | 10,97 ms |
| Gravação alimentar local | 1,56 ms |

Essas medidas não incluem renderização, inicialização, sistema de arquivos real ou ponte nativa e não comprovam os alvos Android de 1 s/300 ms. Não havia aparelho/emulador Android disponível nesta sessão. Antes de liberar, identificar o aparelho e validar SQLite real, câmera/galeria, navegação, teclado decimal, leitura de tela, fonte ampliada, backup pelo seletor, modo avião/retorno, meia-noite local, expiração de sessão e desempenho com o acervo sintético. O empacotamento Android não é um APK instalado.

## Referências técnicas consultadas

- [Expo SQLite SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/), [ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/), [FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), [DocumentPicker](https://docs.expo.dev/versions/v58.0.0/sdk/document-picker/) e [Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/).
- [Supabase: e-mail sem senha](https://supabase.com/docs/guides/auth/auth-email-passwordless), [autenticação em Edge Functions](https://supabase.com/docs/guides/functions/auth) e [segredos de funções](https://supabase.com/docs/guides/functions/secrets).
- [Gemini API](https://ai.google.dev/api?hl=en) e [visão no Groq](https://console.groq.com/docs/vision).
