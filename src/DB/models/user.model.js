import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
      select: false, // never return password by default
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    bio: {
      type: String,
      maxlength: 200,
      default: "",
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    theme: {
      type: String,
      default: "default",
    },

    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    providerId: {
      type: String,
      default: null, // Google's `sub` claim, for google-provider accounts
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // OTP state and refresh-token/session validity now live entirely
    // in Redis (see common/utils/security/otp.security.js and
    // session.security.js) — nothing to store on the user doc for them.

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
