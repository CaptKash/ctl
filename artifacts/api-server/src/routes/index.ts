import { Router, type IRouter } from "express";
import healthRouter from "./health";
import carsRouter from "./cars";
import orgsRouter from "./orgs";
import authRouter from "./auth";
import clerkAuthRouter from "./clerkAuth";
import feedbackRouter from "./feedback";
import ssoCallbackRouter from "./ssoCallback";
import adminSetupRouter from "./adminSetup";

const router: IRouter = Router();

router.use(adminSetupRouter);
router.use(ssoCallbackRouter);
router.use(authRouter);
router.use(clerkAuthRouter);
router.use(healthRouter);
router.use(feedbackRouter);
router.use(orgsRouter);
router.use(carsRouter);

export default router;
