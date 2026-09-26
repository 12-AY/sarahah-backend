import { Router } from "express";
import asyncHandler from "../../common/middleware/asyncHandler.js";
import validate from "../../common/middleware/validation.middleware.js";
import authMiddleware from "../../common/middleware/auth.middleware.js";
import successResponse from "../../common/utils/security/response.success.js";
import * as messageService from "./message.service.js";
import {
  submitMessageSchema,
  listMessagesSchema,
} from "./message.validation.js";

const router = Router();

// --- Public: anonymous submission ---
// POST /messages/:username  — no auth, this is the whole point of the app.
router.post(
  "/:username",
  validate(submitMessageSchema),
  asyncHandler(async (req, res) => {
    const result = await messageService.submitMessage(req.params.username, req.body);
    return successResponse(res, {
      statusCode: 201,
      message: "Message sent anonymously",
      data: result,
    });
  })
);

// --- Authenticated: inbox management ---

router.get(
  "/",
  authMiddleware,
  validate(listMessagesSchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await messageService.getInbox(req.user._id, req.query);
    return successResponse(res, { data: result });
  })
);

router.patch(
  "/:id/favorite",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const message = await messageService.toggleFavorite(req.user._id, req.params.id);
    return successResponse(res, { message: "Favorite status updated", data: message });
  })
);

router.patch(
  "/:id/read",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const message = await messageService.markAsRead(req.user._id, req.params.id);
    return successResponse(res, { data: message });
  })
);

router.delete(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await messageService.deleteMessage(req.user._id, req.params.id);
    return successResponse(res, { message: "Message deleted" });
  })
);

export default router;
