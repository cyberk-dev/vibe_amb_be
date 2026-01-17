import { Expose } from 'class-transformer'
import { ApiProperty } from '@nestjs/swagger'

export class BasePaginationEntity {
  @ApiProperty({
    description: 'Current page number',
    example: 1,
    type: Number,
  })
  @Expose()
  page: number

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
    type: Number,
  })
  @Expose()
  perPage: number

  @ApiProperty({
    description: 'Total number of items',
    example: 100,
    type: Number,
  })
  @Expose()
  total: number

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
    type: Number,
  })
  @Expose()
  totalPages: number

  @ApiProperty({
    description: 'Whether there is a next page',
    example: true,
    type: Boolean,
  })
  @Expose()
  hasNext: boolean

  @ApiProperty({
    description: 'Whether there is a previous page',
    example: false,
    type: Boolean,
  })
  @Expose()
  hasPrev: boolean
}
