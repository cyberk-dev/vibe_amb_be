import { config } from 'dotenv'
config({ path: './.env.spec' })

import { preboot } from '@app/helper/pre-boot'
preboot()
