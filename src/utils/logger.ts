import { createLogger, format, transports } from 'winston';
import { env } from '../config/env';

const { combine, timestamp, colorize, printf, json } = format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  printf(({ level, message, timestamp: ts, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${ts}] ${level}: ${message}${metaStr}`;
  })
);

const prodFormat = combine(timestamp(), json());

const logger = createLogger({
  level: env.isDevelopment ? 'debug' : 'info',
  format: env.isProduction ? prodFormat : devFormat,
  transports: [new transports.Console()],
  exitOnError: false,
});

export default logger;
