import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import articlesRouter from "./articles";
import categoriesRouter from "./categories";
import commentsRouter from "./comments";
import adminCommentsRouter from "./adminComments";
import adminStatsRouter from "./adminStats";
import settingsRouter from "./settings";
import uploadRouter from "./upload";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(articlesRouter);
router.use(categoriesRouter);
router.use(commentsRouter);
router.use(adminCommentsRouter);
router.use(adminStatsRouter);
router.use(settingsRouter);
router.use(uploadRouter);

export default router;
