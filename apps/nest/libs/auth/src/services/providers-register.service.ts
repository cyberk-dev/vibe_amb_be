import { BadRequestException, Injectable } from '@nestjs/common'
import { verifyIdToken } from 'apple-signin-auth'
import purest from 'purest'

export type SocialProviderType = 'facebook' | 'apple' | 'google'

@Injectable()
export class ProvidersRegisterService {
  constructor() {}
  run(provider: SocialProviderType, accessToken: string): Promise<{ username: string; email: string }> {
    switch (provider) {
      case 'apple':
        return this.apple(accessToken)
      case 'facebook':
        return this.facebook(accessToken)
      case 'google':
        return this.google(accessToken)
      default:
        throw new BadRequestException('Unknow provider')
    }
  }

  async facebook(accessToken: string) {
    const facebook = purest({ provider: 'facebook' })

    const { body } = await facebook.get('me').auth(accessToken).qs({ fields: 'name,email' }).request()
    return {
      username: (body as any).name,
      email: (body as any).email,
    }
  }

  async google(accessToken: string) {
    const google = purest({ provider: 'google' })

    return (google as any)
      .query('oauth')
      .get('tokeninfo')
      .qs({ accessToken })
      .request()
      .then(({ body }) => ({
        username: body.email.split('@')[0],
        email: body.email,
      }))
  }

  async apple(accessToken: string) {
    const response = await verifyIdToken(accessToken, {
      audience: process.env.IOS_BUNDLE_ID,
      // ignoreExpiration: true, // ignore token expiry (never expires)
    })
    return {
      username: response.email.split('@')[0],
      email: response.email,
    }
  }
}
