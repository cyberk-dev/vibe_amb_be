import { Construct } from "constructs";
import { Function } from "aws-cdk-lib/aws-lambda";

export class BaseFunction extends Construct {

  function: Function
  functionId: string

  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}