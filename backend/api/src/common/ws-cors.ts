/** WebSocket CORS origins — mirrors HTTP CORS_ORIGINS env. */
export function getWebSocketCorsConfig(): { origin: string[] | boolean; credentials: boolean } {
  const raw = process.env.CORS_ORIGINS;
  if (raw) {
    const origins = raw
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    return { origin: origins.length ? origins : false, credentials: true };
  }

  if (process.env.NODE_ENV === 'production') {
    return {
      origin: [
        'https://mercydosahouse.com',
        'https://www.mercydosahouse.com',
        'https://admin.mercydosahouse.com',
      ],
      credentials: true,
    };
  }

  return { origin: true, credentials: true };
}
