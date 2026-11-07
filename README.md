# FitTracker

Aplicativo pessoal de alimentação e calistenia com Expo SDK 58, React Native, SQLite, Drizzle e Expo Router. Registro manual, favoritos e acompanhamento funcionam offline. Conta por e-mail, IA no servidor e sincronização por proprietário são opcionais.

A versão 2 inclui macros e fibras, nutrientes desconhecidos, origem e porções, favoritos, bebidas vinculadas, metas com vigência, peso, treino, creatina opcional, confirmação alimentar, tendências e backup JSON.

```bash
npm ci
npm start
```

```bash
npm run typecheck
npm run lint
npm test
npm run test:postgres # PostgreSQL local; cluster descartável em /tmp
npm run bench:local  # 10 mil registros sintéticos; medição do host
```

Consulte [Ativação e verificação da v2](docs/v2-deployment.md) antes de habilitar nuvem ou IA. O servidor compatível deve ser publicado primeiro. Chaves privadas dos provedores ficam somente no servidor; o cliente recebe apenas a URL e a chave pública do projeto.

[Design system](docs/design-system.md) · [Especificação original](../docs/Pessoal%20-%20FitTracker/FitTracker-v2-implementacao.md)
