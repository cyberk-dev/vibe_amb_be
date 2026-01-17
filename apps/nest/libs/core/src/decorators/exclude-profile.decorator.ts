import { SetMetadata } from '@nestjs/common'

export const EXCLUDE_PROFILE_KEY = 'EXCLUDE_PROFILE_KEY'
export const ExcludeProfile = () => SetMetadata(EXCLUDE_PROFILE_KEY, true)
