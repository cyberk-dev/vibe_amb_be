import { ApiProperty } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsHash, IsNotEmpty, IsString } from 'class-validator'

export class ConfirmDto {
  @Expose()
  @ApiProperty({ example: 'user1@gmail.com', required: true })
  @IsString()
  @IsHash('sha256')
  @IsNotEmpty()
  readonly code: string
}
