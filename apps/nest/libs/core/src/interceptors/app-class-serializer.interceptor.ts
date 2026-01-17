import { CACHE_MANAGER } from '@nestjs/cache-manager'
import {
  CallHandler,
  ClassSerializerInterceptor,
  ClassSerializerInterceptorOptions,
  ExecutionContext,
  Inject,
  Injectable,
  Optional,
  PlainLiteralObject,
  Response,
} from '@nestjs/common'
import { HttpAdapterHost, Reflector } from '@nestjs/core'
import { Observable, map } from 'rxjs'
import { TRANSFORMER_EXPOSE_ALL_KEY } from '../decorators/transformer-expose-all.decorator'

const REFLECTOR = 'Reflector'

@Injectable()
export class AppClassSerializerInterceptor extends ClassSerializerInterceptor {
  constructor(
    @Optional()
    @Inject()
    protected readonly httpAdapterHost: HttpAdapterHost,
    @Inject(REFLECTOR) protected readonly reflector: any,
    @Optional()
    protected readonly defaultOptions: ClassSerializerInterceptorOptions = {},
  ) {
    super(reflector, defaultOptions)
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextOptions = this.getContextOptions(context)
    const options = {
      ...this.defaultOptions,
      ...contextOptions,
    }
    if (this.reflector.get(TRANSFORMER_EXPOSE_ALL_KEY, context.getHandler())) {
      options.strategy = 'exposeAll'
    }
    return next.handle().pipe(
      map((res: PlainLiteralObject | Array<PlainLiteralObject>) => {
        const req: Response = context.switchToHttp().getResponse()
        const cache = this.httpAdapterHost?.httpAdapter?.getHeader(req, 'X-Cache')
        if (cache === 'HIT') {
          return res
        }
        return this.serialize(res, options)
      }),
    )
  }
}
