import { AppError } from '../utils/AppError.js';

export const errorHandler = (err, req, res, _next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log in development
  if (process.env.NODE_ENV !== 'test') {
    console.error('[Error Handler]', err);
  }

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found with id: ${err.value}`;
    error = new AppError(message, 404);
  }

  // Handle Mongoose Duplicate Key Error (Code 11000) -> 409 Conflict as requested
  if (err.code === 11000 || (err.errorResponse && err.errorResponse.code === 11000)) {
    const keyValue = err.keyValue || (err.errorResponse && err.errorResponse.keyValue) || {};
    const field = Object.keys(keyValue)[0] || 'field';
    const val = keyValue[field] !== undefined ? keyValue[field] : '';
    const message = `Duplicate value '${val}' for unique field '${field}'. Please provide another value.`;
    error = new AppError(message, 409, [{ field, message }]);
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errorDetails = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    const message = errorDetails.map((e) => e.message).join('. ');
    error = new AppError(message, 400, errorDetails);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Server Error',
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
