import { Module } from '@nestjs/common'

import { AuthModule } from '@app/auth/auth.module'
import { CoreModule } from '@app/core/core.module'
import { TodoModule } from '@app/todo/todo.module'
import { GameModule } from '@app/game/game.module'

@Module({
  imports: [CoreModule, AuthModule, TodoModule, GameModule],
  controllers: [],
  providers: [],
})
export class ApiModule {}
