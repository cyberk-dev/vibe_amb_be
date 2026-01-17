export interface IConfig {
  env: 'dev' | 'prd'
  name: string
  ORIGINS: string[]
  STORAGE_BUCKET: string
}
