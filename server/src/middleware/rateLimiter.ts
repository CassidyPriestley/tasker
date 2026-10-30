import rateLimit from "express-rate-limit";

// TESTING PURPOSES
const isTestEnv = process.env.NODE_ENV === "test";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { message: "Too many attempts, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
});

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: { message: "Too many requests, please try agin later" },
  standardHeaders: true,
  legacyHeaders: false,
});
