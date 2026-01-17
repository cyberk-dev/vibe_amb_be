import { EXCLUDE_CONFIRM_KEY } from '@app/core/decorators/exclude-confirm.decorator'
import { EXCLUDE_PROFILE_KEY } from '@app/core/decorators/exclude-profile.decorator'
import { ROLES_KEY } from '@app/core/decorators/role.decorator'
import { BadRequestException, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'
import { Role } from '@prisma/client'
import { jwtDecode } from 'jwt-decode'
import { DateTime } from 'luxon'

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private _reflector: Reflector) {
    super()
  }

  async canActivate(context: ExecutionContext) {
    const result = (await super.canActivate(context)) as boolean
    if (!result) return result

    const request = context.switchToHttp().getRequest()
    const [, token] = request.headers.authorization?.split(' ') // Extract token
    if (token) {
      try {
        const decoded = jwtDecode(token)
        const user = request.user
        if (user?.jwtValidFrom && decoded.iat) {
          const jwtValidFrom = DateTime.fromJSDate(user.jwtValidFrom).toSeconds()
          const tokenIat = decoded.iat
          if (jwtValidFrom - tokenIat > 30) {
            throw new UnauthorizedException('Token has been invalidated. Please login again.')
          }
        }
      } catch (error) {
        // Handle potential decoding errors or redis errors if necessary
        console.error('Error during token validation:', error)
        if (error instanceof UnauthorizedException) throw error // Re-throw specific auth errors
        throw new UnauthorizedException('Invalid token or token validation failed.')
      }
    }

    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest()
      const excludeProfile = this._reflector.getAllAndOverride<boolean>(EXCLUDE_PROFILE_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
      if (request.user.blocked) {
        throw new UnauthorizedException('You are blocked')
      }
      if (!request.user.profileId && !excludeProfile) {
        throw new BadRequestException('User has not initialized the profile yet')
      }
      const excludeConfirm = this._reflector.getAllAndOverride<boolean>(EXCLUDE_CONFIRM_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
      if (!request.user.confirmed && !excludeConfirm) {
        throw new UnauthorizedException('Please confirm your email first')
      }
      const requiredRoles = this._reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
      if (requiredRoles) {
        const role: Role = request.user.role
        return requiredRoles.includes(role)
      }
    }
    return result
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException()
    }
    return user
  }
}
