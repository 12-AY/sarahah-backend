import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./modules/auth/auth.controller.js";
import userRouter from "./modules/users/user.controller.js";
import messageRouter from "./modules/messages/message.controller.js";

import { notFoundHandler, globalErrorHandler } from "./common/middleware/error.middleware.js";
import { config } from "../config/config.service.js";

const bootstrap = (app) => {
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  app.get("/health", (req, res) => res.json({ success: true, message: "OK" }));

  app.use("/auth", authRouter);
  app.use("/users", userRouter);
  app.use("/messages", messageRouter);

  // Must be last: 404 catch-all, then the global error handler
  app.use(notFoundHandler);
  app.use(globalErrorHandler);
};

export default bootstrap;
