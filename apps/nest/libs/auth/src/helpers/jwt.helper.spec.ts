import { INestApplication, UnauthorizedException } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { jwtHelper } from './jwt.helper'

describe('WSS-AWS', () => {
  let app: INestApplication
  let jwtService: JwtService
  let jwtToken: string

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [JwtModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    await app.init()

    jwtService = app.get(JwtService)
  })
  afterAll(async () => {
    await app.close()
  })
  it('Generate JWT', async () => {
    jwtToken = jwtHelper.issueToken(jwtService, { user: '123' }, { expiresIn: '5s' })
    expect(!!jwtToken).toBe(true)
  })
  it('Get Token', async () => {
    let token = jwtHelper.getToken({
      headers: { authorization: `bearer ${jwtToken}` },
    })
    expect(token).toEqual(jwtToken)
    token = jwtHelper.getToken({
      headers: { Authorization: `bearer ${jwtToken}` },
    })
    expect(token).toEqual(jwtToken)
  })
  it('Verify valid token', async () => {
    expect(() => jwtHelper.verifyToken(jwtService, jwtToken)).not.toThrow()
  })
  it('Verify expired token', async () => {
    jwtToken = jwtService.sign({ user: '123' }, { secret: process.env.JWT_SECRET, expiresIn: '0s' })
    expect(() => jwtHelper.verifyToken(jwtService, jwtToken)).toThrowError(UnauthorizedException)
  })
  it('Verify invalid token', async () => {
    jwtToken = jwtService.sign({ user: '123' }, { secret: 'zxc', expiresIn: '3s' })
    expect(() => jwtHelper.verifyToken(jwtService, jwtToken)).toThrowError(UnauthorizedException)
  })
  it('Verify null token', async () => {
    expect(() => jwtHelper.verifyToken(jwtService, null)).toThrowError(UnauthorizedException)
  })
})
