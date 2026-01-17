import { Expose, Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Envelope } from '@prisma/client'
import { GamePlayerEntity } from './game-player.entity'

export class GameRoundSelectionEntity {
  @ApiProperty({ description: 'Selection ID' })
  @Expose()
  id: bigint

  @ApiProperty({ description: 'Player who made the selection' })
  @Expose()
  selectorId: bigint

  @ApiProperty({ description: 'Player who received the envelope' })
  @Expose()
  receiverId: bigint

  @ApiProperty({ enum: Envelope, description: 'The envelope selected' })
  @Expose()
  envelope: Envelope

  @ApiProperty({ description: 'Order of selection (0 = first)' })
  @Expose()
  selectionOrder: number

  @ApiProperty({ description: 'Whether this was auto-selected due to timeout' })
  @Expose()
  isAutoSelected: boolean

  @ApiProperty({ description: 'When the selection was made' })
  @Expose()
  createdAt: Date
}

export class GameRoundEntity {
  @ApiProperty({ description: 'Round ID' })
  @Expose()
  id: bigint

  @ApiProperty({ description: 'Room ID' })
  @Expose()
  roomId: bigint

  @ApiProperty({ description: 'Round number (1, 2, or 3)' })
  @Expose()
  roundNumber: number

  @ApiProperty({ description: 'Turn order as JSON array of player IDs' })
  @Expose()
  turnOrder: string

  @ApiPropertyOptional({ enum: Envelope, description: 'The envelope that was eliminated' })
  @Expose()
  eliminatedEnvelope?: Envelope

  @ApiPropertyOptional({ description: 'Player ID who was eliminated' })
  @Expose()
  eliminatedPlayerId?: bigint

  @ApiProperty({ description: 'Prize for eliminated player in cents' })
  @Expose()
  eliminationPrizeCents: number

  @ApiProperty({ description: 'Whether round is completed' })
  @Expose()
  isCompleted: boolean

  @ApiPropertyOptional({ description: 'When the round was completed' })
  @Expose()
  completedAt?: Date

  @ApiProperty({ description: 'When the round was created' })
  @Expose()
  createdAt: Date

  // Relations
  @ApiPropertyOptional({ type: () => [GameRoundSelectionEntity] })
  @Type(() => GameRoundSelectionEntity)
  @Expose()
  selections?: GameRoundSelectionEntity[]

  @ApiPropertyOptional({ type: () => GamePlayerEntity })
  @Type(() => GamePlayerEntity)
  @Expose()
  eliminatedPlayer?: GamePlayerEntity
}
