import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { GameService } from './game.service'
import { GameGateway } from './game.gateway'
import { PrismaService } from 'nestjs-prisma'
import { GamePhase, GameRoomStatus } from '@prisma/client'

@Injectable()
export class GameScheduler {
  private readonly logger = new Logger(GameScheduler.name)
  private isProcessing = false

  constructor(
    private readonly gameService: GameService,
    private readonly gameGateway: GameGateway,
    private readonly prisma: PrismaService,
  ) {}

  // Process timeouts every 10 seconds
  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleTimeouts() {
    // Prevent concurrent processing
    if (this.isProcessing) {
      return
    }

    this.isProcessing = true

    try {
      const results = await this.gameService.processTimeouts()

      for (const result of results) {
        // Broadcast updated state to room
        try {
          // Get updated game state for the room
          const room = await this.prisma.gameRoom.findUnique({
            where: { id: result.roomId },
            include: { players: true },
          })

          if (room) {
            // Find an active player to get the state
            const activePlayer = room.players.find((p) => !p.isEliminated)
            if (activePlayer) {
              // TODO: Re-enable user lookup when auth is ready
              // const user = await this.prisma.user.findUnique({
              //   where: { id: activePlayer.userId },
              // })
              // if (user) {
              //   const gameState = await this.gameService.getGameState(result.roomId, user)
              //   this.gameGateway.broadcastRoomState(result.roomId, gameState)
              // }

              // Use userId directly (no auth)
              const gameState = await this.gameService.getGameState(result.roomId, activePlayer.userId)
              this.gameGateway.broadcastRoomState(result.roomId, gameState)
            }
          }

          this.logger.log(`Processed timeout for room ${result.roomId}: ${result.autoSelections} auto-selections`)
        } catch (error) {
          this.logger.error(`Failed to broadcast after timeout for room ${result.roomId}: ${error.message}`)
        }
      }
    } catch (error) {
      this.logger.error(`Timeout processing error: ${error.message}`)
    } finally {
      this.isProcessing = false
    }
  }

  // Send timeout warnings (10 seconds before deadline)
  @Cron(CronExpression.EVERY_5_SECONDS)
  async sendTimeoutWarnings() {
    try {
      const warningThreshold = new Date(Date.now() + 15 * 1000) // 15 seconds from now
      const rooms = await this.prisma.gameRoom.findMany({
        where: {
          status: GameRoomStatus.PLAYING,
          currentPhase: GamePhase.SELECTING_ENVELOPE,
          turnDeadline: {
            gt: new Date(),
            lt: warningThreshold,
          },
        },
        include: {
          players: true,
          rounds: {
            where: { isCompleted: false },
            take: 1,
          },
        },
      })

      for (const room of rooms) {
        const currentRound = room.rounds[0]
        if (!currentRound) continue

        const turnOrder = JSON.parse(currentRound.turnOrder) as string[]
        const currentPlayerId = BigInt(turnOrder[room.currentTurnIndex])
        const secondsRemaining = Math.ceil((room.turnDeadline!.getTime() - Date.now()) / 1000)

        if (secondsRemaining > 0 && secondsRemaining <= 15) {
          this.gameGateway.broadcastTimeoutWarning(room.id, secondsRemaining, currentPlayerId)
        }
      }
    } catch (error) {
      this.logger.error(`Warning broadcast error: ${error.message}`)
    }
  }
}
