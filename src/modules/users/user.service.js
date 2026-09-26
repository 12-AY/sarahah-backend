import User from "../../DB/models/user.model.js";
import Message from "../../DB/models/message.model.js";
import DBService from "../../DB/db.service.js";
import AppError from "../../common/utils/errors/AppError.js";
import { revokeAllSessions } from "../../common/utils/security/session.security.js";

const userDB = new DBService(User);
const messageDB = new DBService(Message);

const PUBLIC_FIELDS = "username displayName bio profilePhoto theme createdAt";

export const getMyProfile = async (userId) => {
  const user = await userDB.findById(userId);
  if (!user) throw AppError.notFound("User not found");
  return user;
};

export const updateMyProfile = async (userId, updates) => {
  const user = await userDB.updateById(userId, updates);
  if (!user) throw AppError.notFound("User not found");
  return user;
};

/**
 * Public profile lookup by username — powers the anonymous submission
 * page (username.sarahah.top). Only exposes non-sensitive fields.
 */
export const getPublicProfile = async (username) => {
  const user = await userDB.findOne(
    { username: username.toLowerCase(), isDeleted: false },
    { select: PUBLIC_FIELDS }
  );
  if (!user) throw AppError.notFound("This user does not exist");
  return user;
};

export const searchUsers = async ({ q, page, limit }) => {
  const filter = {
    isDeleted: false,
    $or: [
      { username: { $regex: q, $options: "i" } },
      { displayName: { $regex: q, $options: "i" } },
    ],
  };

  const [users, total] = await Promise.all([
    userDB.find(filter, {
      select: PUBLIC_FIELDS,
      skip: (page - 1) * limit,
      limit,
      sort: { username: 1 },
    }),
    userDB.count(filter),
  ]);

  return { users, total, page, limit };
};

/**
 * Permanently deletes the account and purges associated data
 * (messages, active Redis sessions). Hard delete, per the "purge
 * associated data" requirement.
 */
export const deleteMyAccount = async (userId) => {
  await Promise.all([
    messageDB.model.deleteMany({ recipient: userId }),
    revokeAllSessions(userId.toString()),
    userDB.deleteById(userId),
  ]);
};
