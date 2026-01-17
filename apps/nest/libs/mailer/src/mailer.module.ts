import { Module } from '@nestjs/common'
import { MailerService } from './services/mailer.service'
import { MailerMockService } from './services/mailer.service.mock'

@Module({
  providers: [
    {
      provide: MailerService,
      useClass: process.env.ENV === 'spec' ? MailerMockService : MailerService,
      // useClass: MailerService,
    },
  ],
  exports: [MailerService],
  imports: [],
})
export class MailerModule {}
