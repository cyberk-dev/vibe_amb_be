# Lambda Warmup Implementation Guide

## Overview
This guide explains how to implement warmup functionality for AWS Lambda functions to reduce cold starts.

## Implementation Steps

### 1. CDK Implementation
Add the following code to the Lambda function that needs warmup:

```typescript
new WarmupLambda(this, `${this.function.functionName}-warmup`, {
  function: this.function,
  concurrency: config.env === 'prd' ? 10 : 1,
})
```

### 2. Concurrency Analysis
Before implementing warmup, analyze these factors:
- Average requests per minute during peak hours
- Function memory size and initialization time
- Cost implications of maintaining warm instances
- Environment (dev/staging/prod) requirements

Recommended concurrency values:
- Development: 1 (minimal cost, sufficient for testing)
- Production: 5-10 (based on traffic patterns)
  - Low traffic (<100 req/min): 2-3 instances
  - Medium traffic (100-1000 req/min): 5-7 instances
  - High traffic (>1000 req/min): 8-10 instances

### 3. NestJS Lambda Handler
Add warmup handling logic to your Lambda's main.ts:

```typescript
let server: Handler

export const handler = async (event: any, context: Context, callback) => {
  const serverInited = !!server
  server = server ?? (await bootstrapServerless(ApiModule, 'api'))
  if (event.Warmup) {
    console.log('Warmup event')
    if (serverInited) {
      // small delay to invoke all concurrency lambdas
      await promiseHelper.delay(30)
    }
    return true
  } else {
    console.log('path=', event?.rawPath)
    return server(event, context as any, callback) as any
  }
}
```

## Best Practices
1. Always use different concurrency values for different environments
2. Monitor cold start metrics to adjust concurrency
3. Consider cost vs performance tradeoffs
4. Use the delay mechanism to ensure all concurrent instances are warmed up
5. Log warmup events for monitoring and debugging 