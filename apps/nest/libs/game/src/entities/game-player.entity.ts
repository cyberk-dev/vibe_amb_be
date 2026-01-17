import { Expose } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class GamePlayerEntity {
  @ApiProperty({ description: 'Unique identifier for the player' })
  @Expose()
  id: bigint

  @ApiProperty({ description: 'User ID of the player' })
  @Expose()
  userId: bigint

  @ApiProperty({ description: 'Display name in game' })
  @Expose()
  displayName: string

  @ApiPropertyOptional({ description: 'Wallet address for prize distribution' })
  @Expose()
  walletAddress?: string

  @ApiProperty({ description: 'Room ID this player belongs to' })
  @Expose()
  roomId: bigint

  @ApiProperty({ description: 'Whether this player has been eliminated' })
  @Expose()
  isEliminated: boolean

  @ApiPropertyOptional({ description: 'When the player was eliminated' })
  @Expose()
  eliminatedAt?: Date

  @ApiProperty({ description: 'Turn order in current round (0-3)' })
  @Expose()
  turnOrder: number

  @ApiProperty({ description: 'When the player joined the room' })
  @Expose()
  createdAt: Date
}

// Extended entity for game state response
export class GamePlayerStateEntity extends GamePlayerEntity {
  @ApiProperty({ description: 'Whether this player has received an envelope this round' })
  @Expose()
  hasReceivedEnvelope: boolean
}
