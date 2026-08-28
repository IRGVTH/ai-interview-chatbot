# AI Interview Chatbot

A full-stack AI interview practice app built with **NestJS**, **Next.js**, **Prisma**, **Gemini**, and **Neon PostgreSQL**.

The project is organized as a **pnpm monorepo** with two applications (`api` and `web`) plus a shared database package. The API handles authentication, interviews, chat sessions, reports, admin actions, and resume parsing. The web app provides the user-facing interview flow and dashboard. fileciteturn172file0L1-L2 fileciteturn173file0L1-L2 fileciteturn174file0L1-L2 fileciteturn176file0L1-L2

## Features

- Google login and JWT authentication. fileciteturn190file0L1-L2 fileciteturn191file0L1-L2
- User and admin roles.
- Admin dashboard for managing users.
- Create interview sessions with position, experience level, difficulty, and summary.
- Resume upload and text extraction from PDF/DOCX files.
- AI interview chat with Gemini.
- Reports and evaluation screens.

## Tech Stack

- **Frontend:** Next.js 16, React 19
- **Backend:** NestJS 11
- **Database:** PostgreSQL with Prisma 7
- **Auth:** JWT + Google OAuth
- **AI:** Google Gemini
- **Storage/Parsing:** `pdf-parse`, `mammoth`, `multer`

The API package already includes the main runtime dependencies for Google OAuth, JWT, file upload, PDF parsing, DOCX parsing, and Prisma. fileciteturn174file0L1-L2

## Project Structure

```text
apps/
  api/    # NestJS backend
  web/    # Next.js frontend
packages/
  database/ # Prisma schema, client, migrations, seed
```

## Prerequisites

- Node.js 20+
- pnpm 11
- PostgreSQL or Neon
- Google Cloud OAuth credentials
- Gemini API key

The repository is configured as a pnpm workspace and the root package uses pnpm as its package manager. fileciteturn172file0L1-L2 fileciteturn173file0L1-L2

## Environment Variables

### API

```env
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
JWT_SECRET="your-jwt-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"
FRONTEND_URL="http://localhost:3000"
PORT=4000
GEMINI_API_KEY="your-gemini-api-key"
```

### Web

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

The API bootstrap reads `FRONTEND_URL` for CORS and `PORT` for the server port, and the web app uses `NEXT_PUBLIC_API_URL` for its API client. fileciteturn181file0L1-L2 fileciteturn187file0L1-L2

## Local Setup

```bash
pnpm install
```

### 1) Generate Prisma client

```bash
pnpm --filter @ai-interview/database db:generate
```

### 2) Run migrations

```bash
pnpm --filter @ai-interview/database exec prisma migrate deploy
```

### 3) Seed data

```bash
pnpm --filter @ai-interview/database db:seed
```

The database package exposes scripts for generate, validate, migrate, studio, and seed. fileciteturn182file0L1-L2

### 4) Start development

```bash
pnpm dev
```

## Available Scripts

```bash
pnpm dev
pnpm build
pnpm lint
```

## Docker (Local)

The repository includes a `docker-compose.yml` that runs PostgreSQL, API, and Web together.

```bash
docker compose up --build
```

The compose file starts a Postgres container, runs the API on port `4000`, and runs the web app on port `3000`. fileciteturn183file0L1-L2

## Deployment

### Database

Use **Neon** for production. Run Prisma migrations with `migrate deploy` and seed only if you need initial admin data.

### API

Deploy the NestJS API to Railway or Render.

### Web

Deploy the Next.js app to Vercel.

## Notes

- Resume upload currently supports PDF and DOCX parsing on the API side.
- The app is built as a monorepo, so keep root-level `pnpm-workspace.yaml`, `pnpm-lock.yaml`, and `package.json` together.

## License

This project is for educational and portfolio use.
