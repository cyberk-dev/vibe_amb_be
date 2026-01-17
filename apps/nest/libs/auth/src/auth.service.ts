import { Hash, th } from '@app/helper'
import { UserService } from '@app/user'
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { User, UserProvider } from '@prisma/client'
import { UserJwtPayload as UserJwtPayload } from './models/user.jwt.payload'
import { TokenRefreshResDto, TokenResDto } from './dtos/token.res.dto'
import { RegisterDto } from './dtos/register.dto'
import { ProvidersRegisterService, SocialProviderType } from './services/providers-register.service'
import { ProfileService } from '@app/profile'
import { MailerService } from '@app/mailer'
import { ConfirmDto } from './dtos/confirm.dto'
import { ResetPasswordDto } from './dtos/reset-password.dto'
import { ConfirmResetPasswordDto } from './dtos/confirm.reset-password.dto'
import { Request } from 'express'
import { PrismaService } from 'nestjs-prisma'
import { UserEntity } from '@app/user/entities/user.entity'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { GenerateNonceDto } from './dtos/generate-nonce.dto'
import { SiweMessage, generateNonce as generateSiweNonce } from 'siwe'
import { DateTime } from 'luxon'
import { Cache } from 'cache-manager'
import { NONCE_EXPIRY_IN_MS } from '@app/core/constants/app.constant'

const VERIFY_CODE_EXPIRE_TIME = +process.env.VERIFY_CODE_EXPIRE_TIME

@Injectable()
export class AuthService {
  constructor(
    private _userService: UserService,
    private _profileService: ProfileService,
    private jwtService: JwtService,
    private _providerRegister: ProvidersRegisterService,
    private _mailer: MailerService,
    private _prisma: PrismaService,
    @Inject(CACHE_MANAGER) private _cacheManager: Cache,
  ) {}

  async initProfile(user: UserEntity) {
    const profile = await this._profileService.init(user)
    user.profileId = profile.id
    return th.toInstanceSafe(TokenResDto, {
      ...(await this.issueToken(user)),
      profile,
    })
  }

  async confirm(req: Request, dto: ConfirmDto) {
    // if (!process.env.UNIT_TEST) throw new HttpException('This feature is currently unsupported.', HttpStatus.GONE)
    const isWebRequest = !!req.headers.accept?.includes('text/html')
    const user = await this._userService.findLocalUserByVerifyCode(dto.code, {
      advantage: true,
    })
    let message = 'Nestjs Boilerplate Mail Confirmation Successfully, Please open mobile app to continue use'
    try {
      if (!user) throw new BadRequestException('Invalid code')
      if (user.confirmed) throw new BadRequestException('confirmed')
      const diff = Date.now() - user.verifyCreatedAt.getTime()
      if (diff > VERIFY_CODE_EXPIRE_TIME) {
        throw new BadRequestException('Code is expired')
      }
      const updatedUser = await this._userService.update(user.id, {
        confirmed: true,
        verifyCode: null,
      })

      if (!isWebRequest) {
        return this.issueToken(updatedUser)
      }
    } catch (error) {
      if (isWebRequest) {
        message = error.message
      } else {
        throw error
      }
    }

    return `
<!DOCTYPE html>
<html>
<title>Nestjs Boilerplate Mail Confirmation</title>
<body>

<h1>${message}</h1>

</body>
</html>
    `
  }

  async resendConfirmMail(user: UserEntity) {
    // if (!process.env.UNIT_TEST) throw new HttpException('This feature is currently unsupported.', HttpStatus.GONE)
    if (user.confirmed) throw new BadRequestException('confirmed')
    const verifyCode = Hash.randomHash()
    await this._userService.update(user.id, {
      verifyCode,
      verifyCreatedAt: new Date(),
    })
    return true
  }

  async resetPassword(dto: ResetPasswordDto) {
    // if (!process.env.UNIT_TEST)
    //   throw new HttpException(
    //     'This feature is currently unsupported. Kindly contact the administrator.',
    //     HttpStatus.GONE
    //   )
    const user = await this._userService.findUser(dto.username, 'LOCAL', {
      advantage: true,
    })

    if (user) {
      if (user.confirmed != true) {
        throw new ForbiddenException('Unconfirmed account')
      }
      const verifyCode = Hash.randomDigits()
      await this._userService.update(user.id, {
        verifyCode,
        verifyCreatedAt: new Date(),
      })
    } else {
      throw new NotFoundException('The email does not exist.')
    }
  }

  async confirmResetPassword(dto: ConfirmResetPasswordDto) {
    // if (!process.env.UNIT_TEST)
    //   throw new HttpException(
    //     'This feature is currently unsupported. Kindly use another sign-in method.',
    //     HttpStatus.GONE
    //   )
    const user = await this._userService.findUser(dto.username, 'LOCAL', {
      advantage: true,
    })
    if (!user) throw new BadRequestException('Invalid username')
    const diff = Date.now() - user.verifyCreatedAt.getTime()
    if (diff > VERIFY_CODE_EXPIRE_TIME) {
      throw new BadRequestException('Code is expired')
    } else if (user.verifyCode !== dto.code) {
      throw new BadRequestException('Invalid code')
    }
    const updatedUser = await this._userService.update(user.id, {
      verifyCode: null,
      verifyCodeCount: 0,
      password: Hash.make(dto.password),
    })
    return this.issueToken(updatedUser)
  }

