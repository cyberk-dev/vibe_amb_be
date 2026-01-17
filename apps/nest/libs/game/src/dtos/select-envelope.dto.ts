import { ApiProperty } from '@nestjs/swagger'
import { Envelope } from '@prisma/client'
import { Expose, Type } from 'class-transformer'
import { IsEnum, IsNotEmpty } from 'class-validator'

export class SelectEnvelopeDto {
  @ApiProperty({ enum: Envelope, description: 'The envelope to select (A, B, C, or D)', example: 'A' })
  @IsEnum(Envelope)
  @IsNotEmpty()
  @Expose()
  envelope: Envelope

  @ApiProperty({ description: 'ID of the player who will receive this envelope', example: '2' })
  @IsNotEmpty()
  @Type(() => BigInt)
  @Expose()
  receiverId: bigint
}
