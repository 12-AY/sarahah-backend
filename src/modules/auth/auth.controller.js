import { Router } from "express";
import asyncHandler from "../../common/middleware/asyncHandler.js";
import validate from "../../common/middleware/validation.middleware.js";
import authMiddleware from "../../common/middleware/auth.middleware.js";
import successResponse from "../../common/utils/security/response.success.js";
import * as authService from "./auth.service.js";
import {
  registerSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  googleAuthSchema,
} from "./auth.validation.js";
import { config } from "../../../config/config.service.js";

const router = Router();

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.env === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches REFRESH_TOKEN_EXPIRES_IN default
};

const setRefreshCookie = (res, refreshToken) => {
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);
};

const requestMeta = (req) => ({
  userAgent: req.headers["user-agent"] || null,
  ip: req.ip,
});

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);
    return successResponse(res, {
      statusCode: 201,
      message: "Registered. Please check your email for a verification code.",
      data: result,
    });
  })
);

router.post(
  "/verify-otp",
  validate(verifyOtpSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.verifyOtp(
      req.body,
      requestMeta(req)
    );
    setRefreshCookie(res, refreshToken);
    return successResponse(res, {
      message: "Email verified successfully",
      data: { user, accessToken },
    });
  })
);

router.post(
  "/resend-otp",
  validate(resendOtpSchema),
  asyncHandler(async (req, res) => {
    const result = await authService.resendOtp(req.body);
    return successResponse(res, {
      message: "A new verification code has been sent",
      data: result,
    });
  })
);

router.post(
  "/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body,
      requestMeta(req)
    );
    setRefreshCookie(res, refreshToken);
    return successResponse(res, {
      message: "Logged in successfully",
      data: { user, accessToken },
    });
  })
);

router.post(
  "/google",
  validate(googleAuthSchema),
  asyncHandler(async (req, res) => {
    const { user, accessToken, refreshToken } = await authService.loginWithGoogle(
      req.body,
      requestMeta(req)
    );
    setRefreshCookie(res, refreshToken);
    return successResponse(res, {
      message: "Signed in with Google successfully",
      data: { user, accessToken },
    });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const { accessToken, refreshToken } = await authService.refresh(incomingToken);
    setRefreshCookie(res, refreshToken);
    return successResponse(res, {
      message: "Token refreshed",
      data: { accessToken },
    });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const incomingToken = req.cookies?.refreshToken || req.body?.refreshToken;
    await authService.logout(incomingToken);
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    return successResponse(res, { message: "Logged out successfully" });
  })
);

// --- Session management (backed by Redis) ---

router.get(
  "/sessions",
  authMiddleware,
  asyncHandler(async (req, res) => {
    const sessions = await authService.getSessions(req.user._id.toString());
    return successResponse(res, { data: sessions });
  })
);

router.delete(
  "/sessions/:sessionId",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await authService.revokeOneSession(req.user._id.toString(), req.params.sessionId);
    return successResponse(res, { message: "Session revoked" });
  })
);

router.delete(
  "/sessions",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user._id.toString());
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    return successResponse(res, { message: "Logged out from all sessions" });
  })
);

export default router;
