/**
 * Standardized success response shape, mirroring the error response
 * shape produced by globalErrorHandler ({ success, message, ... }).
 */
const successResponse = (res, { statusCode = 200, message = "Success", data = null } = {}) => {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null ? { data } : {}),
  });
};

export default successResponse;
