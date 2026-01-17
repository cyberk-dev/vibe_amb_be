import { Module } from '@nestjs/common'
// TODO: Re-enable auth imports when auth is ready
// import { JwtModule } from '@nestjs/jwt'
import { ScheduleModule } from '@nestjs/schedule'
// import { UserModule } from '@app/user/user.module'
import { GameService } from './game.service'
import { GameController } from './game.controller'
import { GameGateway } from './game.gateway'
import { GameScheduler } from './game.scheduler'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    // TODO: Re-enable JwtModule when auth is ready
    // JwtModule.register({
    //   secret: process.env.JWT_SECRET,
    //   signOptions: { expiresIn: '7d' },
    // }),
    // UserModule,
  ],
  providers: [GameService, GameGateway, GameScheduler],
  exports: [GameService, GameGateway],
  controllers: [GameController],
})
export class GameModule {}
