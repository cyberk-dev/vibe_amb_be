import { compareSync, genSaltSync, hashSync } from 'bcryptjs'
import { createHash } from 'crypto'
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util'
import random from 'lodash/random'

const make = (plaintext: string) => {
  const salt = genSaltSync()
  return hashSync(plaintext, salt)
}

const compare = (plaintext: string, hash: string) => {
  return compareSync(plaintext, hash)
}

const randomHash = () => {
  return createHash('sha256').update(randomStringGenerator()).digest('hex')
}

const randomDigits = (length = 6) => {
  let OTP = ''
  for (let i = 0; i < length; i++) {
    OTP += random(0, 9).toString()
  }
  return OTP
}

export const Hash = {
  make,
  compare,
  randomHash,
  randomDigits,
}
