import { SetMetadata } from '@nestjs/common'

export const TRANSFORMER_EXPOSE_ALL_KEY = 'transformer-expose-all'
export const TransformerExposeAll = () => SetMetadata(TRANSFORMER_EXPOSE_ALL_KEY, true)
