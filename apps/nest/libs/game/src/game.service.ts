import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
// TODO: Re-enable User type when auth is ready
// import { User, Envelope, GamePhase, GameRoomStatus } from '@prisma/client'
import { Envelope, GamePhase, GameRoomStatus } from '@prisma/client'
import { th } from '@app/helper/transform.helper'
import { CreateRoomDto } from './dtos/create-room.dto'
import { JoinRoomDto } from './dtos/join-room.dto'
import { SelectEnvelopeDto } from './dtos/select-envelope.dto'
import { GameRoomEntity, RoomJoinResponseEntity } from './entities/game-room.entity'
import { GamePlayerEntity, GamePlayerStateEntity } from './entities/game-player.entity'
import {
  GameStateEntity,
  CurrentRoundStateEntity,
  RoundHistoryEntity,
  SelectionResultEntity,
} from './entities/game-state.entity'
import { GameRoundEntity, GameRoundSelectionEntity } from './entities/game-round.entity'

const TURN_TIMEOUT_MS = 60 * 1000 // 1 minute
const MAX_PLAYERS = 4
const TOTAL_PRIZE_CENTS = 2800 // $28
const ELIMINATION_PRIZES = [100, 200, 300] // $1, $2, $3 for rounds 1, 2, 3
const ALL_ENVELOPES: Envelope[] = ['A', 'B', 'C', 'D']

// Counter for generating mock user IDs when no userId is provided
let mockUserIdCounter = BigInt(1000000)

