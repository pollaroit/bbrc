-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('generating', 'ready', 'unavailable');

-- CreateEnum
CREATE TYPE "QuizSubmissionStatus" AS ENUM ('in_progress', 'submitted', 'forfeited');

-- CreateEnum
CREATE TYPE "QuizGenerationOutcome" AS ENUM ('ready', 'declined', 'failed');

-- CreateTable
CREATE TABLE "quiz" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "book_id" TEXT NOT NULL,
    "status" "QuizStatus" NOT NULL DEFAULT 'generating',
    "generating_started_at" TIMESTAMP(3),
    "unavailable_until" TIMESTAMP(3),
    "model" TEXT,
    "generated_by_id" TEXT,

    CONSTRAINT "quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quiz_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "choices" JSONB NOT NULL,

    CONSTRAINT "quiz_question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_submission" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "status" "QuizSubmissionStatus" NOT NULL DEFAULT 'in_progress',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "answers" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "correct_answers_count" INTEGER NOT NULL DEFAULT 0,
    "incorrect_answers_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_answers_count" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,

    CONSTRAINT "quiz_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_generation_log" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "outcome" "QuizGenerationOutcome" NOT NULL,

    CONSTRAINT "quiz_generation_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_question_report" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "quiz_question_report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_book_id_key" ON "quiz"("book_id");

-- CreateIndex
CREATE INDEX "quiz_status_idx" ON "quiz"("status");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_question_quiz_id_position_key" ON "quiz_question"("quiz_id", "position");

-- CreateIndex
CREATE INDEX "quiz_submission_quiz_id_status_score_idx" ON "quiz_submission"("quiz_id", "status", "score");

-- CreateIndex
CREATE INDEX "quiz_submission_user_id_status_idx" ON "quiz_submission"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_submission_user_id_quiz_id_key" ON "quiz_submission"("user_id", "quiz_id");

-- CreateIndex
CREATE INDEX "quiz_generation_log_user_id_created_at_idx" ON "quiz_generation_log"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_question_report_user_id_question_id_key" ON "quiz_question_report"("user_id", "question_id");

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz" ADD CONSTRAINT "quiz_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question" ADD CONSTRAINT "quiz_question_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_submission" ADD CONSTRAINT "quiz_submission_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_submission" ADD CONSTRAINT "quiz_submission_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_generation_log" ADD CONSTRAINT "quiz_generation_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_generation_log" ADD CONSTRAINT "quiz_generation_log_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question_report" ADD CONSTRAINT "quiz_question_report_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_question_report" ADD CONSTRAINT "quiz_question_report_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
