import { AuthModule } from '@app/auth'
import { TokenResDto } from '@app/auth/dtos/token.res.dto'
import { setupNestApp } from '@app/core/setup-nest-app'
import { ProfileModule } from '@app/profile'
import { UserModule } from '@app/user'
import { UserEntity } from '@app/user/entities/user.entity'
import { INestApplication, HttpStatus, ModuleMetadata } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Role } from '@prisma/client'
import { randomUUID } from 'crypto'
import { PrismaService } from 'nestjs-prisma'
import request from 'supertest'
import { CoreModule } from '@app/core/core.module'

function buildExpectStatus(res: request.Response, expectedStatus: HttpStatus) {
  return {
    pass: res.statusCode == expectedStatus,
    message: () =>
      `expected ${res.statusCode} to be ${expectedStatus}, url=${(res as any)?.request?.url}, body=${JSON.stringify(
        res?.body || {},
      )}`,
  }
}

const toBeBad = (res: request.Response, message?: string | RegExp) => {
  const pass =
    res.statusCode == HttpStatus.BAD_REQUEST &&
    (!message || typeof message == 'string' ? message == res.body.message : message.test(res.body.message))
  let error = ''
  if (res.statusCode != HttpStatus.BAD_REQUEST) {
    error = `expected ${res.statusCode} to be ${HttpStatus.BAD_REQUEST}, `
  } else if (!!message) {
    error = `expected ${res.body.message} to be ${message}, `
  }
  return {
    pass,
    message: () => `${error}url=${(res as any)?.request?.url}, body=${JSON.stringify(res?.body || {})}`,
  }
}

expect.extend({
  toBeBad,
  toBeOK: (res: request.Response) => buildExpectStatus(res, HttpStatus.OK),
  toBeCreated: (res: request.Response) => buildExpectStatus(res, HttpStatus.CREATED),
  toBe404: (res: request.Response) => buildExpectStatus(res, HttpStatus.NOT_FOUND),
  toBeUnauthorized: (res: request.Response) => buildExpectStatus(res, HttpStatus.UNAUTHORIZED),
})

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeOK(): R
      toBeCreated(): R
      toBe404(): R
      toBeBad(message: string | RegExp): R
      toBeUnauthorized(): R
    }
  }
}

export interface IAccountGenerator {
  initProfile?: boolean
  username?: string
  password?: string
  role?: Role
  autoConfirm?: boolean
}

const defaultAccGen: () => IAccountGenerator = () => ({
  initProfile: true,
  autoConfirm: true,
  role: 'USER',
})

export class TestContext {
  prisma: PrismaService
  superAdmin: TokenResDto
  private _createdUsers: UserEntity[] = []

  constructor(
    public app: INestApplication,
    private _testModule: TestingModule,
  ) {
    this.prisma = app.get(PrismaService)
  }

  async setupSuperAdmin() {
    const res = await this.request()
      .post('/auth/local')
      .send({ username: process.env.SUPER_ADMIN_USERNAME, password: process.env.SUPER_ADMIN_PASSWORD })
    if (res.statusCode == HttpStatus.OK) {
      this.superAdmin = res.body
    } else {
      console.warn('super admin not found', res.body)
    }
  }

  request() {
    return request(this.app.getHttpServer())
  }

  requestSuperAdmin(callback: (st: request.Agent) => request.Test) {
    return callback(this.request()).set('Authorization', `Bearer ${this.superAdmin.jwt}`)
  }

  buildUserContext(userInfo: Partial<Omit<TokenResDto, 'profile'>>) {
    const requestFunc = this.request.bind(this)
    let jwt = userInfo.jwt

    const setJwt = (_jwt: string) => {
      jwt = _jwt
    }

    return {
      userInfo,
      setJwt,
      request(callback: (st: request.Agent) => request.Test) {
        return callback(requestFunc()).set('Authorization', `Bearer ${jwt}`)
      },
      promoteAdmin: (userId: bigint) => this.promoteAdmin(userId),
    }
  }

  async promoteAdmin(userId: bigint) {
    await this.requestSuperAdmin((r) => r.patch(`/user/promote-admin/${userId}`)).send()
  }

  async generateAcount(options: IAccountGenerator = defaultAccGen()) {
    options = {
      ...defaultAccGen(),
      ...options,
    }
    const username = options.username || randomUUID() + '@mail.com'
    const password = options.password || randomUUID()
    let res = await this.request().post('/auth/local/register').send({ username, password }).expect(HttpStatus.CREATED)

    if (options.autoConfirm) {
      await this.prisma.user.update({
        where: { id: res.body.user.id },
        data: { confirmed: true, verifyCode: null },
      })
    }
    let userContext = this.buildUserContext(res.body)
    if (options.initProfile) {
      res = await userContext.request((t) => t.post('/auth/init-profile')).expect(HttpStatus.CREATED)
    }
    this._createdUsers.push(res.body.user)
    userContext = this.buildUserContext({ ...res.body, user: res.body.user })
    return userContext
  }

  async clean(options = { cleanUsers: true }) {
    if (options.cleanUsers) {
      await this.prisma.user.deleteMany({ where: { id: { in: this._createdUsers.map((u) => u.id) } } })
    }
    await this.app.close()
    await this._testModule.close()
  }
}

const createContext = async (meta: ModuleMetadata = {}) => {
  let moduleFixture: TestingModule
  let app: INestApplication
  try {
    moduleFixture = await Test.createTestingModule({
      imports: [CoreModule, AuthModule, UserModule, ProfileModule, ...(meta.imports || [])],
      controllers: [...(meta.controllers || [])],
      providers: [...(meta.providers || [])],
    }).compile()

    app = moduleFixture.createNestApplication()

    setupNestApp(app)

    await app.init()

    const tc = new TestContext(app, moduleFixture)
    await tc.setupSuperAdmin()
    return tc
  } catch (error) {
    app?.close()
    moduleFixture?.close()
    throw error
  }
}

export type UserContextTestType = ReturnType<TestContext['buildUserContext']>

export const testHelper = {
  createContext,
}
