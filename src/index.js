import express from "express";
import { config } from "../config/config.service.js";
import connectDB from "./DB/connectionDB.js";
import bootstrap from "./app.controller.js";

const app = express();

bootstrap(app);

connectDB().then(() => {
  app.listen(config.port, () => {
    console.log(`🚀 Server running on port ${config.port} [${config.env}]`);
  });
});
