import { CfnOutput } from 'aws-cdk-lib'
import { CfnApi, CfnApiMapping, CfnDeployment, CfnIntegration, CfnRoute, CfnStage } from 'aws-cdk-lib/aws-apigatewayv2'
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam'
import { BaseFunction } from '../functions/_function-base'
import { BaseInfa } from './_infra-base'
import { IConfig } from '../../bin/config'
import { CdkStack } from '../cdk-stack'

export class Apigateway extends BaseInfa {
  api: CfnApi
  apiRole: Role
  apiDeployment: CfnDeployment
  stage: CfnStage
  functions: BaseFunction[] = []

  constructor(scope: CdkStack, id: string, config: IConfig) {
    super(scope, id, config)

    const env = config.env
    const apiName = `${config.name}-agw-${env}`

    this.api = new CfnApi(this, apiName, {
      description: apiName,
      name: apiName,
      protocolType: 'HTTP',
      corsConfiguration: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'authorization', 'accept', 'referer', 'user-agent'],
        maxAge: 60 * 60, // 1h
        allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
        allowOrigins: config.ORIGINS,
      },
    })

    new CfnOutput(this, 'api-output', { value: this.api.attrApiEndpoint })

    this.apiRole = new Role(this, `${config.name}-agw-iam-role-${env}`, {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    })
    this.apiDeployment = new CfnDeployment(this, `${apiName}-deployment`, { apiId: this.api.ref })

    this.stage = new CfnStage(this, `${apiName}-stage-default`, {
      apiId: this.api.ref,
      autoDeploy: true,
      deploymentId: this.apiDeployment.ref,
      stageName: '$default',
    })
  }

  addFunction(_function: BaseFunction, route?: string) {
    if (route) {
      const apiIntegration = new CfnIntegration(this, `${_function.functionId}-integration`, {
        apiId: this.api!.ref,
        integrationType: 'AWS_PROXY',
        integrationUri:
          'arn:aws:apigateway:' +
          this.scope.region +
          ':lambda:path/2015-03-31/functions/' +
          _function.function.functionArn +
          '/invocations',
        credentialsArn: this.apiRole.roleArn,
        payloadFormatVersion: '2.0',
      })

      const apiRoute = new CfnRoute(this, `${_function.functionId}-route`, {
        apiId: this.api!.ref,
        routeKey: `ANY /${route}/{proxy+}`,
        operationName: route,
        authorizationType: 'NONE',
        target: `integrations/${apiIntegration.ref}`,
      })
      this.apiDeployment.node.addDependency(apiRoute)
    }
    this.functions.push(_function)
    return this
  }

  build() {
    const policy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: this.functions.map((x) => x.function.functionArn),
      actions: ['lambda:InvokeFunction'],
    })

    this.apiRole.addToPolicy(policy)
  }
}
