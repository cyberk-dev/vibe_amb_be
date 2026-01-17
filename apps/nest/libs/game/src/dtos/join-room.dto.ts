import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class JoinRoomDto {
  @ApiProperty({ description: 'Display name for the player in game', maxLength: 50, example: 'Player2' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Expose()
  displayName: string
}
