import Message from "../../DB/models/message.model.js";
import User from "../../DB/models/user.model.js";
import DBService from "../../DB/db.service.js";
import AppError from "../../common/utils/errors/AppError.js";

const messageDB = new DBService(Message);
const userDB = new DBService(User);

/**
 * Accepts an anonymous message and routes it to the recipient by username.
 * Intentionally never persists anything about the sender (no IP, no
 * device id, no session) — that is the anonymity guarantee.
 */
export const submitMessage = async (username, { content, type, stickerId }) => {
  const recipient = await userDB.findOne({
    username: username.toLowerCase(),
    isDeleted: false,
  });
  if (!recipient) throw AppError.notFound("This user does not exist");

  const message = await messageDB.create({
    recipient: recipient._id,
    content,
    type,
    stickerId: stickerId || null,
  });

  // Return only what a sender needs to know — never recipient internals.
  return { id: message._id, createdAt: message.createdAt };
};

export const getInbox = async (userId, { page, limit, favoritesOnly }) => {
  const filter = { recipient: userId };
  if (favoritesOnly) filter.isFavorite = true;

  const [messages, total] = await Promise.all([
    messageDB.find(filter, {
      sort: { createdAt: -1 },
      skip: (page - 1) * limit,
      limit,
    }),
    messageDB.count(filter),
  ]);

  return { messages, total, page, limit };
};

const getOwnedMessage = async (userId, messageId) => {
  const message = await messageDB.findById(messageId);
  if (!message) throw AppError.notFound("Message not found");
  if (message.recipient.toString() !== userId.toString()) {
    throw AppError.forbidden("You do not have access to this message");
  }
  return message;
};

export const toggleFavorite = async (userId, messageId) => {
  const message = await getOwnedMessage(userId, messageId);
  message.isFavorite = !message.isFavorite;
  await message.save();
  return message;
};

export const markAsRead = async (userId, messageId) => {
  const message = await getOwnedMessage(userId, messageId);
  message.isRead = true;
  await message.save();
  return message;
};

export const deleteMessage = async (userId, messageId) => {
  await getOwnedMessage(userId, messageId); // ownership check
  await messageDB.deleteById(messageId);
};
