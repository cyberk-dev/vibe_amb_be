import { UserEntity } from '@app/user/entities/user.entity'
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurUser = createParamDecorator<any, any, UserEntity>((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest()
  return request.user as UserEntity
})
