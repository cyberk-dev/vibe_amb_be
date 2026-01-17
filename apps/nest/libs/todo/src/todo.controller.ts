import { ParseBigIntPipe } from '@app/core/pipes/parse-bigint.pipe'
import { CreateTodoDto } from './dtos/create-todo.dto'
import { TodoService } from './todo.service'

import { Body, Controller, Delete, Get, Param, Post, Put, UseInterceptors } from '@nestjs/common'
import { UpdateTodoDto } from './dtos/update-todo.dto'
import { QueryTodoDto } from './dtos/query-todo.dto'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { TodoEntity } from './entities/todo.entity'
import { TodoPaginatedResponseEntity } from './entities/todo-paginated-response.entity'
import { CacheTTL } from '@nestjs/cache-manager'
import { AppCacheInterceptor } from '@app/core/interceptors/app-cache-interceptor'
import { AppCacheKey } from '@app/core/decorators/app-cache-key.decorator'
import { RawQuery } from '@app/core/decorators/query.decorator'
import { TransformerExposeAll } from '@app/core/decorators/transformer-expose-all.decorator'

@Controller('todo')
@ApiTags('Todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}

  @Get()
  @TransformerExposeAll()
  @ApiOkResponse({ type: TodoPaginatedResponseEntity })
  @CacheTTL(2000)
  @UseInterceptors(AppCacheInterceptor)
  getTodos(@RawQuery() queryTodoDto: QueryTodoDto) {
    return this.todoService.getTodos(queryTodoDto)
  }

  @Get(':id')
  @ApiOkResponse({ type: () => TodoEntity })
  @CacheTTL(2000)
  @AppCacheKey((req) => `todo-${req.params.id}`)
  @UseInterceptors(AppCacheInterceptor)
  getTodo(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.todoService.getTodo(id)
  }

  @Post()
  @ApiOkResponse({ type: () => TodoEntity })
  createTodo(@Body() createTodoDto: CreateTodoDto) {
    return this.todoService.createTodoPublic(createTodoDto)
  }

  @Put(':id')
  @ApiOkResponse({ type: () => TodoEntity })
  updateTodo(@Param('id', ParseBigIntPipe) id: bigint, @Body() updateTodoDto: UpdateTodoDto) {
    return this.todoService.updateTodoPublic(id, updateTodoDto)
  }

  @Delete(':id')
  @ApiOkResponse({ type: () => TodoEntity })
  deleteTodo(@Param('id', ParseBigIntPipe) id: bigint) {
    return this.todoService.deleteTodoPublic(id)
  }
}
