import { before } from '@nestjs/swagger/plugin'

export const name = 'nestjs-swagger-transformer'
export const version = 1
export function factory(cs) {
  return before(
    {
      classValidatorShim: true,
      introspectComments: true,
    },
    cs.program,
  )
}
