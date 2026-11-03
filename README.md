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
GEMINI_MODEL="gemini-3.1-flash-lite"
GEMINI_FALLBACK_MODELS="gemini-3.5-flash-lite,gemini-3.8-flash"
```

`GEMINI_MODEL` and `GEMINI_FALLBACK_MODELS` are optional server-side settings.
The fallback setting accepts comma-separated model IDs; an empty value disables
fallbacks. Choose models available to the API key's Google AI project.
When a model responds with 503, the API tries the next configured model immediately;
the last model retains bounded retries with exponential backoff. If every model
fails, Reports keeps the previous evaluation and displays the failure beside the
evaluation button. Only a successful four-dimension evaluation replaces a /10
result with a /30 result.
Restart/redeploy the **API service** after changing these values (a Vercel frontend
redeploy alone does not update the backend).

If Start practice fails, check the API response code: `GEMINI_CONFIGURATION_ERROR`
means the administrator should verify the key, API permissions, billing, and request
configuration; `GEMINI_QUOTA_EXCEEDED` means quota/billing is exhausted;
`GEMINI_MODEL_UNAVAILABLE` means none of the configured models could be found.
Do not put the Gemini key in `NEXT_PUBLIC_*` variables or commit it to GitHub.

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


### Interview type deployment

The interview type flow adds the nullable `Interview.interviewType` column.
Before starting the updated API, run against the production database:

```bash
pnpm --filter @ai-interview/database exec prisma migrate deploy
```

The migration preserves existing values if the column was already added by the SRS
branch. Historical records with no saved type show "ไม่ได้ระบุ"; the original type
cannot be recovered from past selections. New interviews send one of HR, Technical,
Coding, or Behavioral. The API persists the selected type and uses it for both AI
chat and report evaluation. Deploy frontend and backend from the same revision.


### Report rubric / 30-point scoring

Before deploying this version of the API, apply migrations:

```bash
pnpm --filter @ai-interview/database exec prisma migrate deploy
```

The report-rubric migration adds nullable language/reason/snapshot/source timestamp
fields and preserves existing SRS columns if present. Historical scores are not
rewritten. Re-score to produce interview-30-v1 evaluations with all four reasons.
Each dimension is 0–10, weighted 25%; total = sum(dimensions) * 0.75 (max 30).
The existing overall database field remains the four-dimension mean on 0–10 for
compatibility; the API computes totalScore and grade. Only current 30-point
results contribute to the new average. Deploy API and web together.