@Injectable()
export class GameService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper to get or create a mock userId for testing
  private getOrCreateUserId(userId?: bigint): bigint {
    if (userId) return userId
    // Generate a unique mock userId for anonymous users
    mockUserIdCounter += BigInt(1)
    return mockUserIdCounter
  }

  // Generate a random 6-character room code
  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Exclude similar chars like 0/O, 1/I
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
  }

  // Shuffle array (Fisher-Yates)
  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }

  // Create a new game room
  // TODO: Re-enable User type when auth is ready (userId?: bigint -> user: User)
  async createRoom(dto: CreateRoomDto, userId?: bigint): Promise<RoomJoinResponseEntity> {
    const effectiveUserId = this.getOrCreateUserId(userId)

    // Generate unique room code
    let code: string
    let attempts = 0
    do {
      code = this.generateRoomCode()
      const existing = await this.prisma.gameRoom.findUnique({ where: { code } })
      if (!existing) break
      attempts++
    } while (attempts < 10)

    if (attempts >= 10) {
      throw new BadRequestException('Could not generate unique room code')
    }

    // Create room and first player in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const room = await tx.gameRoom.create({
        data: {
          code,
          status: GameRoomStatus.WAITING,
          currentPhase: GamePhase.WAITING_FOR_PLAYERS,
          totalPrizeCents: TOTAL_PRIZE_CENTS,
          remainingPrizeCents: TOTAL_PRIZE_CENTS,
        },
      })

      const player = await tx.gamePlayer.create({
        data: {
          roomId: room.id,
          userId: effectiveUserId,
          displayName: dto.displayName,
          // walletAddress: user.walletAddress, // TODO: Re-enable when auth is ready
          turnOrder: 0,
        },
      })

      return { room, player }
    })

    return {
      room: th.toInstanceSafe(GameRoomEntity, result.room),
      player: th.toInstanceSafe(GamePlayerEntity, result.player),
    }
  }

  // Get room by code
  async getRoomByCode(code: string): Promise<GameRoomEntity> {
    const room = await this.prisma.gameRoom.findUniqueOrThrow({
      where: { code: code.toUpperCase() },
      include: { players: true },
    })
    return th.toInstanceSafe(GameRoomEntity, room)
  }

  // Join a room
  // TODO: Re-enable User type when auth is ready (userId?: bigint -> user: User)
  async joinRoom(code: string, dto: JoinRoomDto, userId?: bigint): Promise<RoomJoinResponseEntity> {
    const effectiveUserId = this.getOrCreateUserId(userId)

    const room = await this.prisma.gameRoom.findUniqueOrThrow({
      where: { code: code.toUpperCase() },
      include: { players: true },
    })

    // Check if room is joinable
    if (room.status !== GameRoomStatus.WAITING) {
      throw new BadRequestException('Game has already started')
    }

    if (room.players.length >= MAX_PLAYERS) {
      throw new BadRequestException('Room is full')
    }

    // Check if user already in room
    const existingPlayer = room.players.find((p) => p.userId === effectiveUserId)
    if (existingPlayer) {
      return {
        room: th.toInstanceSafe(GameRoomEntity, room),
        player: th.toInstanceSafe(GamePlayerEntity, existingPlayer),
      }
    }

    // Add player to room
    const player = await this.prisma.gamePlayer.create({
      data: {
        roomId: room.id,
        userId: effectiveUserId,
        displayName: dto.displayName,
        // walletAddress: user.walletAddress, // TODO: Re-enable when auth is ready
        turnOrder: room.players.length,
      },
    })

    const updatedRoom = await this.prisma.gameRoom.findUniqueOrThrow({
      where: { id: room.id },
      include: { players: true },
    })

    return {
      room: th.toInstanceSafe(GameRoomEntity, updatedRoom),
      player: th.toInstanceSafe(GamePlayerEntity, player),
    }
  }

  // Leave a room (only before game starts)
  // TODO: Re-enable User type when auth is ready (userId?: bigint -> user: User)
  async leaveRoom(roomId: bigint, userId?: bigint): Promise<void> {
    const room = await this.prisma.gameRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: { players: true },
    })

    if (room.status !== GameRoomStatus.WAITING) {
      throw new BadRequestException('Cannot leave after game has started')
    }

    const player = room.players.find((p) => p.userId === userId)
    if (!player) {
      throw new BadRequestException('You are not in this room')
    }

    await this.prisma.gamePlayer.delete({
      where: { id: player.id },
    })

    // If room is empty, delete it
    if (room.players.length <= 1) {
      await this.prisma.gameRoom.delete({ where: { id: roomId } })
    }
  }

  // Start the game (any player can start when 4 players are ready)
  // TODO: Re-enable User type when auth is ready (userId?: bigint -> user: User)
  async startGame(roomId: bigint, userId?: bigint): Promise<GameStateEntity> {
    const room = await this.prisma.gameRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: { players: true },
    })

    // Validate user is in room
    const userPlayer = room.players.find((p) => p.userId === userId)
    if (!userPlayer) {
      throw new ForbiddenException('You are not in this room')
    }

    if (room.status !== GameRoomStatus.WAITING) {
      throw new BadRequestException('Game has already started')
    }

    if (room.players.length !== MAX_PLAYERS) {
      throw new BadRequestException(`Need exactly ${MAX_PLAYERS} players to start`)
    }

    // Randomize turn order for first round
    const shuffledPlayerIds = this.shuffleArray(room.players.map((p) => p.id))
    const turnDeadline = new Date(Date.now() + TURN_TIMEOUT_MS)

    // Start game and create first round
    await this.prisma.$transaction(async (tx) => {
      // Update player turn orders
      for (let i = 0; i < shuffledPlayerIds.length; i++) {
        await tx.gamePlayer.update({
          where: { id: shuffledPlayerIds[i] },
          data: { turnOrder: i },
        })
      }

      // Create first round
      await tx.gameRound.create({
        data: {
          roomId: room.id,
          roundNumber: 1,
          turnOrder: JSON.stringify(shuffledPlayerIds.map((id) => id.toString())),
          eliminationPrizeCents: ELIMINATION_PRIZES[0],
        },
      })

      // Update room state
      await tx.gameRoom.update({
        where: { id: room.id },
        data: {
          status: GameRoomStatus.PLAYING,
          currentPhase: GamePhase.SELECTING_ENVELOPE,
          currentRound: 1,
          currentTurnIndex: 0,
          turnDeadline,
        },
      })
    })

    return this.getGameState(roomId, userId)
  }

  // Get current game state (for polling)
  // TODO: Re-enable User type when auth is ready (userId?: bigint -> user: User)
  async getGameState(roomId: bigint, userId?: bigint): Promise<GameStateEntity> {
    const room = await this.prisma.gameRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        players: true,
        rounds: {
          include: {
            selections: true,
            eliminatedPlayer: true,
          },
          orderBy: { roundNumber: 'asc' },
        },
        winner: true,
      },
    })

    const userPlayer = room.players.find((p) => p.userId === userId)
    if (!userPlayer) {
      throw new ForbiddenException('You are not in this room')
    }

    const currentRoundData = room.rounds.find((r) => r.roundNumber === room.currentRound)

    // Build players with hasReceivedEnvelope status
    const playersWithStatus: GamePlayerStateEntity[] = room.players.map((p) => {
      const hasReceivedEnvelope = currentRoundData
        ? currentRoundData.selections.some((s) => s.receiverId === p.id)
        : false

      return {
        ...th.toInstanceSafe(GamePlayerStateEntity, p),
        hasReceivedEnvelope,
      }
    })

    // Build current round state
    let currentRound: CurrentRoundStateEntity | undefined
    if (currentRoundData) {
      const turnOrder = JSON.parse(currentRoundData.turnOrder) as string[]
      const usedEnvelopes = currentRoundData.selections.map((s) => s.envelope)
      const usedReceiverIds = currentRoundData.selections.map((s) => s.receiverId.toString())
      const activePlayers = room.players.filter((p) => !p.isEliminated)

      currentRound = {
        id: currentRoundData.id,
        roundNumber: currentRoundData.roundNumber,
        turnOrder,
        currentTurnPlayerId:
          room.currentTurnIndex < turnOrder.length ? BigInt(turnOrder[room.currentTurnIndex]) : undefined,
        availableEnvelopes: ALL_ENVELOPES.filter((e) => !usedEnvelopes.includes(e)),
        availableReceivers: activePlayers
          .filter((p) => !usedReceiverIds.includes(p.id.toString()))
          .map((p) => p.id.toString()),
        selections: th.toInstancesSafe(GameRoundSelectionEntity, currentRoundData.selections),
        eliminatedEnvelope: currentRoundData.eliminatedEnvelope || undefined,
        eliminatedPlayer: currentRoundData.eliminatedPlayer
          ? th.toInstanceSafe(GamePlayerEntity, currentRoundData.eliminatedPlayer)
          : undefined,
        eliminationPrizeCents: currentRoundData.eliminationPrizeCents,
      }
    }

    // Calculate time remaining
    let timeRemaining: number | undefined
    if (room.turnDeadline && room.currentPhase === GamePhase.SELECTING_ENVELOPE) {
      const remaining = Math.max(0, room.turnDeadline.getTime() - Date.now())
      timeRemaining = Math.ceil(remaining / 1000)
    }

    // Check if it's user's turn
    const myTurn =
      currentRound?.currentTurnPlayerId === userPlayer.id && room.currentPhase === GamePhase.SELECTING_ENVELOPE

    // Build round history for game over
    let roundHistory: RoundHistoryEntity[] | undefined
    if (room.currentPhase === GamePhase.GAME_OVER) {
      roundHistory = room.rounds
        .filter((r) => r.isCompleted && r.eliminatedPlayer)
        .map((r) => ({
          roundNumber: r.roundNumber,
          eliminatedPlayerName: r.eliminatedPlayer!.displayName,
          eliminatedEnvelope: r.eliminatedEnvelope!,
          prizeCents: r.eliminationPrizeCents,
        }))
    }

    return {
      room: th.toInstanceSafe(GameRoomEntity, room),
      players: playersWithStatus,
      currentRound,
      myTurn,
      myPlayer: playersWithStatus.find((p) => p.userId === userId)!,
      timeRemaining,
      winner: room.winner ? th.toInstanceSafe(GamePlayerEntity, room.winner) : undefined,
      roundHistory,
    }
  }

  // Select an envelope
  // TODO: Re-enable User type when auth is ready (userId?: bigint -> user: User)
  async selectEnvelope(roundId: bigint, dto: SelectEnvelopeDto, userId?: bigint): Promise<SelectionResultEntity> {
    const round = await this.prisma.gameRound.findUniqueOrThrow({
      where: { id: roundId },
      include: {
        room: {
          include: { players: true },
        },
        selections: true,
      },
    })

    const room = round.room
    const userPlayer = room.players.find((p) => p.userId === userId)

    if (!userPlayer) {
      throw new ForbiddenException('You are not in this room')
    }

    if (room.currentPhase !== GamePhase.SELECTING_ENVELOPE) {
      throw new BadRequestException('Not in selection phase')
    }

    // Check if it's user's turn
    const turnOrder = JSON.parse(round.turnOrder) as string[]
    const currentTurnPlayerId = turnOrder[room.currentTurnIndex]

    if (userPlayer.id.toString() !== currentTurnPlayerId) {
      throw new BadRequestException('It is not your turn')
    }

    // Validate envelope is available
    const usedEnvelopes = round.selections.map((s) => s.envelope)
    if (usedEnvelopes.includes(dto.envelope)) {
      throw new BadRequestException('This envelope is already taken')
    }

    // Convert receiverId to bigint for proper comparison (handles string from DTO)
    const receiverIdBigInt = BigInt(dto.receiverId)

    // Validate receiver is available
    const usedReceiverIds = round.selections.map((s) => s.receiverId)
    if (usedReceiverIds.some((id) => id === receiverIdBigInt)) {
      throw new BadRequestException('This player already has an envelope')
    }

    // Validate receiver is an active player
    const receiver = room.players.find((p) => p.id === receiverIdBigInt && !p.isEliminated)
    if (!receiver) {
      throw new BadRequestException('Invalid receiver')
    }

    // Create selection
    const selection = await this.prisma.gameRoundSelection.create({
      data: {
        roundId: round.id,
        selectorId: userPlayer.id,
        receiverId: receiverIdBigInt,
        envelope: dto.envelope,
        selectionOrder: round.selections.length,
        isAutoSelected: false,
      },
    })

    // Determine next step
    const activePlayers = room.players.filter((p) => !p.isEliminated)
    const selectionsNeeded = activePlayers.length - 1 // Last player doesn't select
    const isRoundSelectionComplete = round.selections.length + 1 >= selectionsNeeded

    const result: SelectionResultEntity = {
      selection: th.toInstanceSafe(GameRoundSelectionEntity, selection),
    }

    if (isRoundSelectionComplete) {
      // All selections done - assign last envelope to last player and reveal
      result.completedRound = await this.completeRoundSelections(round.id)
    } else {
      // Move to next turn
      const nextTurnIndex = room.currentTurnIndex + 1
      const nextTurnDeadline = new Date(Date.now() + TURN_TIMEOUT_MS)

      await this.prisma.gameRoom.update({
        where: { id: room.id },
        data: {
          currentTurnIndex: nextTurnIndex,
          turnDeadline: nextTurnDeadline,
        },
      })

      const remainingEnvelopes = ALL_ENVELOPES.filter((e) => !usedEnvelopes.includes(e) && e !== dto.envelope)
      const remainingReceivers = activePlayers
        .filter((p) => !usedReceiverIds.includes(p.id) && p.id !== dto.receiverId)
        .map((p) => p.id.toString())

      result.nextTurn = {
        currentTurnIndex: nextTurnIndex,
        currentTurnPlayerId: BigInt(turnOrder[nextTurnIndex]),
        turnDeadline: nextTurnDeadline,
        availableEnvelopes: remainingEnvelopes,
        availableReceivers: remainingReceivers,
      }
    }

    return result
  }

  // Complete round selections (assign last envelope, do elimination)
  private async completeRoundSelections(roundId: bigint): Promise<GameRoundEntity> {
    const round = await this.prisma.gameRound.findUniqueOrThrow({
      where: { id: roundId },
      include: {
        room: { include: { players: true } },
        selections: true,
      },
    })

    const room = round.room
    const activePlayers = room.players.filter((p) => !p.isEliminated)
    const usedEnvelopes = round.selections.map((s) => s.envelope)
    const usedReceiverIds = round.selections.map((s) => s.receiverId)

    // Find last player (who didn't select) and last envelope
    const lastPlayer = activePlayers.find((p) => !usedReceiverIds.includes(p.id))!
    const lastEnvelope = ALL_ENVELOPES.filter((e) => !usedEnvelopes.includes(e))[0]

    // The player who selected last assigns the envelope to last player
    const lastSelector = activePlayers.find(
      (p) => p.id.toString() === JSON.parse(round.turnOrder)[round.selections.length],
    )

    // Create the last selection (auto-assigned)
    await this.prisma.gameRoundSelection.create({
      data: {
        roundId: round.id,
        selectorId: lastSelector?.id || activePlayers[0].id,
        receiverId: lastPlayer.id,
        envelope: lastEnvelope,
        selectionOrder: round.selections.length,
        isAutoSelected: true,
      },
    })

    // Random elimination - pick one envelope to eliminate
    const allEnvelopes = [...usedEnvelopes, lastEnvelope]
    const eliminatedEnvelope = allEnvelopes[Math.floor(Math.random() * allEnvelopes.length)]

    // Find who has the eliminated envelope
    const allSelections = await this.prisma.gameRoundSelection.findMany({
      where: { roundId: round.id },
    })
    const eliminatedSelection = allSelections.find((s) => s.envelope === eliminatedEnvelope)!
    const eliminatedPlayerId = eliminatedSelection.receiverId

    // Update round with elimination result
    const updatedRound = await this.prisma.$transaction(async (tx) => {
      // Mark player as eliminated
      await tx.gamePlayer.update({
        where: { id: eliminatedPlayerId },
        data: {
          isEliminated: true,
          eliminatedAt: new Date(),
        },
      })

      // Update room prize pool
      const newRemainingPrize = room.remainingPrizeCents - round.eliminationPrizeCents

      // Update round
      const completedRound = await tx.gameRound.update({
        where: { id: round.id },
        data: {
          eliminatedEnvelope,
          eliminatedPlayerId,
          isCompleted: true,
          completedAt: new Date(),
        },
        include: {
          selections: true,
          eliminatedPlayer: true,
        },
      })

      // Update room - move to revealing phase
      await tx.gameRoom.update({
        where: { id: room.id },
        data: {
          currentPhase: GamePhase.REVEALING,
          remainingPrizeCents: newRemainingPrize,
          turnDeadline: null,
        },
      })

      return completedRound
    })

    // After a short delay (handled by client), move to next round or game over
    // For now, we'll let the client poll and then call advanceToNextRound

    return th.toInstanceSafe(GameRoundEntity, updatedRound)
  }

  // Advance to next round (called after reveal phase)
  // TODO: Re-enable User type when auth is ready (userId?: bigint -> user: User)
  async advanceToNextRound(roomId: bigint, userId?: bigint): Promise<GameStateEntity> {
    const room = await this.prisma.gameRoom.findUniqueOrThrow({
      where: { id: roomId },
      include: { players: true, rounds: true },
    })

    const userPlayer = room.players.find((p) => p.userId === userId)
    if (!userPlayer) {
      throw new ForbiddenException('You are not in this room')
    }

    if (room.currentPhase !== GamePhase.REVEALING && room.currentPhase !== GamePhase.ROUND_END) {
      throw new BadRequestException('Cannot advance at this phase')
    }

    const activePlayers = room.players.filter((p) => !p.isEliminated)

    // Check if game is over (only 1 player left)
    if (activePlayers.length <= 1) {
      // Game over - winner takes remaining prize
      const winner = activePlayers[0]

      await this.prisma.gameRoom.update({
        where: { id: roomId },
        data: {
          status: GameRoomStatus.FINISHED,
          currentPhase: GamePhase.GAME_OVER,
          winnerId: winner.id,
        },
      })

      return this.getGameState(roomId, userId)
    }

    // Start next round
    const nextRoundNumber = room.currentRound + 1
    const shuffledPlayerIds = this.shuffleArray(activePlayers.map((p) => p.id))
    const turnDeadline = new Date(Date.now() + TURN_TIMEOUT_MS)

    await this.prisma.$transaction(async (tx) => {
      // Update player turn orders
      for (let i = 0; i < shuffledPlayerIds.length; i++) {
        await tx.gamePlayer.update({
          where: { id: shuffledPlayerIds[i] },
          data: { turnOrder: i },
        })
      }

      // Create next round
      await tx.gameRound.create({
        data: {
          roomId: room.id,
          roundNumber: nextRoundNumber,
          turnOrder: JSON.stringify(shuffledPlayerIds.map((id) => id.toString())),
          eliminationPrizeCents: ELIMINATION_PRIZES[nextRoundNumber - 1],
        },
      })

      // Update room state
      await tx.gameRoom.update({
        where: { id: room.id },
        data: {
          currentPhase: GamePhase.SELECTING_ENVELOPE,
          currentRound: nextRoundNumber,
          currentTurnIndex: 0,
          turnDeadline,
        },
      })
    })

    return this.getGameState(roomId, userId)
  }

  // Process timeouts (called by scheduler/cron)
  async processTimeouts(): Promise<{ roomId: bigint; autoSelections: number }[]> {
    const expiredRooms = await this.prisma.gameRoom.findMany({
      where: {
        status: GameRoomStatus.PLAYING,
        currentPhase: GamePhase.SELECTING_ENVELOPE,
        turnDeadline: { lt: new Date() },
      },
      include: {
        players: true,
        rounds: {
          where: { isCompleted: false },
          include: { selections: true },
        },
      },
    })

    const results: { roomId: bigint; autoSelections: number }[] = []

    for (const room of expiredRooms) {
      const currentRound = room.rounds[0]
      if (!currentRound) continue

      const turnOrder = JSON.parse(currentRound.turnOrder) as string[]
      const currentPlayerId = BigInt(turnOrder[room.currentTurnIndex])
      const activePlayers = room.players.filter((p) => !p.isEliminated)

      const usedEnvelopes = currentRound.selections.map((s) => s.envelope)
      const usedReceiverIds = currentRound.selections.map((s) => s.receiverId)

      const availableEnvelopes = ALL_ENVELOPES.filter((e) => !usedEnvelopes.includes(e))
      const availableReceivers = activePlayers.filter((p) => !usedReceiverIds.includes(p.id))

      if (availableEnvelopes.length === 0 || availableReceivers.length === 0) continue

      // Random selection
      const randomEnvelope = availableEnvelopes[Math.floor(Math.random() * availableEnvelopes.length)]
      const randomReceiver = availableReceivers[Math.floor(Math.random() * availableReceivers.length)]

      // Create auto-selection
      await this.prisma.gameRoundSelection.create({
        data: {
          roundId: currentRound.id,
          selectorId: currentPlayerId,
          receiverId: randomReceiver.id,
          envelope: randomEnvelope,
          selectionOrder: currentRound.selections.length,
          isAutoSelected: true,
        },
      })

      // Check if round is complete
      const selectionsNeeded = activePlayers.length - 1
      if (currentRound.selections.length + 1 >= selectionsNeeded) {
        await this.completeRoundSelections(currentRound.id)
      } else {
        // Move to next turn
        const nextTurnDeadline = new Date(Date.now() + TURN_TIMEOUT_MS)
        await this.prisma.gameRoom.update({
          where: { id: room.id },
          data: {
            currentTurnIndex: room.currentTurnIndex + 1,
            turnDeadline: nextTurnDeadline,
          },
        })
      }

      results.push({ roomId: room.id, autoSelections: 1 })
    }

    return results
  }

  // Get round details
  async getRound(roundId: bigint): Promise<GameRoundEntity> {
    const round = await this.prisma.gameRound.findUniqueOrThrow({
      where: { id: roundId },
      include: {
        selections: true,
        eliminatedPlayer: true,
      },
    })
    return th.toInstanceSafe(GameRoundEntity, round)
  }
}
