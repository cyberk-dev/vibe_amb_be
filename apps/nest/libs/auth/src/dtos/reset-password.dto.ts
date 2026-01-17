import { PickType } from '@nestjs/swagger'
import { RegisterDto } from './register.dto'

export class ResetPasswordDto extends PickType(RegisterDto, ['username']) {}
