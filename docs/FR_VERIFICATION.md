# FR verification and deployment

Source: `AI_Interview_Chatbot_SRS(1).docx`, FR-01 through FR-18. This change implements the missing application paths and records the automated evidence below. Automated results do **not** certify live Gemini quality, Google OAuth configuration, microphone transcription or the deployed website.

## Verified on 2026-10-09

- API integration regression: 30 passed. Nest HTTP endpoints, JWT guards, validation, the generated Prisma client, every migration SQL file, PDF/DOCX parsers and PDF generation execute against a disposable PGlite PostgreSQL engine exposed over a local PostgreSQL socket. Only Gemini responses are replaced with deterministic fixtures. Prisma uses a single connection; production Neon pooling and infrastructure remain a deployment check.
- Rubric/grade unit tests: 27 passed, including zero, invalid/missing values, foreign message IDs, extra model fields and every grade boundary.
- API and Next.js production builds: passed.
- ESLint for changed API source/tests: passed. Full web lint: no errors; one pre-existing navigation warning in `app/login/page.tsx`.
- Generated report PDF visually reviewed: Thai glyphs, embedded Sarabun font, session context, score, grade, rubric, reasons, feedback and examples. Fonts are copied into `dist/report/fonts` by Nest build.

## Traceability

| FR | Application behavior | Automated evidence | Remaining live acceptance check |
| --- | --- | --- | --- |
| 01 | Normalized login/registration, hashed passwords, generic failures, JWT and owner checks | Register, duplicate/wrong credentials, concurrent registration, re-login and two-account isolation | Google OAuth callback on the deployed domains |
| 02 | Required HR, Technical, Coding or Behavioral choice; persisted and included in prompt | All four types, missing type rejection | Questions actually match each type with live Gemini |
| 03 | Required role; persisted prompt context; setup locked after start | Missing role and edits after start rejected; contextual prompt | Live role-specific questions |
| 04 | Three difficulty levels with explicit prompt guidance | easy/medium/hard persisted and forwarded | Approved easy/medium/hard question set reviewed by a human |
| 05 | Thai question guidance; English technical terms allowed | Context prompt and saved first-question fixture | Live Thai fluency and relevance |
| 06 | Only the owned session transcript and latest answer enter follow-up prompts | Previous answer retained; other account denied | Live follow-up relevance and no hallucinated context |
| 07 | Trimmed nonempty text; atomic message pairs; request UUID replay; stable order | Whitespace, replay, provider failure, persisted stream replay and concurrent sends | Browser retry after interrupted network |
| 08 | Thai speech input, editable transcript, permission/error text fallback; Thai read-aloud | Frontend TypeScript/build and source review | Chrome with real mic: allow/deny, edit transcript, send, Thai voice output |
| 09 | Analysis uses actual candidate answers; strict score validation | Malformed response rejected, candidate message IDs checked | Human review of live analysis against actual answers |
| 10 | Published 0–10 rubric, four equal weights, reasons and snapshot/version | Range/zero/JSON tests; overall computed by server; rubric stored | Live scoring against an approved benchmark |
| 11 | Actionable improvements in feedback/report | Empty improvements rejected; valid fixture saved | Suggestions are specific and useful with live Gemini |
| 12 | Explicit completion saves evaluation/status/time atomically; completed chat locked | Invalid evaluation leaves session open; valid completion/read-only history | Full browser completion flow after deployment |
| 13 | Correctness, clarity, language, confident wording with four reasons; limitations published | Four score/reason fields validated and persisted | Insufficient evidence and communication limitations handled honestly by live Gemini |
| 14 | Owner-scoped settings/history/timestamps/results; one practice session reused; optimistic concurrency | Repeat start, failed turn, concurrent sends, re-login and owner guards | Production reconnect/persistence with Neon |
| 15 | Reconciled dashboard/history and context/version-matched comparisons | Counts and averages; stale evaluations excluded | Multiple live practice rounds and responsive UI |
| 16 | Examples point to an actual answer, with original question/answer displayed | Foreign IDs rejected; originals attached from database | No invented achievements in live examples |
| 17 | Optional PDF/DOCX resume; Thai extraction; parse errors; remove/resume-free fallback | Valid PDF and Thai DOCX; corrupt/unsupported files; resume detail forwarded | Browser remove/fallback and live resume-specific questions |
| 18 | Owner-authenticated PDF with Thai font, settings, score, grade, reasons, summary and examples | PDF signature/font, owner/anonymous guards and stale-result rejection | Download and open PDF from deployed Report screen |

