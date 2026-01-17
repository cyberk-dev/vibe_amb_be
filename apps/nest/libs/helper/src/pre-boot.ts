import JB from 'json-bigint'

const { stringify } = JB({ useNativeBigInt: true })

JSON.stringify = stringify
// JSON.parse = parse

export const preboot = () => {
  // This is a workaround for fix BigInt json serialization issue
}
