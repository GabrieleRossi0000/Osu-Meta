import { config } from 'dotenv'
import { existsSync } from 'fs'
import { join } from 'path'

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return
  config({ path, override: false })
}

/** Optional `.env` override for bundled osu! API credentials (dev only). */
export function loadAppEnv(): void {
  const candidates = [
    join(process.cwd(), '.env'),
    join(__dirname, '../../.env'),
    join(__dirname, '../../../.env')
  ]

  for (const path of candidates) {
    loadEnvFile(path)
  }
}
