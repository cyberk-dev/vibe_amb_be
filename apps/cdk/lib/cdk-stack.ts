import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import { IConfig } from '../bin/config'
import { Storage } from './infras/storage'
import { Code, LayerVersion, Runtime } from 'aws-cdk-lib/aws-lambda'
import path from 'path'
import { ISecurityGroup, IVpc, SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2'
import { EventBus } from 'aws-cdk-lib/aws-events'
import { Apigateway } from './infras/apigateway'
import { ApiFunction } from './functions/api-function'

export class CdkStack extends cdk.Stack {
  vpc: IVpc
  sg: ISecurityGroup
  bus: EventBus

  layer: LayerVersion
  storage: Storage
  apigateway: Apigateway

  commonEnvs: {
    ENV: string
    JWT_SECRET: string
    JWT_REFRESH_SECRET: string
    JWT_EXPIRES: string
    JWT_REFRESH_EXPIRES: string
    VERIFY_CODE_EXPIRE_TIME: string
    REDIS_URL: string
    DATABASE_URL: string
  }

  constructor(scope: Construct, id: string, config: IConfig, props?: cdk.StackProps) {
    super(scope, id, props)

    this.commonEnvs = {
      ENV: config.env,
      JWT_SECRET: process.env.JWT_SECRET!,
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
      JWT_EXPIRES: process.env.JWT_EXPIRES!,
      JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES!,
      VERIFY_CODE_EXPIRE_TIME: process.env.VERIFY_CODE_EXPIRE_TIME!,
      REDIS_URL: process.env.REDIS_URL!,
      DATABASE_URL: process.env.DATABASE_URL!,
    }

    this.storage = new Storage(this, 'Storage', config)
    this.vpc = Vpc.fromLookup(this, 'VPC', { isDefault: true })
    this.sg = SecurityGroup.fromLookupByName(this, 'sg', 'default', this.vpc)
    this.bus = new EventBus(this, `${config.name}-eventbus`, {
      eventBusName: `${config.name}-eventbus-${config.env}`,
    })

    this.layer = new LayerVersion(this, 'Layer', {
      code: Code.fromAsset(path.join(__dirname, '../../nest/dist/layer')),
      compatibleRuntimes: [Runtime.NODEJS_20_X],
    })

    this.apigateway = new Apigateway(this, 'Apigateway', config)

    const apiFunc = new ApiFunction(this, 'ApiFunction', config)

    this.apigateway.addFunction(apiFunc, 'api').build()
  }
}
