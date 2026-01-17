import { DateTime } from 'luxon'

const parse = (value: any) => {
  if (value instanceof Date) {
    return DateTime.fromJSDate(value)
  }
  if (typeof value === 'string') {
    return DateTime.fromISO(value)
  }
  if (typeof value === 'number') {
    return DateTime.fromJSDate(new Date(value))
  }
  if (value instanceof DateTime) {
    return value
  }
  throw new Error('Invalid date')
}

export const datetimeHelper = {
  parse,
}
export const dth = datetimeHelper
