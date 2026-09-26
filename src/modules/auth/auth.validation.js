import Joi from "joi";

export const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(64).required(),
  username: Joi.string()
    .pattern(/^[a-z0-9_]+$/)
    .min(3)
    .max(30)
    .required()
    .messages({
      "string.pattern.base":
        "username may only contain lowercase letters, numbers, and underscores",
    }),
  displayName: Joi.string().max(60).optional(),
});

export const verifyOtpSchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
});

export const resendOtpSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().optional(), // may also arrive via cookie
});

export const googleAuthSchema = Joi.object({
  idToken: Joi.string().required(),
});
