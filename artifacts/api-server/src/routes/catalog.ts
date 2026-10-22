import { Router, type IRouter } from "express";
import {
  GetCoverageResponse,
  GetPlansResponse,
} from "@workspace/api-zod";
import { asc, eq } from "drizzle-orm";
import { db, coverageRegionsTable, esimPlansTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/catalog/plans", async (_req, res): Promise<void> => {
  const plans = await db
    .select()
    .from(esimPlansTable)
    .where(eq(esimPlansTable.status, "available"))
    .orderBy(asc(esimPlansTable.destination), asc(esimPlansTable.priceUsd));

  res.json(GetPlansResponse.parse(plans));
});

router.get("/catalog/coverage", async (_req, res): Promise<void> => {
  const regions = await db
    .select()
    .from(coverageRegionsTable)
    .where(eq(coverageRegionsTable.status, "available"))
    .orderBy(asc(coverageRegionsTable.name));

  res.json(GetCoverageResponse.parse(regions));
});

export default router;
