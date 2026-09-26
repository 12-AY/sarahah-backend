import { Router } from "express";
import asyncHandler from "../../common/middleware/asyncHandler.js";
import validate from "../../common/middleware/validation.middleware.js";
import authMiddleware from "../../common/middleware/auth.middleware.js";
import successResponse from "../../common/utils/security/response.success.js";
import * as userService from "./user.service.js";
import { updateProfileSchema, searchUsersSchema } from "./user.validation.js";

const router = Router();

// --- Authenticated routes ---

router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const user = await userService.getMyProfile(req.user._id);
    return successResponse(res, { data: user });
  })
);

router.patch(
  "/me",
  authMiddleware,
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const user = await userService.updateMyProfile(req.user._id, req.body);
    return successResponse(res, { message: "Profile updated", data: user });
  })
);

router.delete(
  "/me",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await userService.deleteMyAccount(req.user._id);
    return successResponse(res, { message: "Account permanently deleted" });
  })
);

// --- Public routes ---

router.get(
  "/search",
  validate(searchUsersSchema, "query"),
  asyncHandler(async (req, res) => {
    const result = await userService.searchUsers(req.query);
    return successResponse(res, { data: result });
  })
);

// Public profile by username — powers the anonymous submission landing page.
// Kept last so it doesn't shadow /me or /search.
router.get(
  "/:username",
  asyncHandler(async (req, res) => {
    const user = await userService.getPublicProfile(req.params.username);
    return successResponse(res, { data: user });
  })
);

export default router;
