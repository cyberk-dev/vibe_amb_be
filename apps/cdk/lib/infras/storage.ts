import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib'
import {
  OriginAccessIdentity,
  ViewerProtocolPolicy,
  Distribution,
  AllowedMethods,
  CachePolicy,
  OriginRequestPolicy,
  SecurityPolicyProtocol,
  SSLMethod,
} from 'aws-cdk-lib/aws-cloudfront'
import { PolicyStatement, PolicyDocument, CanonicalUserPrincipal } from 'aws-cdk-lib/aws-iam'
import { Bucket, CfnBucketPolicy, HttpMethods, IBucket } from 'aws-cdk-lib/aws-s3'
import { BaseInfa } from './_infra-base'
import { CdkStack } from '../cdk-stack'
import { IConfig } from '../../bin/config'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'

export class Storage extends BaseInfa {
  bucket: IBucket
  distribution: Distribution
  s3Policy: PolicyStatement

  constructor(scope: CdkStack, id: string, config: IConfig) {
    super(scope, id, config)

    this.bucket = new Bucket(this, 'storages3', {
      bucketName: config.STORAGE_BUCKET,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [HttpMethods.GET, HttpMethods.HEAD, HttpMethods.POST],
          allowedOrigins: config.ORIGINS,
          allowedHeaders: ['*'],
        },
      ],
    })

    this.s3Policy = new PolicyStatement({
      actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
      resources: [this.bucket.bucketArn + '/*'],
    })

    const cloudfrontOAI = new OriginAccessIdentity(this, 'storageS3-dis-OAI')

    const cloudfrontS3PolicyStateent = new PolicyStatement({
      actions: ['s3:GetObject'],
      resources: [this.bucket.bucketArn + '/*'],
      principals: [new CanonicalUserPrincipal(cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
    })

    new CfnBucketPolicy(this, 'storage-s3-policty', {
      bucket: this.bucket.bucketName,
      policyDocument: new PolicyDocument({
        statements: [cloudfrontS3PolicyStateent],
      }),
    })

    this.distribution = new Distribution(this, 'storage-S3', {
      defaultBehavior: {
        origin: new S3Origin(this.bucket, { originAccessIdentity: cloudfrontOAI }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
        compress: true,
      },

      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      sslSupportMethod: SSLMethod.SNI,
    })

    new CfnOutput(this, 'storageS3-dis-url', { value: `https://${this.distribution.distributionDomainName}` })
  }
}
