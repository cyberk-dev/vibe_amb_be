import { Expose, Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Envelope } from '@prisma/client'
import { GameRoomEntity } from './game-room.entity'
import { GamePlayerEntity, GamePlayerStateEntity } from './game-player.entity'
import { GameRoundEntity, GameRoundSelectionEntity } from './game-round.entity'

// Current round state for polling
export class CurrentRoundStateEntity {
  @ApiProperty({ description: 'Round ID' })
  @Expose()
  id: bigint

  @ApiProperty({ description: 'Round number (1, 2, or 3)' })
  @Expose()
  roundNumber: number

  @ApiProperty({ type: [String], description: 'Turn order as array of player IDs' })
  @Expose()
  turnOrder: string[]

  @ApiPropertyOptional({ description: 'Current turn player ID' })
  @Expose()
  currentTurnPlayerId?: bigint

  @ApiProperty({ type: [String], description: 'Available envelopes to select' })
  @Expose()
  availableEnvelopes: Envelope[]

  @ApiProperty({ type: [String], description: 'Player IDs who can still receive envelopes' })
  @Expose()
  availableReceivers: string[]

  @ApiProperty({ type: () => [GameRoundSelectionEntity] })
  @Type(() => GameRoundSelectionEntity)
  @Expose()
  selections: GameRoundSelectionEntity[]

  @ApiPropertyOptional({ enum: Envelope })
  @Expose()
  eliminatedEnvelope?: Envelope

  @ApiPropertyOptional({ type: () => GamePlayerEntity })
  @Type(() => GamePlayerEntity)
  @Expose()
  eliminatedPlayer?: GamePlayerEntity

  @ApiPropertyOptional({ description: 'Prize for eliminated player in cents' })
  @Expose()
  eliminationPrizeCents?: number
}

// Full game state for polling response
export class GameStateEntity {
  @ApiProperty({ type: () => GameRoomEntity })
  @Type(() => GameRoomEntity)
  @Expose()
  room: GameRoomEntity

  @ApiProperty({ type: () => [GamePlayerStateEntity] })
  @Type(() => GamePlayerStateEntity)
  @Expose()
  players: GamePlayerStateEntity[]

  @ApiPropertyOptional({ type: () => CurrentRoundStateEntity })
  @Type(() => CurrentRoundStateEntity)
  @Expose()
  currentRound?: CurrentRoundStateEntity

  @ApiProperty({ description: 'Whether it is the current user turn' })
  @Expose()
  myTurn: boolean

  @ApiProperty({ type: () => GamePlayerStateEntity })
  @Type(() => GamePlayerStateEntity)
  @Expose()
  myPlayer: GamePlayerStateEntity

  @ApiPropertyOptional({ description: 'Seconds remaining for current turn' })
  @Expose()
  timeRemaining?: number

  // For GAME_OVER phase
  @ApiPropertyOptional({ type: () => GamePlayerEntity })
  @Type(() => GamePlayerEntity)
  @Expose()
  winner?: GamePlayerEntity

  @ApiPropertyOptional({ type: () => [RoundHistoryEntity] })
  @Type(() => RoundHistoryEntity)
  @Expose()
  roundHistory?: RoundHistoryEntity[]
}

// Round history for game over state
export class RoundHistoryEntity {
  @ApiProperty()
  @Expose()
  roundNumber: number

  @ApiProperty()
  @Expose()
  eliminatedPlayerName: string

  @ApiProperty({ enum: Envelope })
  @Expose()
  eliminatedEnvelope: Envelope

  @ApiProperty()
  @Expose()
  prizeCents: number
}

// Selection result response
export class SelectionResultEntity {
  @ApiProperty({ type: () => GameRoundSelectionEntity })
  @Type(() => GameRoundSelectionEntity)
  @Expose()
  selection: GameRoundSelectionEntity

  @ApiPropertyOptional({ description: 'Next turn info if round continues' })
  @Expose()
  nextTurn?: {
    currentTurnIndex: number
    currentTurnPlayerId: bigint
    turnDeadline: Date
    availableEnvelopes: Envelope[]
    availableReceivers: string[]
  }

  @ApiPropertyOptional({ description: 'Set if round just completed', type: () => GameRoundEntity })
  @Type(() => GameRoundEntity)
  @Expose()
  completedRound?: GameRoundEntity
}
