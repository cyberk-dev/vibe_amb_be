import { SetMetadata } from '@nestjs/common'

export const EXCLUDE_CONFIRM_KEY = 'EXCLUDE_CONFIRM_KEY'
export const ExcludeConfirm = () => SetMetadata(EXCLUDE_CONFIRM_KEY, true)
