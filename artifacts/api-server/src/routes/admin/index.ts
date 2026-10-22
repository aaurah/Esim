import { count } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetAdminIntegrationsResponse,
  GetAdminOverviewResponse,
} from "@workspace/api-zod";
import {
  adminAuditLogsTable,
  adminRecordsTable,
  coverageRegionsTable,
  db,
  esimPlansTable,
} from "@workspace/db";
import recordsRouter from "./records";
import staffRouter from "./staff";

const router: IRouter = Router();

router.get("/overview", async (_req, res): Promise<void> => {
  const [plans, regions, records, events] = await Promise.all([
    db.select({ value: count() }).from(esimPlansTable),
    db.select({ value: count() }).from(coverageRegionsTable),
    db.select({ value: count() }).from(adminRecordsTable),
    db.select({ value: count() }).from(adminAuditLogsTable),
  ]);

  res.json(
    GetAdminOverviewResponse.parse({
      mode: "sandbox",
      planCount: plans[0]?.value ?? 0,
      coverageRegionCount: regions[0]?.value ?? 0,
      recordCount: records[0]?.value ?? 0,
      auditEventCount: events[0]?.value ?? 0,
      liveProvisioningEnabled: false,
      livePaymentsEnabled: false,
    }),
  );
});

router.get("/integrations", (_req, res): void => {
  res.json(
    GetAdminIntegrationsResponse.parse([
      {
        id: "telecom-provider",
        category: "telecom",
        name: "Telecom provider",
        status: "not-configured",
        note: "Connect and verify an authorized supplier before any eSIM provisioning or recharge.",
      },
      {
        id: "crypto-payments",
        category: "payments",
        name: "Crypto payments",
        status: "not-configured",
        note: "Configure and verify a payment processor before accepting or settling payments.",
      },
    ]),
  );
});

router.use(recordsRouter);
router.use(staffRouter);

export default router;
