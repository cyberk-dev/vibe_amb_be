import { Paramtype } from '@nestjs/common'
import { ClassConstructor, plainToInstance } from 'class-transformer'
import { defaultValidatorPipe } from './class.validator'

const toInstanceSafe = function <T, V>(cls: ClassConstructor<T>, plain: V) {
  try {
    return plainToInstance(cls, fixDecimal(plain), { strategy: 'excludeAll' })
  } catch (error) {
    console.error('toInstanceSafe', error)
    throw error
  }
}

const toInstanceUnsafe = function <T, V>(cls: ClassConstructor<T>, plain: V) {
  return plainToInstance(cls, fixDecimal(plain), { ignoreDecorators: true })
}

const toInstancesSafe = function <T, V>(cls: ClassConstructor<T>, plains: V[]) {
  return (plains || []).map((p) => toInstanceSafe(cls, p))
}

const toInstancesUnsafe = function <T, V>(cls: ClassConstructor<T>, plains: V[]) {
  return (plains || []).map((p) => toInstanceUnsafe(cls, p))
}

const validate = async function <T>(cls: ClassConstructor<T>, plain: T, type: Paramtype = 'custom') {
  return await defaultValidatorPipe.transform(plain, {
    type: type,
    metatype: cls,
  })
}

export const transformHelper = {
  toInstanceSafe,
  toInstancesSafe,
  toInstanceUnsafe,
  toInstancesUnsafe,
  validate,
}

export const th = {
  ...transformHelper,
}

function fixDecimal(obj, cache = []) {
  // just return if obj is immutable value
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // convert [Decimal] to [string]
  if (obj && obj.toFixed && obj.decimalPlaces && obj.toDecimalPlaces) {
    return obj.toString()
  }

  if (obj && Object.prototype.toString.call(obj) === '[object Date]' && !isNaN(obj)) {
    return obj
  }

  // if obj is hit, it is in circular structure
  const hit = cache.find((c) => c.original === obj)
  if (hit) {
    return hit.copy
  }

  const copy = Array.isArray(obj) ? [] : {}
  // put the copy into cache at first
  // because we want to refer it in recursive deepCopy
  cache.push({
    original: obj,
    copy,
  })

  Object.keys(obj).forEach((key) => {
    copy[key] = fixDecimal(obj[key], cache)
  })

  return copy
}
