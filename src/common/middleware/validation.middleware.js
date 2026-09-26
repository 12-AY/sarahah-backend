import AppError from "../utils/errors/AppError.js";

/**
 * Returns a middleware that validates req[source] (default "body")
 * against the given Joi schema. Usage:
 *   router.post("/register", validate(registerSchema), authController.register)
 */
const validate = (schema, source = "body") => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    return next(AppError.badRequest(message));
  }

  req[source] = value;
  next();
};

export default validate;
