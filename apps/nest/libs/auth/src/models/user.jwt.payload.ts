import { UserEntity } from '@app/user/entities/user.entity'
import { PickType } from '@nestjs/swagger'

export class UserJwtPayload extends PickType(UserEntity, [
  'id',
  'username',
  'profileId',
  'blocked',
  'role',
  'confirmed',
]) {}
