import { Duration } from 'luxon'

export const NONCE_EXPIRY_IN_MS = Duration.fromDurationLike({ minutes: 5 }).toMillis()
