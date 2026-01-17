import path from 'path'
import { Runtime, Function, AssetCode } from 'aws-cdk-lib/aws-lambda'
import { Duration } from 'aws-cdk-lib'
import { BaseFunction } from './_function-base'
import { CdkStack } from '../cdk-stack'
import { IConfig } from '../../bin/config'
import { WarmupLambda } from './warmup/warmup-lambda'

export class ApiFunction extends BaseFunction {
  constructor(scope: CdkStack, id: string, config: IConfig) {
    super(scope, id)

    this.functionId = `api`
    this.function = new Function(this, this.functionId, {
      description: `${config.name} API`,
      runtime: Runtime.NODEJS_20_X,
      handler: 'main.handler',
      code: new AssetCode(path.join(__dirname, '../../../nest/dist/apps/api')),
      timeout: Duration.seconds(30),
      memorySize: 512,
      layers: [scope.layer],
      initialPolicy: [scope.storage.s3Policy],
      environment: {
        ...scope.commonEnvs,
      },
    })

    // Add warmup configuration
    new WarmupLambda(this, `${this.function.functionName}-warmup`, {
      function: this.function,
      concurrency: config.env === 'prd' ? 10 : 1,
    })
  }
}
