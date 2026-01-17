import { ApiProperty, PickType } from '@nestjs/swagger'
import { Expose } from 'class-transformer'
import { IsNotEmpty, IsNumberString, Length } from 'class-validator'
import { RegisterDto } from './register.dto'

export class ConfirmResetPasswordDto extends PickType(RegisterDto, ['username', 'password']) {
  @Expose()
  @ApiProperty({ example: '123123', type: () => String })
  @IsNotEmpty()
  @IsNumberString()
  @Length(6)
  code: string
}
