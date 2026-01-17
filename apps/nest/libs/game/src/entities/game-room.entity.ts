import { Expose, Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { GamePhase, GameRoomStatus } from '@prisma/client'
import { GamePlayerEntity } from './game-player.entity'

export class GameRoomEntity {
  @ApiProperty({ description: 'Unique identifier for the room' })
  @Expose()
  id: bigint

  @ApiProperty({ description: 'When the room was created' })
  @Expose()
  createdAt: Date

  @ApiProperty({ description: 'When the room was last updated' })
  @Expose()
  updatedAt: Date

  @ApiProperty({ description: '6-character room code', example: 'ABC123' })
  @Expose()
  code: string

  @ApiProperty({ enum: GameRoomStatus, description: 'Current room status' })
  @Expose()
  status: GameRoomStatus

  @ApiProperty({ enum: GamePhase, description: 'Current game phase' })
  @Expose()
  currentPhase: GamePhase

  @ApiProperty({ description: 'Total prize pool in cents', example: 2800 })
  @Expose()
  totalPrizeCents: number

  @ApiProperty({ description: 'Remaining prize pool in cents', example: 2800 })
  @Expose()
  remainingPrizeCents: number

  @ApiProperty({ description: 'Current round number (0 = not started, 1-3 = active)', example: 1 })
  @Expose()
  currentRound: number

  @ApiProperty({ description: 'Current turn index (0-3)', example: 0 })
  @Expose()
  currentTurnIndex: number

  @ApiPropertyOptional({ description: 'Deadline for current turn selection' })
  @Expose()
  turnDeadline?: Date

  @ApiPropertyOptional({ description: 'Winner player ID' })
  @Expose()
  winnerId?: bigint

  // Relations
  @ApiPropertyOptional({ type: () => [GamePlayerEntity], description: 'Players in the room' })
  @Type(() => GamePlayerEntity)
  @Expose()
  players?: GamePlayerEntity[]
}

// Response for creating/joining room
export class RoomJoinResponseEntity {
  @ApiProperty({ type: () => GameRoomEntity })
  @Type(() => GameRoomEntity)
  @Expose()
  room: GameRoomEntity

  @ApiProperty({ type: () => GamePlayerEntity })
  @Type(() => GamePlayerEntity)
  @Expose()
  player: GamePlayerEntity
}
