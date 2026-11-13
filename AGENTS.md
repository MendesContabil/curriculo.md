# AGENTS.md — notas de ambiente

## O que é este app

Gestão e atendimento psicológico (React + Vite no front, Express + PostgreSQL na API).
Dois perfis: `admin` (psicóloga) e `patient`. Sessão via cookie `psi_session` assinado com
`AUTH_SECRET`.

## Como subir

```bash
docker compose -f docker-compose.base44.yml up -d
```

- `web` (Vite) publica a porta **3000** (container `5173`) — entry point do preview.
- `api` (Express) escuta em `8000`, acessível apenas na rede do compose.
- `db` é PostgreSQL 16 com volume `db-data`.
- O schema e o seed são idempotentes e rodam na inicialização da API (`server/src/db.js`).
  Não existe serviço de migração separado.

O Vite faz proxy de `/api` para `http://api:8000`, então tudo é **mesma origem** — não
introduza CORS/portas separadas para a API, ou o cookie de sessão quebra.

## Variáveis e segredos

- Ordem de `env_file` no serviço `api`: `.env.base44-defaults` (placeholders commitados)
  e depois `/run/base44/app.env` (segredos do painel — sempre vencem).
- `AUTH_SECRET` assina os cookies. O placeholder local permite o boot; em produção use o
  valor real no painel de segredos.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` definem a conta da psicóloga criada quando ainda não
  existe admin (padrão de demonstração: `psi@consultorio.app` / `psi123456`).
- `SEED_DEMO=false` desativa os pacientes/pacotes de exemplo.

## Comportamento de desenvolvimento

- `server/`: bind mount + `node --watch`; reinicia sozinho.
- `web/`: bind mount + Vite HMR; `allowedHosts` inclui `.<BASE44_SANDBOX_HOST_DOMAIN>`
  somente quando `BASE44_PREVIEW_MODE === '1'`.
- Dependências ficam em volumes nomeados (`api-node-modules`, `web-node-modules`) e são
  sincronizadas com `npm install` no start de cada serviço.
- Uploads persistentes em `/data/uploads` (volume `uploads`).

## Armadilhas

- Não rode `docker compose down -v` sem intenção: apaga banco e uploads.
- O seed só roda quando `patients` está vazio; recriar o banco restaura os dados demo.
- A área do paciente nunca recebe notas de evolução: os endpoints de notas exigem admin.
- Arquivos são servidos por `/api/files/:id` com checagem de dono; logos/fundos usam
  `/api/public/assets/{logo|background}`.
- Não há suíte de testes automatizada; valide com `curl` nos endpoints e pela interface.

## Como verificar rapidamente

```bash
curl -s http://localhost:3000/ | head
curl -s http://localhost:3000/api/health
docker compose -f docker-compose.base44.yml exec api node -e "fetch('http://127.0.0.1:8000/api/health').then(r=>console.log(r.status))"
```
