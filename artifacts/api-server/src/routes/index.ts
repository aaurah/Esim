import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import adminRouter from "./admin";
import { requireAdmin } from "../middlewares/adminAccess";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use("/admin", requireAdmin, adminRouter);

export default router;
