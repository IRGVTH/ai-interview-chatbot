-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "memory" TEXT;

-- CreateTable
CREATE TABLE "ChatEvaluation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "communication" DOUBLE PRECISION NOT NULL,
    "technical" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "strengths" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "feedback" TEXT NOT NULL,
    "rawResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChatEvaluation_sessionId_key" ON "ChatEvaluation"("sessionId");

-- AddForeignKey
ALTER TABLE "ChatEvaluation" ADD CONSTRAINT "ChatEvaluation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
