import { UserModule } from '@app/user'
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { JwtGuard } from './guards/jwt.guard'
import { JwtStrategy } from './strategies/jwt.strategy'
import { LocalGuard } from './guards/local.guard'
import { LocalStrategy } from './strategies/local.strategy'
import { ProvidersRegisterService } from './services/providers-register.service'
import { JwtRefreshGuard } from './guards/jwt.refresh.guard'
import { JwtRefreshStrategy } from './strategies/jwt.refresh.strategy'
import { ProfileModule } from '@app/profile'
import { MailerModule } from '@app/mailer'

@Module({
  imports: [MailerModule, UserModule, ProfileModule, PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule],
  providers: [
    AuthService,
    ProvidersRegisterService,
    LocalStrategy,
    LocalGuard,
    JwtStrategy,
    JwtGuard,
    JwtRefreshGuard,
    JwtRefreshStrategy,
  ],
  exports: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
