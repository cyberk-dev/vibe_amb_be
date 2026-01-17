import { Injectable } from '@nestjs/common'
import SendGrid from '@sendgrid/mail'

@Injectable()
export class MailerService {
  constructor() {
    SendGrid.setApiKey(process.env.SENDGRID)
  }

  sendResetPassword(email: string, code: string) {
    return SendGrid.send({
      from: process.env.MAIL_FROM || 'noreply@yourapp.com',
      subject: 'VIBE Reset Password',
      to: email,
      text: `
      Hi there,

      We received a request to reset your password. Please use the code below to reset it:

      ${code}

      If you did not request a password reset, please disregard this email.

      Thank you,
      `,
    })
  }

  sendVerifyEmail(email: string, code: string) {
    return SendGrid.send({
      from: process.env.MAIL_FROM || 'noreply@yourapp.com',
      subject: 'Confirm your account',
      to: email,
      text: `
      Hi there,

      Thank you for signing up! Please confirm your email address by clicking the link below:

      <a href="${process.env.API_URL || 'http://localhost:3000'}/api/auth/local/confirm?code=${code}">Confirm Email</a>

      If you did not create an account, please ignore this email.

      Thank you,
      `,
    })
  }

  send(data: SendGrid.MailDataRequired) {
    return SendGrid.send(data)
  }
}
