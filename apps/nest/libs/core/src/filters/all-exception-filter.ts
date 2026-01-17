import { normalizeBody } from '@app/helper/object.helper'
import { Catch, ArgumentsHost, HttpException, NotFoundException } from '@nestjs/common'
import { BaseExceptionFilter } from '@nestjs/core'
import { Request } from 'express'
import omit from 'lodash/omit'

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    try {
      const request = host.switchToHttp()?.getRequest<Request>()
      if (request) {
        if (exception?.code === 'P2025') {
          // fallback prisma NotFoundError to nestjs NotFoundException
          exception = new NotFoundException()
        }

        let status, message
        if (exception instanceof HttpException) {
          status = exception.getStatus()
          const res = exception.getResponse() as any
          message = res.error || res.message || res
        } else {
          status = 500
          message = 'Internal server error'
        }
        if (!process.env.LOCAL_DEV) {
          console.log('AppException=', {
            status,
            message,
            path: request.path,
            method: request.method,
            params: request.params,
            body: normalizeBody(request.body),
          })

          console.error('AppException=', exception)
        }
      }
    } catch (error) {
      // should not be here anyway
      console.error('HttpExceptionFilter.err=', error)
    }

    super.catch(exception, host)
  }
}
