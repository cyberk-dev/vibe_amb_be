import { ApiProperty } from '@nestjs/swagger'
import { TodoEntity } from './todo.entity'
import { BasePaginationEntity } from '@app/core/entities/base-pagination.entity'
import { Expose, Type } from 'class-transformer'

export class TodoPaginatedResponseEntity {
  @ApiProperty({
    description: 'Array of todos',
    type: [TodoEntity],
    isArray: true,
  })
  @Expose()
  @Type(() => TodoEntity)
  data: TodoEntity[]

  @ApiProperty({
    description: 'Pagination information',
    type: BasePaginationEntity,
  })
  @Expose()
  @Type(() => BasePaginationEntity)
  pagination: BasePaginationEntity
}
