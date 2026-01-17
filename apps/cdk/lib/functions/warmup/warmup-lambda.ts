import { Construct } from 'constructs'
import { AssetCode, Function, Runtime } from 'aws-cdk-lib/aws-lambda'
import { Duration } from 'aws-cdk-lib'
import { Rule, Schedule, RuleTargetInput } from 'aws-cdk-lib/aws-events'
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets'
import path from 'path'

export interface WarmupLambdaOptions {
  function: Function
  concurrency?: number
}

export class WarmupLambda extends Construct {
  constructor(scope: Construct, id: string, options: WarmupLambdaOptions) {
    super(scope, id)

    const { function: func, concurrency } = options

    const apiWarmupFunc = new Function(this, 'warmup', {
      functionName: func.functionName + '--warmup',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: new AssetCode(path.join(__dirname, './code/'), {
        exclude: ['node_modules', 'package.json', 'yarn.lock'],
      }),
      timeout: Duration.seconds(30),
      environment: {
        API_LAMBDA_NAME: func.functionName,
        API_WARMUP_CONCURRENCY: `${concurrency ?? 1}`,
      },
    })

    func.grantInvoke(apiWarmupFunc)

    const apiWarmupRule = new Rule(this, 'warmupRule', {
      enabled: true,
      description: 'Warmup api lambda for each 5 mins',
      schedule: Schedule.cron({ minute: '*/5' }),
      ruleName: `${func.functionName}-warmup-rule`,
    })
    apiWarmupRule.addTarget(
      new LambdaFunction(apiWarmupFunc, {
        retryAttempts: 0,
        event: RuleTargetInput.fromObject({ Cron: { type: 'api-warmup' } }),
      })
    )
  }
}
