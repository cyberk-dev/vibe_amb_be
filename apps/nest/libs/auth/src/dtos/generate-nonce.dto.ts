import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsString, IsNotEmpty } from 'class-validator'

export class GenerateNonceDto {
  @Expose()
  @ApiProperty({ description: 'The nonce to generate' })
  @IsString()
  @IsNotEmpty()
  nonce: string
}
