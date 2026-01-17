import { ValidationPipe } from '@nestjs/common'

export const defaultValidatorPipe = new ValidationPipe({
  transform: true,
  transformOptions: { strategy: 'excludeAll', exposeUnsetFields: false },
})
