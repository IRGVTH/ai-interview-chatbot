-- Preserve historical scores; a fresh evaluation populates the new rubric fields.
ALTER TABLE "ChatEvaluation"
  ADD COLUMN IF NOT EXISTS "language" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "rubricVersion" TEXT NOT NULL DEFAULT 'legacy-v0',
  ADD COLUMN IF NOT EXISTS "rubricSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "dimensionFeedback" JSONB,
  ADD COLUMN IF NOT EXISTS "evaluatedThrough" TIMESTAMP(3);
