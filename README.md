# Gestão Psicológica

Aplicativo web responsivo de gestão e atendimento psicológico, com dois níveis de acesso:
**Psicóloga (Admin)** e **Paciente**.

## Stack

- **Front-end:** React 18 + Vite (SPA, tema white-label por CSS variables)
- **API:** Node.js 22 + Express + Multer
- **Banco:** PostgreSQL 16 (schema e seed criados automaticamente na inicialização)
- **Ambiente:** Docker Compose (`docker-compose.base44.yml`)

## Como rodar

```bash
docker compose -f docker-compose.base44.yml up -d
```

A aplicação fica disponível em **http://localhost:3000**. A API roda interna na porta
`8000` e é acessada pelo proxy `/api` do Vite (mesma origem — necessário para o cookie de
sessão).

## Acessos de demonstração

| Perfil     | E-mail               | Senha        |
| ---------- | -------------------- | ------------ |
| Psicóloga  | `psi@consultorio.app` | `psi123456`  |
| Paciente   | `paciente@demo.app`   | `paciente123` |

Os dados de demonstração são criados na primeira inicialização quando o banco está vazio
(podem ser desativados com `SEED_DEMO=false`).

## Funcionalidades

### Psicóloga (Admin)

1. **Configurações de aparência (white-label)** — nome do consultório, logotipo/foto,
   cor principal dos botões, cor **ou imagem** de fundo e quatro opções de tipografia
   (Moderna, Clássica, Suave, Minimalista). A prévia é aplicada em tempo real e vale para
   as duas áreas.
2. **Pacientes e prontuário** — nome completo, idade, telefone, e-mail e origem
   (`Particular` ou `Convênio Leve Saúde`). Dentro do paciente, o **Bloco de notas de
   evolução** registra anotações datadas e é acessível apenas pela psicóloga (a API
   bloqueia o acesso do paciente às notas).
3. **Financeiro e pacotes** — pacotes avulso/1 sessão, 2 sessões, 4 sessões ou
   personalizado, com valores editáveis. Pacientes Leve Saúde recebem o desconto padrão
   configurável automaticamente (também editável por pacote), e o valor final gera uma
   cobrança pendente. Cobranças podem ser marcadas como pagas/reabertas.
4. **Documentos** — envio de recibos e documentos ao paciente.

### Paciente

- Visão dos pacotes, sessões realizadas/restantes e histórico de pagamentos.
- **Chave PIX** do consultório com botão de copiar.
- **Anexo de comprovantes** de pagamento.
- **Download de recibos e documentos** enviados pela psicóloga.
- Notas de evolução **não** são exibidas em nenhuma rota do paciente.

## Estrutura

```
web/                       SPA React + Vite
  src/pages/               Login, Painel, Pacientes, Prontuário, Financeiro, Aparência, Área do paciente
  src/components/          Layout, UI, ícones e modais
  src/styles.css           Design tokens e tema white-label
server/
  src/index.js             App Express, autenticação, branding público, assets
  src/routes/              Pacientes, documentos, financeiro, configurações, área do paciente, arquivos
  src/db.js                Schema, migrações idempotentes e seed de demonstração
docker-compose.base44.yml  Ambiente de desenvolvimento
.env.base44-defaults       Placeholders locais (segredos reais vêm de /run/base44/app.env)
```

## Desenvolvimento

O código é montado por bind mount dentro dos containers, com `node --watch` na API e Vite
com HMR no front-end. Alterações em `web/` recarregam a página; alterações em `server/`
reiniciaM a API automaticamente.

Comandos úteis:

```bash
docker compose -f docker-compose.base44.yml logs -f api
docker compose -f docker-compose.base44.yml exec api npm run start   # execução única
docker compose -f docker-compose.base44.yml ps
```

## Notas de ambiente (sandbox Base44)

- O front-end é servido pelo Vite na porta `5173`, publicada na porta `3000` (entry point
  do preview).
- `BASE44_PREVIEW_MODE=1` adiciona o domínio wildcard do sandbox à allowlist de hosts do
  Vite (`allowedHosts`). Sem essa variável, o comportamento padrão do Vite é preservado.
- Segredos externos chegam por `/run/base44/app.env` (última entrada `env_file:`), com
  precedência sobre `.env.base44-defaults`.
- Uploads (logos, fundos, documentos e comprovantes) ficam no volume `uploads` e os metadados
  no PostgreSQL.

## Verificação

- `GET /api/health` responde `{ "ok": true }`.
- Login, listagem de pacientes, notas, pacotes, cobranças e downloads foram exercitados
  pela interface; o isolamento das notas é validado pela API (paciente recebe `403`).
