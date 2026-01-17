#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { CdkStack } from '../lib/cdk-stack'

const app = new cdk.App()
new CdkStack(
  app,
  'be-boilerplate-prd',
  {
    env: 'prd',
    STORAGE_BUCKET: 'be-boilerplate-prd-storage',
    name: 'be-boilerplate',
    ORIGINS: ['http://localhost:3000'],
  },
  {
    env: {
      account: '182399686191',
      region: 'ap-southeast-1',
    },
  },
)
