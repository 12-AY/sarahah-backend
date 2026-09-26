/**
 * Returns the HTML body for an OTP email.
 * @param {string} code - the plain 6-digit OTP code
 * @param {number} expiresInMinutes
 */
export const otpEmailTemplate = (code, expiresInMinutes) => `
  <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #eee; border-radius: 8px;">
    <h2 style="color: #333;">Verify your email</h2>
    <p style="color: #555;">Use the code below to verify your account. This code expires in ${expiresInMinutes} minutes.</p>
    <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; text-align: center; background: #f5f5f5; padding: 16px; border-radius: 6px; margin: 20px 0;">
      ${code}
    </div>
    <p style="color: #999; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
  </div>
`;
