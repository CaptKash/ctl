import { Router, type IRouter } from "express";
import healthRouter from "./health";
import carsRouter from "./cars";
import authRouter from "./auth";
import clerkAuthRouter from "./clerkAuth";
import feedbackRouter from "./feedback";

const router: IRouter = Router();

router.use(authRouter);
router.use(clerkAuthRouter);
router.use(healthRouter);
router.use(feedbackRouter);
router.use(carsRouter);

export default router;
