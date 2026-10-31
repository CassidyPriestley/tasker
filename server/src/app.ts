import express from "express";
import cors from "cors";
import errorHandler from "./middleware/errorHandler";
import { requestLogger } from "./middleware/requestLogger";
import authRouter from "./routes/authRoutes";
import userRouter from "./routes/userRoutes";
import taskRouter from "./routes/taskRoutes";
import habitRouter from "./routes/habitRoutes";
import habitLogRouter from "./routes/habitLogRoutes";
import AppError from "./utils/AppError";
import cookieParser from "cookie-parser";
import authenticate from "./middleware/authenticate";
import helmet from "helmet";
import { authLimiter, generalLimiter } from "./middleware/rateLimiter";

const app = express();
// Render (and Netlify's proxy in front of it) forward requests to us.
// Trusting those 2 hops lets req.ip be the visitor's real IP, which the rate limiter needs.
app.set("trust proxy", 2);

const allowedOrigins = process.env.CORS_ORIGINS?.split(",").map((o) =>
  o.trim(),
) ?? ["http://localhost:4000", "http://localhost:8081"];

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.use(generalLimiter);
// ROUTES
// only throttle /auth/* — without the path this limit hit every route
app.use("/auth", authLimiter);
app.use(authRouter);
app.use(authenticate);
app.use(userRouter);
app.use(taskRouter);
app.use(habitRouter);
app.use(habitLogRouter);

// DEBUGGING
app.get("/test-error", (req, res, next) => {
  next(new AppError("Test operational error", 400));
});
// ERROR HANDLER ALWAYS LAST
app.use(errorHandler);

export default app;
