import { OAuth2Client } from "google-auth-library";
import AppError from "../errors/AppError.js";
import { config } from "../../../../config/config.service.js";

const client = new OAuth2Client(config.google.clientId);

/**
 * Verifies a Google ID token (sent from the frontend after Google Sign-In)
 * and returns the verified profile claims. Throws if the client ID isn't
 * configured yet, or if the token is invalid/expired/for the wrong app.
 */
export const verifyGoogleIdToken = async (idToken) => {
  if (!config.google.clientId) {
    throw AppError.badRequest(
      "Google sign-in is not configured yet (missing GOOGLE_CLIENT_ID)"
    );
  }

  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });
  } catch (err) {
    throw AppError.unauthorized("Invalid or expired Google token");
  }

  const payload = ticket.getPayload();

  if (!payload || !payload.email) {
    throw AppError.unauthorized("Google token did not include an email");
  }
  if (!payload.email_verified) {
    throw AppError.unauthorized("Google account email is not verified");
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    name: payload.name || null,
    picture: payload.picture || null,
  };
};
