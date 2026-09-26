import Joi from "joi";

export const updateProfileSchema = Joi.object({
  displayName: Joi.string().max(60).optional(),
  bio: Joi.string().max(200).allow("").optional(),
  profilePhoto: Joi.string().uri().optional(),
  theme: Joi.string().max(30).optional(),
}).min(1);

export const searchUsersSchema = Joi.object({
  q: Joi.string().min(1).max(60).required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});

export const usernameParamSchema = Joi.object({
  username: Joi.string().required(),
});
