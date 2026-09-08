/**
 * Pagination types for server actions and UI components
 */

export interface PaginationParams {
  page?: number      // 1-indexed, defaults to 1
  pageSize?: number  // defaults to 10
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginatedResult<T> {
  data: T[]
  pagination: PaginationMeta
}

// Default values
export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

/**
 * Helper to calculate pagination values
 */
export function calculatePagination(
  page: number,
  pageSize: number,
  totalItems: number
): PaginationMeta {
  const totalPages = Math.ceil(totalItems / pageSize)
  
  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  }
}

/**
 * Helper to get skip value for Prisma
 */
export function getSkip(page: number, pageSize: number): number {
  return (page - 1) * pageSize
}