  async validateUser(username: string, provider: UserProvider, pass: string): Promise<UserEntity> {
    const user: User | null = await this._userService.findUser(username, provider, { advantage: true })
    if (user && Hash.compare(pass, user.password)) {
      return th.toInstanceSafe(UserEntity, user)
    }
    return null
  }

  async issueToken(user: User, options = { updateLastLogin: true }) {
    const payload = th.toInstanceSafe(UserJwtPayload, user)
    if (options.updateLastLogin) {
      await this._userService.update(user.id, { lastLoginAt: new Date() })
    }
    return th.toInstanceSafe(TokenResDto, {
      jwt: this.jwtService.sign(
        { ...payload },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRES,
        },
      ),
      jwtRefresh: this.jwtService.sign(
        { ...payload },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES,
        },
      ),
      user: th.toInstanceSafe(UserEntity, user),
    })
  }

  async refreshToken(user: UserEntity) {
    const payload = th.toInstanceSafe(UserJwtPayload, user)
    return th.toInstanceSafe(TokenRefreshResDto, {
      jwt: this.jwtService.sign(
        { ...payload },
        {
          secret: process.env.JWT_SECRET,
          expiresIn: process.env.JWT_EXPIRES,
        },
      ),
    })
  }

  async register(req: Request, dto: RegisterDto, initSpa = false) {
    const passwordHash = Hash.make(dto.password)
    const verifyCode = Hash.randomHash()
    const user = await this._userService.create({
      ...dto,
      password: passwordHash,
      verifyCode,
      verifyCreatedAt: new Date(),
      confirmed: process.env.ENV !== 'spec', // TODO send mail to confirm
      provider: UserProvider.LOCAL,
      role: 'USER',
      lastLoginAt: new Date(),
    })
    return await this.issueToken(user, { updateLastLogin: false })
  }

  async callback(provider: SocialProviderType, accessToken: string) {
    const profile = await this._providerRegister.run(provider, accessToken)
    let user = await this._userService.findUser(profile.email, provider, {
      advantage: true,
    })
    if (!user) {
      user = await this._userService.create({
        username: profile.email,
        provider,
        name: profile.username,
        confirmed: true, // TODO send mail to confirm
        lastLoginAt: new Date(),
      })
      return await this.issueToken(user, { updateLastLogin: false })
    } else {
      if (user.blocked) {
        throw new UnauthorizedException('You are blocked')
      }
      return await this.issueToken(user)
    }
  }

  async signOut(user: UserEntity): Promise<void> {
    try {
      await this._userService.update(user.id, { jwtValidFrom: DateTime.now().toISO() })
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  async generateNonce(address?: string): Promise<GenerateNonceDto> {
    const nonce = generateSiweNonce()
    const key = address ? `nonce:${address}:${nonce}` : `nonce:${nonce}`
    await this._cacheManager.set(key, true, NONCE_EXPIRY_IN_MS)

    return th.toInstanceSafe(GenerateNonceDto, { nonce })
  }

  async loginWithWallet(message: string, signature: string): Promise<any> {
    try {
      const verifiedData = await this._verifySignMessage(message, signature)

      const walletAddress = verifiedData.address

      let user = await this._userService.findUserByWalletAddress(walletAddress)

      if (!user) {
        // Auto-register: Create new user on first wallet login
        // Similar to social login (Google/Facebook) - automatically creates account
        // when user connects wallet for the first time
        user = await this._userService.create({
          username: walletAddress.toLowerCase(),
          name: walletAddress.toLowerCase(),
          confirmed: true, // TODO send mail to confirm
          provider: UserProvider.wallet,
          role: 'USER',
          lastLoginAt: new Date(),
          walletAddress: walletAddress.toLowerCase(),
          networkId: verifiedData.chainId,
        })
      }

      if (user.blocked) {
        throw new UnauthorizedException('You are blocked')
      }

      return await this.issueToken(user)
    } catch (error) {
      console.error('SIWE signature verification failed:', error)
      if (error instanceof UnauthorizedException) {
        throw error
      }
      if (error instanceof Error && error.message.includes('Signature does not match')) {
        throw new UnauthorizedException('Invalid signature.')
      }
      throw new UnauthorizedException('SIWE signature verification failed.')
    }
  }

  private async _verifySignMessage(message: string, signature: string): Promise<SiweMessage | null> {
    try {
      const siweMessage = new SiweMessage(message)
      const nonce = siweMessage.nonce
      const address = siweMessage.address
      const key = address ? `nonce:${address}:${nonce}` : `nonce:${nonce}`

      const cachedNonce = await this._cacheManager.get<string>(key)

      if (!cachedNonce) {
        throw new UnauthorizedException('Invalid or expired nonce.')
      } else {
        await this._cacheManager.del(key)
      }

      const { data: verifiedData } = await siweMessage.verify({
        signature,
        domain: process.env.SIWE_DOMAIN,
      })

      return verifiedData
    } catch (error) {
      throw new UnauthorizedException('SIWE signature verification failed.')
    }
  }
}
