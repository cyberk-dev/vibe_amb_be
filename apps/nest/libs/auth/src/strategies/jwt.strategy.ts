import { ExtractJwt, Strategy } from 'passport-jwt'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { UserJwtPayload } from '../models/user.jwt.payload'
import { UserService } from '@app/user'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly _userSerivce: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    })
  }

  async validate(payload: UserJwtPayload) {
    if (!payload.id) throw new UnauthorizedException()
    // console.log('JwtStrategy.start', new Date().toISOString())
    const user = await this._userSerivce.findOne(payload.id, {
      advantage: true,
    })
    // console.log('JwtStrategy.end', new Date().toISOString())
    if (!user) throw new UnauthorizedException()
    return user
  }
}
