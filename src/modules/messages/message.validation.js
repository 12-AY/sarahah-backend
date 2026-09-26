import Joi from "joi";

export const submitMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(1000).required(),
  type: Joi.string().valid("text", "sticker", "gem").default("text"),
  stickerId: Joi.string().optional(),
});

export const usernameParamSchema = Joi.object({
  username: Joi.string().required(),
});

export const listMessagesSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  favoritesOnly: Joi.boolean().default(false),
});

export const messageIdParamSchema = Joi.object({
  id: Joi.string().required(),
});
