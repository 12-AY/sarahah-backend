/**
 * Wraps async route/controller functions so any thrown error or
 * rejected promise is forwarded to the global error handler via next(),
 * instead of needing try/catch in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
