import { ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger'
import { CreateTodoDto } from './create-todo.dto'
import { Expose } from 'class-transformer'
import { IsEnum, IsOptional } from 'class-validator'
import { TodoStatus } from '@prisma/client'

class _UpdateTodoDto extends PickType(CreateTodoDto, ['title', 'description']) {
  @ApiPropertyOptional({ enum: TodoStatus })
  @IsEnum(TodoStatus)
  @IsOptional()
  @Expose()
  status?: TodoStatus
}
export class UpdateTodoDto extends PartialType(_UpdateTodoDto) {}
