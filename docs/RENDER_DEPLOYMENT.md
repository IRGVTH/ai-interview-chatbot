# Release the API used by the Vercel frontend

The error `property interviewType should not exist` occurs when an older API's strict validation rejects the new interview request. The current `CreateInterviewDto` accepts HR, Technical, Coding and Behavioral; the integration suite verifies that each type is stored and passed to the AI context. Keep this field and strict validation: removing it would lose FR-02.

On 2026-10-09, the public API at `https://ai-interview-chatbot-grvy.onrender.com/report/rubric` still returned 404. The API source on `fix/srs-functional-requirements` defines that guarded route (anonymous requests should receive 401). Together with the user's creation error, this indicates an API/web release mismatch. Subsequent Settings screenshots confirm Render is configured for `develop`; the deployed commit still needs verification after changing the branch.

## Confirmed existing Render service (Docker)

The user's Settings screenshots on 2026-10-09 show branch `develop`, empty Root Directory, Dockerfile Path `./Dockerfile`, Docker Build Context Directory `.`, empty Docker Command, locked/empty Pre-Deploy Command, and Auto-Deploy `On Commit`. This confirms Docker runtime and an API branch mismatch. The latest API/FR changes are on `fix/srs-functional-requirements`.

After the Docker fix is pushed, change **Branch** to `fix/srs-functional-requirements` and save. Keep Root Directory empty, Dockerfile Path `./Dockerfile`, Docker Build Context Directory `.`, and Docker Command empty. Render then uses the checked-in Dockerfile's CMD. If saving does not start a deployment, use **Manual Deploy → Deploy latest commit**.

The updated Dockerfile uses Node 24 with OpenSSL, installs dev dependencies needed by Nest and Prisma CLI, generates Prisma with a dummy build-only database URL, and builds the API/fonts. Its CMD runs `pnpm deploy:api:start`, which migrates the runtime database and starts Nest only after migration succeeds. The locked Pre-Deploy Command does not need editing. `.dockerignore` excludes nested node_modules and environment files from the image. The Docker image itself has not been built in this workspace because Docker/Podman is unavailable; confirm the image build and migration in Render logs.

## Alternative native Node runtime settings

Use the existing service that owns the URL above, rather than creating a second API. Record its current settings and commit before changing them.

| Setting | Value |
| --- | --- |
| Repository | `IRGVTH/ai-interview-chatbot` |
| Branch | `fix/srs-functional-requirements` |
| Root Directory | Empty (repository root; shared workspace files are required) |
| Node version | `NODE_VERSION=24.19.0` (version used for verification) |
| Build Command | `pnpm install --frozen-lockfile --prod=false && pnpm deploy:api:build` |
| Start Command | `pnpm deploy:api:start` |

Retain the existing `DATABASE_URL`, `JWT_SECRET`, Google OAuth and Gemini environment values. Do not paste them into commits, logs or chat. Ensure `FRONTEND_URL` includes `https://ai-interview-chatbot-web-gamma.vercel.app`. Keep the web build's `NEXT_PUBLIC_API_URL` pointed at the same API.

`deploy:api:build` generates Prisma and builds Nest, including report fonts. It does not migrate the database. `deploy:api:start` applies pending checked-in migrations and starts the API only when migration succeeds. It never resets or seeds the database. Prisma CLI is a dev dependency, so deployment installation must include dev dependencies. Where a Render pre-deploy command is available, migrations can instead run there with `pnpm --filter @ai-interview/database exec prisma migrate deploy`, and Start Command can be `pnpm --filter api start:prod`.

Local verification on 2026-10-09: `deploy:api:build` passed (using a dummy database URL for client generation, with no database connection). API integration regression: 30 passed against disposable PostgreSQL, including creation, persistence and AI context for all four interview types. Production migration/start and signed-in production creation remain unverified until the service is released.

Review and back up the intended production database before the first migration. The migration adds interview type, concurrency fields and rubric metadata; legacy evaluations retain their original scores. The commands above are prepared configuration; committing them alone does not update the existing Render service or apply migrations.

Native Build/Start Commands above do not apply to the confirmed Docker service; use the Docker section for that service.

## Verify after release

1. Confirm Render's deployed commit matches the intended branch head and its migration/start logs succeeded. Do not publish environment values.
2. An anonymous GET to `/report/rubric` must return **401**, rather than 404. This proves the new guarded route exists, not that the full signed-in workflow passed.
3. Log in and create an interview with each of the four types. Read it back and verify the selected type persists.
4. Complete a practice round, open Report and verify its grade and Thai PDF. Use the remaining live acceptance checks in `FR_VERIFICATION.md` before marking all FR passed.
5. Release the tested frontend commit on the Vercel production domain and reload open tabs.

Render references: [monorepo support](https://render.com/docs/monorepo-support), [Node version](https://render.com/docs/node-version), [deploy commands](https://render.com/docs/deploys).
