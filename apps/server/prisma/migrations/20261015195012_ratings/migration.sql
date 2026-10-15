-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "oRatingBefore" INTEGER,
ADD COLUMN     "oRatingDiff" INTEGER,
ADD COLUMN     "rated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "xRatingBefore" INTEGER,
ADD COLUMN     "xRatingDiff" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastRatedAt" TIMESTAMP(3),
ADD COLUMN     "ratedGames" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating" DOUBLE PRECISION NOT NULL DEFAULT 1500,
ADD COLUMN     "ratingDeviation" DOUBLE PRECISION NOT NULL DEFAULT 350,
ADD COLUMN     "ratingVolatility" DOUBLE PRECISION NOT NULL DEFAULT 0.06;

-- CreateIndex
CREATE INDEX "Game_rated_endedAt_idx" ON "Game"("rated", "endedAt");
