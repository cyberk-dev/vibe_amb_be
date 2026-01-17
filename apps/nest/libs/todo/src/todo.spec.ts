import { TodoService } from './todo.service'
import { TestContext, testHelper, UserContextTestType } from '@app/spec/test.helper'
import { INestApplication } from '@nestjs/common'
import { PrismaService } from 'nestjs-prisma'
import { CreateTodoDto } from './dtos/create-todo.dto'
import { TodoModule } from './todo.module'
import qs from 'qs'
import { Todo } from '@prisma/client'
import { UpdateTodoDto } from './dtos/update-todo.dto'

describe('TodoSpec', () => {
  let tc: TestContext
  let app: INestApplication
  let prismaService: PrismaService
  let uc: UserContextTestType

  beforeAll(async () => {
    tc = await testHelper.createContext({
      imports: [TodoModule],
    })
    app = tc.app
    prismaService = app.get(PrismaService)
    uc = await tc.generateAcount()
  })

  afterAll(async () => await tc?.clean())

  describe('Create', () => {
    test('Create:TitleIsRequired', async () => {
      const res = await uc.request((r) => r.post('/todo')).send({} as CreateTodoDto)
      expect(res).toBeBad(/title should not be empty/)
    })
    test('Create:Success', async () => {
      const res = await uc.request((r) => r.post('/todo')).send({ title: 'Test Todo' } as CreateTodoDto)
      expect(res).toBeCreated()
      expect(res.body.title).toBe('Test Todo')
    })
  })

  describe('Fetch', () => {
    let todo: Todo
    beforeAll(async () => {
      const res = await uc.request((r) => r.post('/todo')).send({ title: 'Test Todo' } as CreateTodoDto)
      todo = res.body
    })
    test('GetTodo', async () => {
      const res = await uc.request((r) => r.get(`/todo/${todo.id}`))
      expect(res).toBeOK()
      expect(res.body.id).toBe(todo.id)
    })
    test('GetTodos', async () => {
      const paramDto = {
        where: {
          id: {
            gt: 0,
          },
          title: {
            startsWith: 'Test',
          },
        },
        // select: ['title'],
        include: ['profile'],
        take: 3,
      }
      const param = qs.stringify(paramDto)
      const res = await uc.request((r) => r.get(`/todo?${param}`))
      expect(res).toBeOK()
      expect(res.body.length).toBeGreaterThan(0)
    })
  })
  describe('Update', () => {
    let todo: Todo
    beforeAll(async () => {
      const res = await uc.request((r) => r.post('/todo')).send({ title: 'Test Todo' } as CreateTodoDto)
      todo = res.body
    })
    test('Update:Success', async () => {
      const res = await uc.request((r) => r.put(`/todo/${todo.id}`)).send({ title: 'Updated Todo' } as UpdateTodoDto)
      expect(res).toBeOK()
      const newTodoRes = await uc.request((r) => r.get(`/todo/${todo.id}`))
      expect(newTodoRes.body.title).toBe('Updated Todo')
    })
  })
  describe('Delete', () => {
    let todo: Todo
    beforeAll(async () => {
      const res = await uc.request((r) => r.post('/todo')).send({ title: 'Test Todo' } as CreateTodoDto)
      todo = res.body
    })
    test('Delete:Success', async () => {
      const res = await uc.request((r) => r.delete(`/todo/${todo.id}`))
      expect(res).toBeOK()
      const newTodoRes = await uc.request((r) => r.get(`/todo/${todo.id}`))
      expect(newTodoRes).toBe404()
    })
  })
})
