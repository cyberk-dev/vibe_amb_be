import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateTodoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Expose()
  title: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  @Expose()
  description?: string
}
