import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNotEmpty, IsString } from 'class-validator'

export class VerifySiweDto {
  @Expose()
  @ApiProperty({ description: 'SIWE message to verify' })
  @IsString()
  @IsNotEmpty()
  message: string

  @Expose()
  @ApiProperty({ description: 'SIWE signature to verify' })
  @IsString()
  @IsNotEmpty()
  signature: string
}
