"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFound = exports.errorHandler = void 0;
const errorHandler = (err, _req, res, _next) => {
    let { statusCode = 500, message } = err;
    if (err.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    else if (err.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    else if (err.code === '23505') {
        statusCode = 409;
        message = 'Duplicate entry';
    }
    else if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced record not found';
    }
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
exports.errorHandler = errorHandler;
const notFound = (req, _res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};
exports.notFound = notFound;
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map