import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { config } from '../config/env.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation error',
      error: {
        code: 'VALIDATION_ERROR',
        details: err.flatten(),
      },
    });
    return;
  }

  if (
    err.name === 'MulterError' ||
    err.message?.includes('INVALID_AUDIO_FORMAT') ||
    err.message?.includes('INVALID_MEDIA_FORMAT') ||
    err.message?.includes('FILE_TOO_LARGE')
  ) {
    res.status(400).json({
      success: false,
      message: err.message || 'File size exceeds maximum allowed 50MB limit',
      error: {
        code: 'AUDIO_VALIDATION_ERROR',
      },
    });
    return;
  }

  console.error('Unhandled Application Error:', err);

  const isDev = !config.isProd;
  res.status(500).json({
    success: false,
    message: isDev ? err.message : 'Internal Server Error',
    error: {
      code: 'INTERNAL_ERROR',
      detail: err.message,
      ...(isDev ? { stack: err.stack } : {}),
    },
  });
}
