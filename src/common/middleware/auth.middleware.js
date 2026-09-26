import AppError from "../utils/errors/AppError.js";
import { verifyAccessToken } from "../utils/security/token.service.js";
import User from "../../DB/models/user.model.js";
import asyncHandler from "./asyncHandler.js";

/**
 * Verifies the access token from the Authorization header and attaches
 * the authenticated user to req.user. Protects private routes (inbox,
 * profile, etc.) — the public message-submission route does NOT use this.
 */
const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw AppError.unauthorized("Access token is missing");
  }

  const token = authHeader.split(" ")[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    throw AppError.unauthorized(
      err.name === "TokenExpiredError" ? "Access token expired" : "Invalid access token"
    );
  }

  const user = await User.findById(decoded.id);
  if (!user || user.isDeleted) {
    throw AppError.unauthorized("User no longer exists");
  }
  if (!user.isVerified) {
    throw AppError.forbidden("Please verify your email first");
  }

  req.user = user;
  next();
});

export default authMiddleware;
