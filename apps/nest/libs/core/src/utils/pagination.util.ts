import { BasePaginationEntity } from '../entities/base-pagination.entity'
import { th } from '@app/helper/transform.helper'

export interface PaginationParams {
  page?: number
  perPage?: number
}

export interface PaginationResult<T> {
  data: T[]
  pagination: BasePaginationEntity
}

export class PaginationUtil {
  /**
   * Calculate pagination metadata
   */
  static calculatePagination(page: number, perPage: number, total: number): BasePaginationEntity {
    const totalPages = Math.ceil(total / perPage)

    const paginationData = {
      page,
      perPage,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    }

    return th.toInstanceSafe(BasePaginationEntity, paginationData)
  }

  /**
   * Calculate skip value for Prisma queries
   */
  static calculateSkip(page: number, perPage: number): number {
    return (page - 1) * perPage
  }

  /**
   * Validate and normalize pagination parameters
   */
  static normalizeParams(params: PaginationParams): {
    page: number
    perPage: number
    skip: number
  } {
    const page = Math.max(1, params.page || 1)
    const perPage = Math.min(100, Math.max(1, params.perPage || 20))
    const skip = this.calculateSkip(page, perPage)

    return { page, perPage, skip }
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse<T>(data: T[], page: number, perPage: number, total: number): PaginationResult<T> {
    const pagination = this.calculatePagination(page, perPage, total)

    return {
      data,
      pagination,
    }
  }
}
