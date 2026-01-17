const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda')

const client = new LambdaClient()

const apiname = process.env.API_LAMBDA_NAME
const concurrency = +process.env.API_WARMUP_CONCURRENCY

exports.handler = async function (event, context) {
  const arr = Array(concurrency).fill(0)
  await Promise.all(
    arr.map(() => {
      return client.send(
        new InvokeCommand({
          FunctionName: apiname,
          InvocationType: 'Event',
          Payload: JSON.stringify({ Warmup: true, httpMethod: 'GET' }),
        })
      )
    })
  )
  return true
}
