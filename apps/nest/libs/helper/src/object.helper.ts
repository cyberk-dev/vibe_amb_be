import deepmerge from 'deepmerge'
import isEqual from 'lodash/isEqual'
import omit from 'lodash/omit'
import orderBy from 'lodash/orderBy'

export const mergeObjs = (obj1, obj2) => {
  return deepmerge(obj1 || {}, obj2 || {}) as any
}

export const compareArrays = (arr1 = [], arr2 = []) => {
  return isEqual(orderBy(arr1.map((x) => x.toString())), orderBy(arr2.map((x) => x.toString())))
}

export const normalizeBody = (body: any) => {
  // ignore sensitive informations
  return Object.entries(omit(body || {}, ['password'])).reduce((prev, [key, value]) => {
    if (value instanceof Object) {
      return { ...prev, [key]: normalizeBody(value) }
    } else {
      return { ...prev, [key]: value }
    }
  }, {})
}

export const cleanObject = (obj: any) => {
  // if property is null or undefined, remove it
  // recursive if property is object or array
  if (!obj) return obj
  return Object.entries(obj || {}).reduce((prev, [key, value]) => {
    if (value == null || value === undefined) {
      return prev
    } else if (value instanceof Date) {
      return { ...prev, [key]: value }
    } else if (value instanceof Object) {
      return { ...prev, [key]: cleanObject(value) }
    } else {
      return { ...prev, [key]: value }
    }
  }, {})
}
