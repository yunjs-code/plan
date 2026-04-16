-- CreateTable
CREATE TABLE "Textbook" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Textbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "doneCount" INTEGER NOT NULL DEFAULT 0,
    "minutesPerLecture" INTEGER NOT NULL,
    "subject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "textbookId" TEXT,
    "chapter" TEXT,
    "problemNos" TEXT,
    "durationMin" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "doneAt" TIMESTAMP(3),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongItem" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "problemNo" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "note" TEXT,

    CONSTRAINT "WrongItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyPlan" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "availableMin" INTEGER NOT NULL,
    "plannedMin" INTEGER NOT NULL,
    "actualMin" INTEGER NOT NULL DEFAULT 0,
    "items" JSONB NOT NULL,

    CONSTRAINT "DailyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyPlan_date_key" ON "DailyPlan"("date");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_textbookId_fkey" FOREIGN KEY ("textbookId") REFERENCES "Textbook"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongItem" ADD CONSTRAINT "WrongItem_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
