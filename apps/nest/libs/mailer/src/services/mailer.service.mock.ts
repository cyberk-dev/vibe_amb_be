/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common'
import { ClientResponse, MailDataRequired } from '@sendgrid/mail'

@Injectable()
export class MailerMockService {
  sendResetPassword(email: string, code: string): Promise<[ClientResponse, {}]> {
    return this.send({} as any)
  }
  sendVerifyEmail(email: string, code: string): Promise<[ClientResponse, {}]> {
    return this.send({} as any)
  }
  send(data: MailDataRequired): Promise<[ClientResponse, {}]> {
    return Promise.resolve({} as any)
  }
}
