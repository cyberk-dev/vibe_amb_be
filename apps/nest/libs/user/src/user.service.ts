import { th } from '@app/helper'
import { BadRequestException, Injectable } from '@nestjs/common'
import { UserProvider, Prisma, Role } from '@prisma/client'
import { PrismaService } from 'nestjs-prisma'
import { UserEntity } from './entities/user.entity'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * Have to be called from internal logic only
   */
  async create(createUserDto: Prisma.UserCreateInput): Promise<UserEntity> {
    let user: UserEntity
    try {
      user = th.toInstanceUnsafe(UserEntity, await this.prisma.user.create({ data: createUserDto }))
    } catch (err) {
      const error = err as PrismaClientKnownRequestError
      if (error.message.includes('Unique constraint failed on the fields: (`username`,`provider`)')) {
        throw new BadRequestException('User already exists', { cause: error })
      } else {
        throw err
      }
    }
    return user
  }

  async findAll(params = {}) {
    const users = await this.prisma.user.findMany(params)
    return th.toInstancesSafe(UserEntity, users)
  }

  async findLocalUserByVerifyCode(verifyCode: string, options = { advantage: false }): Promise<UserEntity | undefined> {
    const user = await this.prisma.user.findUnique({ where: { verifyCode, provider: 'LOCAL' } })
    if (user) {
      if (options.advantage) {
        return th.toInstanceUnsafe(UserEntity, user)
      } else {
        return th.toInstanceSafe(UserEntity, user)
      }
    }
  }

  async findUser(
    username: string,
    provider: UserProvider,
    options = { advantage: false },
  ): Promise<UserEntity | undefined> {
    const user = await this.prisma.user.findUnique({ where: { username_provider: { username, provider } } })
    if (user) {
      if (options.advantage) {
        return th.toInstanceUnsafe(UserEntity, user)
      } else {
        return th.toInstanceSafe(UserEntity, user)
      }
    }
  }

  async findOne(id: bigint, options = { advantage: false }): Promise<UserEntity | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (options.advantage) {
      return th.toInstanceUnsafe(UserEntity, user)
    } else {
      return th.toInstanceSafe(UserEntity, user)
    }
  }

  update(id: bigint, updateUserDto: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    })
  }

  changeRole(id: bigint, role: Role) {
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true },
    })
  }

  remove(id: bigint) {
    return `This action removes a #${id} user`
  }

  async findUserByWalletAddress(walletAddress: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    })
    return user ? th.toInstanceSafe(UserEntity, user) : null
  }
}
