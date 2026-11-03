-- Keep historical records unknown rather than guessing their interview type.
-- IF NOT EXISTS also supports databases that already received the SRS column.
ALTER TABLE "Interview" ADD COLUMN IF NOT EXISTS "interviewType" TEXT;
