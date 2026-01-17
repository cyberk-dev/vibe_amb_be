import { createParamDecorator, ExecutionContext, ValidationPipe } from '@nestjs/common'

export const RawQuery = () =>
  createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.query
  })(
    new ValidationPipe({
      transform: true,
      validateCustomDecorators: true,
      transformOptions: { exposeUnsetFields: false },
    }),
  )
