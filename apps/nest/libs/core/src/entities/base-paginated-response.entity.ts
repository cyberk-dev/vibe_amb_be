import { ApiProperty } from '@nestjs/swagger'
import { BasePaginationEntity } from './base-pagination.entity'

export class BasePaginatedResponseEntity<T> {
  @ApiProperty({
    description: 'Array of data items',
    isArray: true,
  })
  data: T[]

  @ApiProperty({
    description: 'Pagination information',
    type: BasePaginationEntity,
  })
  pagination: BasePaginationEntity
}
