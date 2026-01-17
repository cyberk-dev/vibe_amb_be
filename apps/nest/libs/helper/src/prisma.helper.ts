import { BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { mergeObjs } from './object.helper'

export type PrismaTransaction = Omit<PrismaService, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>

function defaultPagingMiddleware(): Prisma.Middleware {
  return (params, next) => {
    if (params.action == 'findMany') {
      params.args = mergeObjs({ take: 10 }, params.args)
      if (params.args.take === -1) {
        delete params.args.take
      }
      // if (!unsupportedCreatedAtModels.includes(params.model)) {
      //   params.args = mergeObjs({ orderBy: { createdAt: 'desc' } }, params.args)
      // }
    }
    return next(params)
  }
}

function checkPrismaError(e, options: IPrismaSpecificErrorCheck) {
  options = mergeObjs({ throwError: true }, options)
  const patternMatch = options.pattern && e.message?.includes(options.pattern)
  const errorCodeMatch = options.code && e.code === options.code
  if (patternMatch || errorCodeMatch) {
    if (options.throwError) {
      throw new BadRequestException(options.msg)
    }
    return true
  }
  if (options.throwError) {
    throw e
  }
  return false
}

interface IPrismaErrorCheck {
  msg?: string
  throwError?: boolean
}

interface IPrismaSpecificErrorCheck extends IPrismaErrorCheck {
  pattern?: string
  code?: string
}

export const ph = {
  checkPrismaError,
  findUniqueNotFound: (e, options: IPrismaErrorCheck) => {
    return checkPrismaError(e, { ...options, code: 'P2025' }) as any
  },
  isUpdateNotFound: (e, options: IPrismaErrorCheck) => {
    return checkPrismaError(e, { ...options, pattern: 'Record to update not found.' }) as any
  },
  isDeleteNotFound: (e, options: IPrismaErrorCheck) => {
    return checkPrismaError(e, { ...options, pattern: 'Record to delete does not exist.' }) as any
  },
  isMutationUniqueError: (e, options: IPrismaErrorCheck) => {
    return checkPrismaError(e, { ...options, pattern: 'Unique constraint failed on the fields:' }) as any
  },
  defaultPagingMiddleware,
  buildFindOneQuery: ({ id, query }) => {
    const defaultQuery = { where: { id } }
    if (!id) delete defaultQuery.where
    return mergeObjs(defaultQuery, query)
  },
}
