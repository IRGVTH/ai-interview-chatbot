ALTER TABLE "Interview" ADD COLUMN "interviewType" TEXT NOT NULL DEFAULT 'Technical', ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ChatSession" ADD COLUMN "turnVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ChatMessage" ADD COLUMN "requestId" TEXT;
CREATE UNIQUE INDEX "ChatMessage_sessionId_requestId_role_key" ON "ChatMessage"("sessionId", "requestId", "role");
ALTER TABLE "ChatEvaluation" ADD COLUMN "rubricVersion" TEXT NOT NULL DEFAULT 'legacy-v0', ADD COLUMN "rubricSnapshot" JSONB, ADD COLUMN "language" DOUBLE PRECISION, ADD COLUMN "dimensionFeedback" JSONB, ADD COLUMN "exampleAnswers" JSONB, ADD COLUMN "sourceTurnVersion" INTEGER;
-- Preserve historical rows without falsely attributing the new rubric to them.
UPDATE "Interview" SET "status" = 'in_progress', "startedAt" = COALESCE("startedAt", "createdAt") WHERE "status" = 'draft' AND EXISTS (SELECT 1 FROM "ChatSession" s WHERE s."interviewId" = "Interview"."id");
