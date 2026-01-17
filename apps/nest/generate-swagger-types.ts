import { ApiModule } from './apps/api/src/api.module'
import { NestFactory } from '@nestjs/core'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { generateApi } from 'swagger-typescript-api'
import path from 'path'

const main = async () => {
  const app = await NestFactory.create(ApiModule)
  const config = new DocumentBuilder()
    .setTitle('Nestjs Boilerplate')
    .setDescription('The Nestjs Boilerplate API description')
    .setVersion('0.1')
    .addBearerAuth()
    .build()

  const documentFactory = SwaggerModule.createDocument(app, config, { ignoreGlobalPrefix: false })

  generateApi({
    spec: documentFactory,
    output: path.join(process.cwd(), 'swagger-types'),
    generateClient: false,
  })
}

main()
