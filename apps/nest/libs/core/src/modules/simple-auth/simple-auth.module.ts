import { Module } from '@nestjs/common'
import { JwtSimpleGuard } from './jwt.simple.guard'
import { JwtSimpleStrategy } from './jwt.strategy.simple'

@Module({
  imports: [],
  providers: [JwtSimpleGuard, JwtSimpleStrategy],
  exports: [],
})
export class SimpleAuthModule {}
