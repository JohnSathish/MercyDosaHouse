/** Validates required production environment variables at startup. */
export function assertProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];
  const missing = required.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
  }

  const jwtSecret = process.env.JWT_SECRET!;
  if (jwtSecret.length < 32 || jwtSecret.includes('change-me') || jwtSecret === 'dev-secret') {
    throw new Error('JWT_SECRET must be a strong secret (32+ chars) in production');
  }
}
