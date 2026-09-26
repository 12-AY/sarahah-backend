import nodemailer from "nodemailer";
import { config } from "../../../../config/config.service.js";

const transporter = nodemailer.createTransport({
  host: config.mail.host,
  port: config.mail.port,
  secure: config.mail.secure, // true for port 465, false for 587
  auth: {
    user: config.mail.user,
    pass: config.mail.pass,
  },
});

/**
 * Sends an email. Throws on failure so the caller (via asyncHandler)
 * surfaces it as a proper error rather than silently failing.
 */
export const sendMail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: config.mail.from,
    to,
    subject,
    html,
  });
};

export default transporter;
