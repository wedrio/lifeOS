-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'repayment';

-- AlterTable
ALTER TABLE "Account" ADD COLUMN     "kind" TEXT;

-- AlterTable
ALTER TABLE "Habit" ADD COLUMN     "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "HabitCheckIn" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "state" TEXT;

-- AlterTable
ALTER TABLE "Settings" ADD COLUMN     "annualReadingTarget" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "makeupCardBalance" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "makeupCardMonth" VARCHAR(7),
ADD COLUMN     "mealBudget" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "toAccountId" TEXT;

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT,
    "totalPages" INTEGER NOT NULL,
    "currentPage" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'queue',
    "category" TEXT,
    "coverUrl" TEXT,
    "coverTheme" TEXT,
    "rating" INTEGER,
    "review" TEXT,
    "takeaways" JSONB NOT NULL DEFAULT '[]',
    "startDate" VARCHAR(10),
    "finishDate" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "pagesRead" INTEGER NOT NULL,
    "note" TEXT,
    "date" VARCHAR(10) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "quote" TEXT NOT NULL,
    "thoughts" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seed" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'article',
    "note" TEXT,
    "effort" TEXT NOT NULL DEFAULT 'm15',
    "status" TEXT NOT NULL DEFAULT 'growing',
    "settledAt" VARCHAR(10),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Book_userId_status_idx" ON "Book"("userId", "status");

-- CreateIndex
CREATE INDEX "ReadingLog_userId_date_idx" ON "ReadingLog"("userId", "date");

-- CreateIndex
CREATE INDEX "ReadingLog_bookId_idx" ON "ReadingLog"("bookId");

-- CreateIndex
CREATE INDEX "BookNote_userId_idx" ON "BookNote"("userId");

-- CreateIndex
CREATE INDEX "BookNote_bookId_idx" ON "BookNote"("bookId");

-- CreateIndex
CREATE INDEX "Seed_userId_status_idx" ON "Seed"("userId", "status");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingLog" ADD CONSTRAINT "ReadingLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingLog" ADD CONSTRAINT "ReadingLog_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookNote" ADD CONSTRAINT "BookNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookNote" ADD CONSTRAINT "BookNote_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seed" ADD CONSTRAINT "Seed_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
