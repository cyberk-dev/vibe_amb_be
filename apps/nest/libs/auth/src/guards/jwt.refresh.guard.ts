import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {
  constructor() {
    super()
  }

  async canActivate(context: ExecutionContext) {
    const result = (await super.canActivate(context)) as boolean
    // if (context.getType() === 'http') {
    //   const request = context.switchToHttp().getRequest()
    // }
    return !!result
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException()
    }
    return user
  }
}
