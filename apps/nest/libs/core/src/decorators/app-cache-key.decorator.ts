import { ExecutionContext, SetMetadata } from '@nestjs/common'
import { Request } from 'express'

export const APP_CACHE_KEY_KEY = 'app-cache-key'
export const AppCacheKey = (key: string | ((request: Request, context?: ExecutionContext) => string)) =>
  SetMetadata(APP_CACHE_KEY_KEY, key)
