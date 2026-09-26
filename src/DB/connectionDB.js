import mongoose from "mongoose";
import { config } from "../../config/config.service.js";

const connectDB = async () => {
  try {
    await mongoose.connect(config.db.uri);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

export default connectDB;
