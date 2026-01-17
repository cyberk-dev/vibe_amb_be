import { HttpStatus, INestApplication } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { RegisterDto } from './dtos/register.dto'
import { TestContext, testHelper, UserContextTestType } from '@app/spec/test.helper'
import { LoginDto } from './dtos/login.dto'
import { Hash } from '@app/helper/hash.helper'
import { UserService } from '@app/user/user.service'
import { proH } from '@app/helper'
import { UserEntity } from '@app/user/entities/user.entity'
import { SiweMessage } from 'siwe'
import { VerifySiweDto } from './dtos/verify-siwe.dto'
import { Wallet } from 'ethers'

describe('Auth', () => {
  let tc: TestContext
  let app: INestApplication
  let prismaService: PrismaService

  beforeAll(async () => {
    tc = await testHelper.createContext()
    app = tc.app
    prismaService = app.get(PrismaService)
  })

  afterAll(async () => {
    await tc?.clean()
  })
  describe('RegisterFailed', () => {
    test('RegisterFailed:InvalidPassword', async () => {
      const res = await tc
        .request()
        .post('/auth/local/register')
        .send({ username: 'huy@cc.com', password: '12312' } as RegisterDto)
      expect(res).toBeBad('password must be longer than or equal to 6 characters')
    })
    test('RegisterFailed:InvalidEmail', async () => {
      const res = await tc
        .request()
        .post('/auth/local/register')
        .send({ username: 'huy@', password: '123123' } as RegisterDto)
      expect(res).toBeBad('username must be an email')
    })
  })
  describe('Register', () => {
    const username = `${Hash.randomHash()}@cc.com`
    const password = '124311'
    let userContext: UserContextTestType
    test('Register:OK', async () => {
      const res = await tc
        .request()
        .post('/auth/local/register')
        .send({ username, password } as RegisterDto)
      expect(res).toBeCreated()
      userContext = tc.buildUserContext(res.body)
      const { jwt, user } = userContext.userInfo
      expect(!!jwt).toEqual(true)
      expect(user.id).not.toBeUndefined()
      expect(user.password).toBeUndefined() // password should be omitted in response
    })
    it('Register:Duplicated', async () => {
      const res = await tc
        .request()
        .post('/auth/local/register')
        .send({ username, password } as RegisterDto)
      expect(res).toBeBad('User already exists')
    })
    test('LoginFailed:InvalidBody', async () => {
      const res = await tc
        .request()
        .post('/auth/local')
        .send({ username, password: '123' } as LoginDto)
        .expect(HttpStatus.BAD_REQUEST)
      expect(res.body.message).toContain('password must be longer than or equal to 6 characters')
    })
    test('LoginFailed:Unauthorized', async () => {
      await tc
        .request()
        .post('/auth/local')
        .send({ username, password: '324123' } as LoginDto)
        .expect(HttpStatus.UNAUTHORIZED)
    })
  })
  describe('Login', () => {
    const username = `${Hash.randomHash()}@cc.com`
    const password = '124231'
    let userContext: UserContextTestType
    test('Login:OK', async () => {
      let res = await tc
        .request()
        .post('/auth/local/register')
        .send({ username, password } as RegisterDto)
      expect(res).toBeCreated()
      res = await tc
        .request()
        .post('/auth/local')
        .send({ username, password } as LoginDto)
      expect(res).toBeOK()
      expect(!!res.body.jwt).toEqual(true)
      expect(res.body.user.id).not.toBeUndefined()
      userContext = tc.buildUserContext(res.body)
      expect(res.body.user.password).toBeUndefined()
    })
    test('Confirm:failed', async () => {
      const res = await userContext.request((r) => r.get('/auth/local/confirm')).query({ code: Hash.randomHash() })
      expect(res).toBeBad('Invalid code')
    })
    test('Confirm:OK', async () => {
      const user = await prismaService.user.findUnique({
        where: { id: userContext.userInfo.user.id },
      })
      const res = await userContext.request((r) => r.get('/auth/local/confirm')).query({ code: user.verifyCode })
      expect(res).toBeOK()
    })
    test('ResendConfirm', async () => {
      const userService = app.get(UserService)
      await userService.update(userContext.userInfo.user.id, { confirmed: false })
      const res = await userContext.request((r) => r.post('/auth/local/resend-confirm'))
      expect(res).toBeOK()
    })
    test('Confirm:Expired', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] })
      jest.advanceTimersByTime(3600000)
      const user = await prismaService.user.findUnique({
        where: { id: userContext.userInfo.user.id },
      })
      const res = await userContext.request((r) => r.get('/auth/local/confirm')).query({ code: user.verifyCode })
      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST)
      expect(res.body.message).toBe('Code is expired')
      jest.useRealTimers()
    })
    test('Confirm:OK', async () => {
      let res = await userContext.request((r) => r.post('/auth/local/resend-confirm'))
      expect(res).toBeOK()
      const user = await prismaService.user.findUnique({
        where: { id: userContext.userInfo.user.id },
      })
      res = await userContext.request((r) => r.get('/auth/local/confirm')).query({ code: user.verifyCode })
      expect(res).toBeOK()
    })
    test('Me:OK', async () => {
      const res = await userContext.request((r) => r.get('/auth/me')).expect(HttpStatus.OK)
      const user: UserEntity = res.body
      expect(user.id).not.toBeUndefined()
      expect(user.password).toBeUndefined()
    })
    test('Token Expired', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick'] })
      jest.setSystemTime(new Date(Date.now() + 24 * 60 * 60 * 1000))
      await userContext.request((r) => r.get('/auth/me')).expect(HttpStatus.UNAUTHORIZED)
      const res = await userContext
        .request((r) => r.get('/auth/refreshToken'))
        .set('Authorization', `Bearer ${userContext.userInfo.jwtRefresh}`)
      expect(res).toBeOK()
      userContext.setJwt(res.body.jwt)
      await userContext.request((r) => r.get('/auth/me')).expect(HttpStatus.OK)
      jest.useRealTimers()
    })
    it('Reset password', async () => {
      let user = await prismaService.user.findUnique({
        where: { id: userContext.userInfo.user.id },
      })
      expect(user.verifyCode).toBeNull()

      let res = await userContext.request((r) => r.post('/auth/local/reset-password')).send({ username })
      expect(res).toBeOK()
      user = await prismaService.user.findUnique({
        where: { id: userContext.userInfo.user.id },
      })
      expect(user.verifyCode).not.toBeNull()
      res = await userContext
        .request((r) => r.post('/auth/local/confirm-reset-password'))
        .send({
          username: user.username,
          code: user.verifyCode,
          password: '9hge9rgh9erhg',
        })
      expect(res).toBeOK()

      userContext = tc.buildUserContext(res.body)
      res = await userContext.request((r) => r.get('/auth/me')).send()
      expect(res).toBeOK()
    })
  })
  describe('SIWE', () => {
    test('GetNonce:OK', async () => {
      const res = await tc.request().get('/auth/siwe/nonce')
      expect(res).toBeOK()
      expect(res.body.nonce).toBeDefined()
      expect(typeof res.body.nonce).toBe('string')
      expect(res.body.nonce.length).toBeGreaterThan(0)
    })
    test('GetNonce:WithAddress', async () => {
      const testAddress = '0x1234567890123456789012345678901234567890'
      const res = await tc.request().get('/auth/siwe/nonce').query({ address: testAddress })
      expect(res).toBeOK()
      expect(res.body.nonce).toBeDefined()
      expect(typeof res.body.nonce).toBe('string')
    })
    test('VerifySiwe:InvalidNonce', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890'
      const invalidNonce = Hash.randomHash()
      const message = new SiweMessage({
        domain: process.env.SIWE_DOMAIN || 'localhost',
        address: walletAddress,
        statement: 'Please sign with your account',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: invalidNonce,
      })
      const messageString = message.prepareMessage()
      const res = await tc
        .request()
        .post('/auth/siwe')
        .send({
          message: messageString,
          signature: '0x' + '0'.repeat(130),
        } as VerifySiweDto)
      expect(res.statusCode).toBe(HttpStatus.UNAUTHORIZED)
      expect(res.body.message).toBe('Invalid or expired nonce.')
    })
    test('VerifySiwe:InvalidSignature', async () => {
      const nonceRes = await tc.request().get('/auth/siwe/nonce')
      const nonce = nonceRes.body.nonce
      const walletAddress = '0x1234567890123456789012345678901234567890'
      const message = new SiweMessage({
        domain: process.env.SIWE_DOMAIN || 'localhost',
        address: walletAddress,
        statement: 'Please sign with your account',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: nonce,
      })
      const messageString = message.prepareMessage()
      const invalidSignature = '0x' + '0'.repeat(130)
      const res = await tc
        .request()
        .post('/auth/siwe')
        .send({
          message: messageString,
          signature: invalidSignature,
        } as VerifySiweDto)
      expect(res.statusCode).toBe(HttpStatus.UNAUTHORIZED)
      expect(res.body.message).toBe('SIWE signature verification failed.')
    })
    test('VerifySiwe:SuccessNewUser', async () => {
      const wallet = Wallet.createRandom()
      const nonceRes = await tc.request().get('/auth/siwe/nonce')
      const nonce = nonceRes.body.nonce
      const message = new SiweMessage({
        domain: process.env.SIWE_DOMAIN || 'localhost:3000',
        address: wallet.address,
        statement: 'Please sign with your account',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: nonce,
      })
      const messageString = message.prepareMessage()
      const signature = await wallet.signMessage(messageString)
      const res = await tc
        .request()
        .post('/auth/siwe')
        .send({
          message: messageString,
          signature: signature,
        } as VerifySiweDto)
      expect(res).toBeOK()
      expect(res.body.jwt).toBeDefined()
      expect(res.body.user).toBeDefined()
      expect(res.body.user.walletAddress).toBe(wallet.address)
      expect(res.body.user.provider).toBe('wallet')
    })
    test('VerifySiwe:SuccessExistingUser', async () => {
      const wallet = Wallet.createRandom()
      const nonceRes1 = await tc.request().get('/auth/siwe/nonce')
      const nonce1 = nonceRes1.body.nonce
      const message1 = new SiweMessage({
        domain: process.env.SIWE_DOMAIN || 'localhost:3000',
        address: wallet.address,
        statement: 'Please sign with your account',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: nonce1,
      })
      const messageString1 = message1.prepareMessage()
      const signature1 = await wallet.signMessage(messageString1)
      await tc
        .request()
        .post('/auth/siwe')
        .send({
          message: messageString1,
          signature: signature1,
        } as VerifySiweDto)
      const nonceRes2 = await tc.request().get('/auth/siwe/nonce')
      const nonce2 = nonceRes2.body.nonce
      const message2 = new SiweMessage({
        domain: process.env.SIWE_DOMAIN || 'localhost:3000',
        address: wallet.address,
        statement: 'Please sign with your account',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: nonce2,
      })
      const messageString2 = message2.prepareMessage()
      const signature2 = await wallet.signMessage(messageString2)
      const res = await tc
        .request()
        .post('/auth/siwe')
        .send({
          message: messageString2,
          signature: signature2,
        } as VerifySiweDto)
      expect(res).toBeOK()
      expect(res.body.jwt).toBeDefined()
      expect(res.body.user).toBeDefined()
      expect(res.body.user.walletAddress).toBe(wallet.address)
    })
    test('VerifySiwe:BlockedUser', async () => {
      const wallet = Wallet.createRandom()
      const nonceRes1 = await tc.request().get('/auth/siwe/nonce')
      const nonce1 = nonceRes1.body.nonce
      const message1 = new SiweMessage({
        domain: process.env.SIWE_DOMAIN || 'localhost:3000',
        address: wallet.address,
        statement: 'Please sign with your account',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: nonce1,
      })
      const messageString1 = message1.prepareMessage()
      const signature1 = await wallet.signMessage(messageString1)
      const createRes = await tc
        .request()
        .post('/auth/siwe')
        .send({
          message: messageString1,
          signature: signature1,
        } as VerifySiweDto)
      const user = await prismaService.user.findUnique({
        where: { walletAddress: wallet.address },
      })
      await prismaService.user.update({
        where: { id: user.id },
        data: { blocked: true },
      })
      const nonceRes2 = await tc.request().get('/auth/siwe/nonce')
      const nonce2 = nonceRes2.body.nonce
      const message2 = new SiweMessage({
        domain: process.env.SIWE_DOMAIN || 'localhost:3000',
        address: wallet.address,
        statement: 'Please sign with your account',
        uri: 'http://localhost',
        version: '1',
        chainId: 1,
        nonce: nonce2,
      })
      const messageString2 = message2.prepareMessage()
      const signature2 = await wallet.signMessage(messageString2)
      const res = await tc
        .request()
        .post('/auth/siwe')
        .send({
          message: messageString2,
          signature: signature2,
        } as VerifySiweDto)
      expect(res.statusCode).toBe(HttpStatus.UNAUTHORIZED)
      expect(res.body.message).toBe('You are blocked')
    })
  })
})
