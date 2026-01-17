import { Construct } from 'constructs'
import { CdkStack } from '../cdk-stack'
import { IConfig } from '../../bin/config'

export class BaseInfa extends Construct {
  scope: CdkStack
  config: IConfig

  constructor(scope: CdkStack, id: string, config: IConfig) {
    super(scope, id)
    this.scope = scope
    this.config = config
  }
}
