import { Prisma } from '@prisma/client'
import random from 'lodash/random'
import { PrismaService } from 'nestjs-prisma'
import { PrismaTransaction } from './prisma.helper'

const delay = (miniseconds: number) => new Promise((resolve) => setTimeout(resolve, miniseconds))
const delayTo = async (date: Date | string, offsetMiliseconds = 0) => {
  if (typeof date === 'string') {
    date = new Date(date)
  }
  const mili = date.getTime() - Date.now() + offsetMiliseconds
  if (mili > 0) await delay(mili)
}
const transactionRetry = async <T>(
  task: () => Promise<T>,
  options = { maxTimes: !!process.env.LOCAL_DEV ? 10 : 3 },
) => {
  let retries = 0

  let result: T
  while (retries < options.maxTimes) {
    try {
      result = await task()
      break
    } catch (error) {
      if (error.code === 'P2034') {
        retries++
        await delay(random(50, 1000))
        continue
      }
      // console.error('error=', error)
      throw error
    }
  }

  return result
}
const prismaTransaction = async <T>(prisma: PrismaService, task: (t: PrismaTransaction) => Promise<T>) => {
  return transactionRetry(() =>
    prisma.$transaction((t) => task(t as any), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }),
  )
}
export const promiseHelper = {
  delay,
  delayTo,
  oneTime<T>(task: () => Promise<T>) {
    let _init = false
    let _task: any = null
    let _result: T
    return async (): Promise<T> => {
      if (_init) return _result
      if (_task) return await _task
      _task = task()
      try {
        _result = await _task
        _init = true
        return _result
      } catch (error) {
        _task = null
        throw error
      }
    }
  },
  transactionRetry,
  prismaTransaction,
  async retry<T>(task: () => Promise<T>, options = { maxTimes: 5 }) {
    let retries = 0

    let result: T
    while (retries < options.maxTimes) {
      try {
        result = await task()
        break
      } catch {
        retries++
        await delay(random(50, 1000))
        continue
      }
    }

    return result
  },
}

export const proH = promiseHelper
