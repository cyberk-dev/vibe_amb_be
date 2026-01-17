import { UnauthorizedException } from '@nestjs/common'
import { JwtService, JwtSignOptions } from '@nestjs/jwt'
import { ExtractJwt } from 'passport-jwt'

const bearerExtract = ExtractJwt.fromAuthHeaderAsBearerToken()

const getToken = (event) => {
  const { headers } = event
  const parsedEvent = {
    headers: { authorization: headers.Authorization || headers.authorization },
  }
  return bearerExtract(parsedEvent as any)
}

const issueToken = (jwtService: JwtService, payload, options: JwtSignOptions) => {
  return jwtService.sign(payload, {
    secret: process.env.JWT_SECRET,
    ...options,
  })
}

const verifyToken = (jwtService: JwtService, token: string) => {
  try {
    return jwtService.verify(token, {
      secret: process.env.JWT_SECRET,
    })
  } catch (error) {
    throw new UnauthorizedException(error?.message)
  }
}

const verifyEventRequest = (jwtSerice: JwtService, event) => {
  const token = getToken(event)
  return verifyToken(jwtSerice, token)
}

export const jwtHelper = {
  getToken,
  issueToken,
  verifyToken,
  verifyEventRequest,
}
