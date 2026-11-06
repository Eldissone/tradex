# TradeX Global Trading

Base técnica para uma plataforma de comércio internacional entre China e Angola. Inclui storefront React responsivo, API Express, modelação inicial em PostgreSQL/Prisma e Docker para desenvolvimento.

## Pré-requisitos

- Node.js 22 ou superior
- Docker Desktop (recomendado para PostgreSQL)

## Arranque local

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
npm install
docker compose up -d postgres
npm run db:generate
npm run db:migrate -- --name init
npm run dev:frontend
```

Noutro terminal:

```powershell
npm run dev:backend
```

Abra `http://localhost:5174`. A verificação da API fica disponível em `http://localhost:3000/api/v1/health`.

## Estrutura

```text
frontend/     Storefront React/Vite e estilos mobile-first
backend/      API Express em Clean Architecture
  prisma/     Esquema e migrações PostgreSQL
  src/domain/ Regras de negócio e contratos
  src/application/ Casos de uso e DTOs
  src/infrastructure/ Persistência e integrações externas
  src/presentation/ HTTP, rotas, controladores e middleware
docs/         Arquitectura, API e fluxos operacionais
docker/       Imagens de contentor
```

## Comandos úteis

```powershell
npm run dev:frontend
npm run dev:backend
npm run build
npm run lint
npm run db:generate
npm run db:migrate -- --name descricao-da-alteracao
```

## Variáveis de ambiente

Copie `.env.example` para `.env` e mantenha os segredos fora do Git. Para a API, as variáveis específicas estão em `backend/.env.example`.

## Decisões iniciais

- Modular monolith, preparado para filas/serviços quando houver necessidade operacional real.
- Valores monetários persistidos em AOA com `Decimal`.
- Ciclos de vida separados para encomendas, pagamentos e remessas.
- Integrações de pagamento e logística ficam atrás de adaptadores na infraestrutura.

