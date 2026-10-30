import { AuthPayload } from "./auth";

// DECLARE GLOBAL
declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}
