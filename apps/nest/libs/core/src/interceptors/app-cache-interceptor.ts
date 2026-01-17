import { CACHE_MANAGER, CacheInterceptor } from '@nestjs/cache-manager'
import { ExecutionContext, Inject, Injectable } from '@nestjs/common'
import { APP_CACHE_KEY_KEY } from '../decorators/app-cache-key.decorator'
import { Reflector } from '@nestjs/core'

@Injectable()
export class AppCacheInterceptor extends CacheInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) protected readonly cacheManager: any,
    protected readonly reflector: Reflector,
  ) {
    super(cacheManager, reflector)
  }

  trackBy(context: ExecutionContext): string | undefined {
    const cacheKey = this.reflector.get(APP_CACHE_KEY_KEY, context.getHandler())
    if (cacheKey) {
      return typeof cacheKey === 'function' ? cacheKey(context.switchToHttp().getRequest(), context) : cacheKey
    }
    return super.trackBy(context)
  }
}
