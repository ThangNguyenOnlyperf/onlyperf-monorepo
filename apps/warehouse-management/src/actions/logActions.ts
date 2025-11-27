'use server';

import { auth } from '~/lib/auth';
import { headers } from 'next/headers';
import { readdir, readFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { createGunzip } from 'zlib';
import { join, resolve } from 'path';
import { pipeline } from 'stream/promises';

const LOGS_DIR = resolve(process.cwd(), 'logs');

interface LogFile {
  name: string;
  size: number;
  isCompressed: boolean;
  modifiedAt: Date;
}

interface LogEntry {
  level: number;
  time: number;
  msg: string;
  [key: string]: unknown;
}

interface ReadLogsOptions {
  limit?: number;
  offset?: number;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  search?: string;
}

const LEVEL_MAP: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

const LEVEL_NAME_MAP: Record<number, string> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal',
};

async function checkAdminAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || session.user.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  return session;
}

export async function getLogFiles(): Promise<{
  success: boolean;
  message: string;
  data?: LogFile[];
}> {
  try {
    await checkAdminAuth();

    const files = await readdir(LOGS_DIR);
    const logFiles: LogFile[] = [];

    for (const file of files) {
      if (file.endsWith('.log') || file.endsWith('.log.gz')) {
        const filePath = join(LOGS_DIR, file);
        const stats = await stat(filePath);

        logFiles.push({
          name: file,
          size: stats.size,
          isCompressed: file.endsWith('.gz'),
          modifiedAt: stats.mtime,
        });
      }
    }

    // Sort by modified date, newest first
    logFiles.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());

    return {
      success: true,
      message: 'Log files retrieved successfully',
      data: logFiles,
    };
  } catch (error) {
    console.error('Error getting log files:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to get log files',
    };
  }
}

async function readGzipFile(filePath: string): Promise<string> {
  const chunks: Buffer[] = [];

  await pipeline(createReadStream(filePath), createGunzip(), async function* (source) {
    for await (const chunk of source) {
      chunks.push(chunk as Buffer);
      yield chunk;
    }
  });

  return Buffer.concat(chunks).toString('utf-8');
}

export async function readLogFile(
  filename: string,
  options: ReadLogsOptions = {}
): Promise<{
  success: boolean;
  message: string;
  data?: {
    entries: Array<LogEntry & { levelName: string }>;
    total: number;
    hasMore: boolean;
  };
}> {
  try {
    await checkAdminAuth();

    const { limit = 100, offset = 0, level, search } = options;

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');
    const filePath = join(LOGS_DIR, sanitizedFilename);

    // Verify file is in logs directory
    if (!filePath.startsWith(LOGS_DIR)) {
      return {
        success: false,
        message: 'Invalid file path',
      };
    }

    let content: string;

    if (sanitizedFilename.endsWith('.gz')) {
      content = await readGzipFile(filePath);
    } else {
      content = await readFile(filePath, 'utf-8');
    }

    // Parse JSON lines
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim());
    let entries: Array<LogEntry & { levelName: string }> = [];

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as LogEntry;
        entries.push({
          ...entry,
          levelName: LEVEL_NAME_MAP[entry.level] ?? 'unknown',
        });
      } catch {
        // Skip invalid JSON lines
      }
    }

    // Filter by level if specified
    if (level) {
      const minLevel = LEVEL_MAP[level];
      if (minLevel !== undefined) {
        entries = entries.filter((entry) => entry.level >= minLevel);
      }
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      entries = entries.filter(
        (entry) =>
          entry.msg?.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry).toLowerCase().includes(searchLower)
      );
    }

    // Reverse to show newest first
    entries.reverse();

    const total = entries.length;
    const paginatedEntries = entries.slice(offset, offset + limit);

    return {
      success: true,
      message: 'Log entries retrieved successfully',
      data: {
        entries: paginatedEntries,
        total,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    console.error('Error reading log file:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to read log file',
    };
  }
}

export async function getLatestLogs(options: ReadLogsOptions = {}): Promise<{
  success: boolean;
  message: string;
  data?: {
    entries: Array<LogEntry & { levelName: string }>;
    total: number;
    hasMore: boolean;
  };
}> {
  return readLogFile('app.log', options);
}
