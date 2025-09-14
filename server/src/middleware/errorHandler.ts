import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
    statusCode?: number;
    isOperational?: boolean;
    code?: string | number;
}

export const errorHandler = (
    err: AppError,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    let { statusCode = 500, message } = err;

    // Handle specific error types
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    } else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    } else if (err.code === '23505') { // PostgreSQL unique violation
        statusCode = 409;
        message = 'Duplicate entry';
    } else if (err.code === '23503') { // PostgreSQL foreign key violation
        statusCode = 400;
        message = 'Referenced record not found';
    }

    // Log error in development
    if (process.env['NODE_ENV'] === 'development') {
        console.error('Error:', err);
    }

    res.status(statusCode).json({
        success: false,
        error: {
            message,
            ...(process.env['NODE_ENV'] === 'development' && { stack: err.stack })
        }
    });
};

export const notFound = (req: Request, _res: Response, next: NextFunction): void => {
    const error = new Error(`Not Found - ${req.originalUrl}`) as AppError;
    error.statusCode = 404;
    next(error);
};

export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
