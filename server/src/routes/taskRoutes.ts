import express from "express";
import {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateTaskStatus,
} from "../controllers/taskControllers";
import { validate } from "./../middleware/validate";
import {
  createTaskSchema,
  updateTaskSchema,
  updateTaskStatusSchema,
} from "../schemas/taskSchema";
import authenticate from "../middleware/authenticate";

const router = express.Router();

router.post("/tasks", validate(createTaskSchema), createTask);
router.get("/tasks", getTasks);
router.get("/tasks/:id", getTaskById);
router.put("/tasks/:id", validate(updateTaskSchema), updateTask);
router.delete("/tasks/:id", deleteTask);
router.put(
  "/tasks/:id/status",
  validate(updateTaskStatusSchema),
  updateTaskStatus,
);

export default router;
