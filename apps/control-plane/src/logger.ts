import pino from 'pino';

const REDACT_PATHS = [
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'password',
  'secret',
  'authorization',
  '*.apiKey',
  '*.access_token',
  '*.refresh_token',
  '*.password',
];

export function createLogger() {
  return pino({
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: REDACT_PATHS,
      censor: '[REDACTED]',
    },
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  });
}

export type Logger = ReturnType<typeof createLogger>;
