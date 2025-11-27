import pino from 'pino';
import { createStream } from 'rotating-file-stream';

const isDevelopment = process.env.NODE_ENV === 'development';

// Create rotating file stream for production
const createRotatingStream = () => {
  return createStream('app.log', {
    size: '10M', // Rotate every 10MB
    interval: '1d', // Or rotate daily (whichever comes first)
    path: './logs', // Log directory
    maxFiles: 14, // Keep 14 days of logs
    compress: 'gzip', // Compress rotated logs
  });
};

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? 'info',

    // Redact sensitive fields
    redact: {
      paths: [
        'password',
        'token',
        'authorization',
        'cookie',
        'req.headers.authorization',
        'req.headers.cookie',
        'apiKey',
        'api_key',
        'secret',
      ],
      remove: true,
    },

    // Base context
    base: {
      env: process.env.NODE_ENV,
    },
  },
  createRotatingStream(),
);

// Helper for child loggers with context
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

// Helper to extract user context from session for logging
export function getUserContext(session: {
  user?: {
    id?: string;
    name?: string | null;
    email?: string;
    role?: string | null;
  };
} | null) {
  if (!session?.user) {
    return {
      userId: undefined,
      userName: undefined,
      userEmail: undefined,
      userRole: undefined,
    };
  }

  return {
    userId: session.user.id,
    userName: session.user.name ?? undefined,
    userEmail: session.user.email,
    userRole: session.user.role ?? undefined,
  };
}

// Export logger instance as default
export default logger;
