import { Injectable } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { CreateTodoDto } from './dtos/create-todo.dto'
import { UpdateTodoDto } from './dtos/update-todo.dto'
import { QueryTodoDto } from './dtos/query-todo.dto'
import { User } from '@prisma/client'
import { th } from '@app/helper/transform.helper'
import { TodoEntity } from './entities/todo.entity'
import { TodoPaginatedResponseEntity } from './entities/todo-paginated-response.entity'
import { PaginationUtil } from '@app/core/utils/pagination.util'

@Injectable()
export class TodoService {
  private readonly SYSTEM_PROFILE_ID = BigInt(1) // System profile for public todos

  constructor(private readonly prisma: PrismaService) {}

  async getTodos(queryTodoDto: QueryTodoDto) {
    const { select, include, skip = 0, take = 20 } = queryTodoDto
    const [total, todos] = await Promise.all([
      this.prisma.todo.count({ where: queryTodoDto.where }),
      this.prisma.todo.findMany({
        where: queryTodoDto.where,
        orderBy: queryTodoDto.sort,
        take,
        skip,
        ...(select
          ? { select: Object.fromEntries(select.map((key) => [key, true])) }
          : include
            ? { include: Object.fromEntries(include.map((key) => [key, true])) }
            : {}),
      }),
    ])

    const data = th.toInstancesSafe(TodoEntity, todos)
    const page = Math.floor(skip / take) + 1
    const pagination = PaginationUtil.calculatePagination(page, take, total)

    // Manually construct the response entity to preserve nested data
    const response = new TodoPaginatedResponseEntity()
    response.data = data
    response.pagination = pagination

    return response
  }

  async getTodo(id: bigint) {
    const todo = await this.prisma.todo.findUniqueOrThrow({
      where: { id },
    })
    return th.toInstanceSafe(TodoEntity, todo)
  }

  async createTodo(dto: CreateTodoDto, user: User) {
    const todo = await this.prisma.todo.create({
      data: {
        ...dto,
        profileId: user.profileId,
      },
    })
    return th.toInstanceSafe(TodoEntity, todo)
  }

  async updateTodo(id: bigint, dto: UpdateTodoDto, user: User) {
    const todo = await this.prisma.todo.update({
      where: { id, profileId: user.profileId },
      data: dto,
    })
    return th.toInstanceSafe(TodoEntity, todo)
  }

  async deleteTodo(id: bigint, user: User) {
    await this.prisma.todo.delete({
      where: { id, profileId: user.profileId },
    })
  }

  // Public methods for unauthenticated access
  async createTodoPublic(dto: CreateTodoDto) {
    const todo = await this.prisma.todo.create({
      data: {
        ...dto,
        profileId: this.SYSTEM_PROFILE_ID,
      },
    })
    return th.toInstanceSafe(TodoEntity, todo)
  }

  async updateTodoPublic(id: bigint, dto: UpdateTodoDto) {
    const todo = await this.prisma.todo.update({
      where: { id },
      data: dto,
    })
    return th.toInstanceSafe(TodoEntity, todo)
  }

  async deleteTodoPublic(id: bigint) {
    await this.prisma.todo.delete({
      where: { id },
    })
  }
}
