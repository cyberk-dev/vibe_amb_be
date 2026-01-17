import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator'
import { DateTime } from 'luxon'
import path from 'path'
import { dth, mergeObjs } from '.'
import uniqBy from 'lodash/uniqBy'

import { ValidationPipe } from '@nestjs/common'

export const defaultValidatorPipe = new ValidationPipe({
  transform: true,
  transformOptions: { strategy: 'excludeAll', exposeUnsetFields: false },
})

@ValidatorConstraint({ name: 'IsFileNameContraint', async: false })
export class IsFileNameContraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    return value && path.basename(value) === value
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} is not filename`
  }
}

export function IsDateBefore(
  callback: (value: any) => Promise<DateTime> | DateTime,
  validationOptions?: ValidationOptions,
) {
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      name: 'IsDateBefore',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [callback],
      options: validationOptions,
      validator: {
        async validate(value: any, args: ValidationArguments) {
          if (!value) return true
          value = dth.parse(value)
          const [callback] = args.constraints
          const date: DateTime = await callback(args.object)
          return date > value
        },
      },
    })
  }
}

export function IsUniqArray(callback?: (value: any) => Promise<any> | any, validationOptions?: ValidationOptions) {
  validationOptions = mergeObjs({ message: 'Array must be unique' }, validationOptions)
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      name: 'IsUniqArray',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [callback],
      options: validationOptions,
      validator: {
        async validate(value: any, args: ValidationArguments) {
          if (!value) return true
          const [callback] = args.constraints
          return (
            uniqBy(value, (v) => {
              if (callback) {
                return callback(v)
              }
              return v
            }).length === value.length
          )
        },
      },
    })
  }
}

export function IsDateAfter(
  callback: (value: any) => Promise<DateTime> | DateTime,
  validationOptions?: ValidationOptions,
) {
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      name: 'IsDateAfter',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [callback],
      options: validationOptions,
      validator: {
        async validate(value: any, args: ValidationArguments) {
          if (!value) return true

          value = dth.parse(value)

          const [callback] = args.constraints
          const date = await callback(args.object)
          return date < value
        },
      },
    })
  }
}

export function ValidateWith(
  callback: (value: any, object: Record<string, any>) => Promise<boolean> | boolean,
  validationOptions?: ValidationOptions,
) {
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      name: 'ValidateWith',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [callback],
      options: validationOptions,
      validator: {
        async validate(value: any, args: ValidationArguments) {
          const [callback] = args.constraints
          return Boolean(await callback(value, args.object))
        },
      },
    })
  }
}

export function IsIncludeOnlyKeys(keys: string[], validationOptions?: ValidationOptions) {
  let errorKey = ''
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      name: 'IsIncludeOnlyKeys',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          errorKey = ''
          if (!value) return true
          for (const key of Array.isArray(value) ? value : Object.keys(value)) {
            if (!keys.includes(key)) {
              errorKey = key
              return false
            }
          }
          return true
        },
        defaultMessage(args: ValidationArguments) {
          return `${propertyName} has invalid key: ${errorKey}`
        },
      },
    })
  }
}

export function IsIncludeOnlyValues(values: any[], validationOptions?: ValidationOptions) {
  let errorValue: any = ''
  return (object: Record<string, any>, propertyName: string) => {
    registerDecorator({
      name: 'IsIncludeOnlyValues',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          errorValue = ''
          if (!value) return true
          for (const v of Object.values(value)) {
            if (!values.includes(v)) {
              errorValue = v
              return false
            }
          }
          return true
        },
        defaultMessage(args: ValidationArguments) {
          return `${propertyName} has invalid value: ${errorValue}`
        },
      },
    })
  }
}
