import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Deliberately NO sender field — this is the core anonymity guarantee.
    // Do not add IP/device/session linkage here without revisiting the
    // anonymity requirement first.

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ["text", "sticker", "gem"],
      default: "text",
    },
    stickerId: {
      type: String,
      default: null,
    },

    isFavorite: {
      type: Boolean,
      default: false,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.index({ recipient: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);
export default Message;
