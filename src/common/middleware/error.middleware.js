import { config } from "../../../config/config.service.js";

/**
 * Handles known Mongoose/JWT error types and converts them into a
 * consistent shape before they reach the final response formatter.
 */
const normalizeError = (err) => {
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return {
      statusCode: 409,
      message: `${field} already exists`,
    };
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return {
      statusCode: 400,
      message: messages.join(", "),
    };
  }

  // Mongoose invalid ObjectId / cast error
  if (err.name === "CastError") {
    return {
      statusCode: 400,
      message: `Invalid ${err.path}: ${err.value}`,
    };
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return { statusCode: 401, message: "Invalid token" };
  }
  if (err.name === "TokenExpiredError") {
    return { statusCode: 401, message: "Token expired" };
  }

  return null;
};

// 404 handler — mounted after all routes
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
};

// Global error handler — must be the LAST middleware mounted
// eslint-disable-next-line no-unused-vars
export const globalErrorHandler = (err, req, res, next) => {
  const normalized = normalizeError(err);

  const statusCode = normalized?.statusCode || err.statusCode || 500;
  const message = normalized?.message || err.message || "Internal server error";

  if (config.env === "development") {
    console.error("🔥 ERROR:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.details ? { details: err.details } : {}),
    ...(config.env === "development" ? { stack: err.stack } : {}),
  });
};
