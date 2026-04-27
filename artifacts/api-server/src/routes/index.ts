import { Router, type IRouter } from "express";
import healthRouter from "./health";
import autocareRouter from "./autocare";

const router: IRouter = Router();

router.use(healthRouter);
router.use(autocareRouter);

export default router;
