-- CreateEnum
CREATE TYPE "GameRoomStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GamePhase" AS ENUM ('WAITING_FOR_PLAYERS', 'SELECTING_ENVELOPE', 'REVEALING', 'VOTING', 'ROUND_END', 'GAME_OVER');

-- CreateEnum
CREATE TYPE "Envelope" AS ENUM ('A', 'B', 'C', 'D');

-- CreateTable
CREATE TABLE "GameRoom" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" VARCHAR(6) NOT NULL,
    "status" "GameRoomStatus" NOT NULL DEFAULT 'WAITING',
    "currentPhase" "GamePhase" NOT NULL DEFAULT 'WAITING_FOR_PLAYERS',
    "totalPrizeCents" INTEGER NOT NULL DEFAULT 2800,
    "remainingPrizeCents" INTEGER NOT NULL DEFAULT 2800,
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "currentTurnIndex" INTEGER NOT NULL DEFAULT 0,
    "turnDeadline" TIMESTAMP(3),
    "winnerId" BIGINT,

    CONSTRAINT "GameRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePlayer" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" BIGINT NOT NULL,
    "displayName" TEXT NOT NULL,
    "walletAddress" TEXT,
    "roomId" BIGINT NOT NULL,
    "isEliminated" BOOLEAN NOT NULL DEFAULT false,
    "eliminatedAt" TIMESTAMP(3),
    "turnOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GamePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" BIGINT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "turnOrder" TEXT NOT NULL,
    "eliminatedEnvelope" "Envelope",
    "eliminatedPlayerId" BIGINT,
    "eliminationPrizeCents" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRoundSelection" (
    "id" BIGSERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "roundId" BIGINT NOT NULL,
    "selectorId" BIGINT NOT NULL,
    "receiverId" BIGINT NOT NULL,
    "envelope" "Envelope" NOT NULL,
    "selectionOrder" INTEGER NOT NULL,
    "isAutoSelected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GameRoundSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameRoom_code_key" ON "GameRoom"("code");

-- CreateIndex
CREATE INDEX "GameRoom_code_idx" ON "GameRoom"("code");

-- CreateIndex
CREATE INDEX "GameRoom_status_idx" ON "GameRoom"("status");

-- CreateIndex
CREATE INDEX "GamePlayer_roomId_idx" ON "GamePlayer"("roomId");

-- CreateIndex
CREATE INDEX "GamePlayer_userId_idx" ON "GamePlayer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GamePlayer_roomId_userId_key" ON "GamePlayer"("roomId", "userId");

-- CreateIndex
CREATE INDEX "GameRound_roomId_idx" ON "GameRound"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_roomId_roundNumber_key" ON "GameRound"("roomId", "roundNumber");

-- CreateIndex
CREATE INDEX "GameRoundSelection_roundId_idx" ON "GameRoundSelection"("roundId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRoundSelection_roundId_selectorId_key" ON "GameRoundSelection"("roundId", "selectorId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRoundSelection_roundId_receiverId_key" ON "GameRoundSelection"("roundId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRoundSelection_roundId_envelope_key" ON "GameRoundSelection"("roundId", "envelope");

-- AddForeignKey
ALTER TABLE "GameRoom" ADD CONSTRAINT "GameRoom_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "GamePlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayer" ADD CONSTRAINT "GamePlayer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "GameRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_eliminatedPlayerId_fkey" FOREIGN KEY ("eliminatedPlayerId") REFERENCES "GamePlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundSelection" ADD CONSTRAINT "GameRoundSelection_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundSelection" ADD CONSTRAINT "GameRoundSelection_selectorId_fkey" FOREIGN KEY ("selectorId") REFERENCES "GamePlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRoundSelection" ADD CONSTRAINT "GameRoundSelection_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "GamePlayer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