These remaining checks must be completed before marking **all FR passed** in a live RTM. They are acceptance gates, not automated failures. The previously deployed version has not been replaced by this branch.

## Grade summary

The server derives the grade from the saved overall score, not from a model-supplied grade. The scale is `practice-grade-v1`:

| Grade | Overall / 10 |
| --- | --- |
| A | 8 through 10 |
| B | 7 through less than 8 |
| C | 6 through less than 7 |
| D | 5 through less than 6 |
| F | 0 through less than 5 |

There is no E in this academic-style scale. Missing/invalid scores have no grade. The report shows each current session's grade, a grade derived from the eligible average and the published thresholds. Stale results require scoring again and cannot be exported. Practice grades are not hiring recommendations.

Old scores keep `legacy-v0`; they are excluded from the current average. Re-score them explicitly to use the current rubric. The scale and rubric snapshot are stored with new evaluations; the grade itself is derived on read.

## Run checks

Use Node.js 24 (the version verified here) and the repository's pnpm version.

```sh
pnpm install --frozen-lockfile
pnpm --filter api test --runInBand
pnpm --filter api test:rtm
pnpm --filter api build
pnpm --filter web build
pnpm --filter web lint
```

`test:rtm` always starts and tears down an in-memory test database; it never uses the caller's production `DATABASE_URL`. It enables Node VM modules for the PDF parser's worker within Jest. It requires no Gemini key, OAuth login or installed PostgreSQL server. Fixtures contain synthetic data only.

## Deployment order

1. Check out `fix/srs-functional-requirements` and install from the lockfile. This branch is based on `develop`; it does not contain unpushed changes from a Windows working directory.
2. With the intended production database connection configured, run the additive migration. This was **not** run against the user's live database:

   ```sh
   pnpm --filter @ai-interview/database exec prisma migrate deploy
   pnpm --filter @ai-interview/database db:generate
   ```

3. Build and release API and web together, then reload open browser tabs. New interview requests require `interviewType`; answer requests require a UUID `requestId`. Older open clients must reload. Keep `dist/report/fonts` in the API deployment.
4. Retain API `DATABASE_URL`, `JWT_SECRET`, Google OAuth and `GEMINI_API_KEY`; configure comma-separated `FRONTEND_URL` origins and the web build-time `NEXT_PUBLIC_API_URL`. Do not commit `.env` files. Confirm the configured Gemini models are available to the deployed account.
5. Run the live acceptance checks above with two test accounts, a Thai mic and the approved AI question/answer test set. Record actual results in RTM. Commit/push alone does not apply the migration or release a production deployment.

## Report compatibility fix (2026-10-09)

The production Render API returned `404 Cannot GET /report/rubric` during a read-only check. The new report frontend assumed that `/report/overview` included `rubric`, `gradeScale` and versioned evaluation metadata. The previous API contract has no such fields; passing that payload directly into the new renderer can cause a client exception.

The report now validates and normalizes responses before updating render state, supports the old contract, preserves saved scores, derives display grades, labels legacy results, and excludes unversioned results from the current-rubric average. Missing arrays, malformed responses and partial rubric data are handled without rendering invalid state. Legacy results cannot use the new PDF endpoint. This frontend fix does not replace the backend migration/release steps above.

Verification: `pnpm --filter web test:report` passes 11 regression cases for old/current API contracts, empty history, zero/invalid scores, stale/missing versions and incomplete data. Web build passes; web lint has no errors and the same existing login navigation warning. Signed-in production verification remains pending: the test browser's Google sign-in encountered a connection failure before authentication completed.
