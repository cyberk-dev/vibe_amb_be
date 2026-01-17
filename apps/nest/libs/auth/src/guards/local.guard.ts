import { defaultValidatorPipe } from '@app/core'
import { ExecutionContext, Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { LoginDto } from '../dtos/login.dto'

@Injectable()
export class LocalGuard extends AuthGuard('local') {
  async canActivate(context: ExecutionContext) {
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest()
      const { username } = request.body
      request.body.username = username.toLowerCase()
      await defaultValidatorPipe.transform(request.body, {
        type: 'body',
        metatype: LoginDto,
      })
    }
    return (await super.canActivate(context)) as boolean
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    return super.handleRequest(err, user, info, context, status)
  }
}
