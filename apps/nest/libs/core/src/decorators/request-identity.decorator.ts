import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { UAParser } from 'ua-parser-js'

export interface RequestIdendity {
  ip: string
  isIpV6: boolean
  userAgent?: string
  os?: string
  osVersion?: string
  deviceModel?: string
  deviceVendor?: string
}

export const RequestIdendity = createParamDecorator<any, any, RequestIdendity>(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    let ip = request.ip
    if (ip === '::1') {
      ip = ''
    }
    const forwardIps = request.headers['x-forwarded-for'] || request.headers['X-Forwarded-For']
    if (forwardIps) {
      ip = forwardIps.split(',')[0]
    }
    if (!ip) {
      ip = request.connection?.remoteAddress
    }
    const parser = new UAParser(request.headers['user-agent'])

    const os = parser.getOS()

    return {
      ip,
      isIpV6: ip?.includes(':'),
      userAgent: request.headers['user-agent'],
      os: request.headers['os-type'] || os.name,
      osVersion: request.headers['os-version'] || os.version,
      deviceModel: request.headers['device-model'] || parser.getDevice().model,
      deviceVendor: request.headers['device-vendor'] || parser.getDevice().vendor,
    }
  },
)
