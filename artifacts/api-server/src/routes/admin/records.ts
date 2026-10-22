import { randomUUID } from "node:crypto";
import { asc, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateAdminRecordBody,
  CreateAdminRecordResponse,
  DeleteAdminRecordParams,
  GetAdminAuditLogsResponse,
  GetAdminRecordsQueryParams,
  GetAdminRecordsResponse,
  RunAdminSandboxActionBody,
  RunAdminSandboxActionResponse,
  GetAdminRecordsResponseItem,
  UpdateAdminRecordBody,
  UpdateAdminRecordParams,
  UpdateAdminRecordResponse,
} from "@workspace/api-zod";
import {
  adminAuditLogsTable,
  adminRecordsTable,
  coverageRegionsTable,
  db,
  esimPlansTable,
} from "@workspace/db";
import { canAccessModule, getAdminContext } from "../../middlewares/adminAccess";
import { adminModules, findAdminModule, validateAdminData } from "../../lib/admin-modules";

const router: IRouter = Router();

type Data = Record<string, unknown>;
type PublicRecord = {
  id: string;
  module: string;
  name: string;
  status: string;
  data: Data;
  demoOnly: boolean;
  createdAt: string;
  updatedAt: string;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function planRecord(row: typeof esimPlansTable.$inferSelect): PublicRecord {
  return {
    id: row.id,
    module: "data-plans",
    name: row.name,
    status: row.status,
    data: {
      destination: row.destination,
      countryCode: row.countryCode,
      region: row.region,
      dataGb: row.dataGb,
      validityDays: row.validityDays,
      priceUsd: row.priceUsd,
      planType: row.planType,
      networks: row.networks.join(", "),
      featured: row.featured,
    },
    demoOnly: true,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function coverageRecord(row: typeof coverageRegionsTable.$inferSelect): PublicRecord {
  return {
    id: row.id,
    module: "coverage",
    name: row.name,
    status: row.status,
    data: { countryCount: row.countryCount, countries: row.countries.join(", ") },
    demoOnly: true,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function genericRecord(row: typeof adminRecordsTable.$inferSelect): PublicRecord {
  return {
    ...row,
    demoOnly: true,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

function statusIsValid(moduleId: string, status: string): boolean {
  if (moduleId === "data-plans" || moduleId === "coverage") {
    return ["available", "draft", "paused"].includes(status);
  }
  return /^[a-zA-Z0-9_-]{1,60}$/.test(status);
}

function splitList(value: unknown): string[] {
  return typeof value === "string"
    ? value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean)
    : [];
}

function catalogDataIsValid(moduleId: string, data: Data): string | undefined {
  if (moduleId === "data-plans") {
    if (!Number.isInteger(data.validityDays)) return "Validity must be a whole number of days.";
    if (!["data-only", "data-voice-sms"].includes(String(data.planType))) {
      return "Choose a supported plan type.";
    }
  }
  if (moduleId === "coverage" && !Number.isInteger(data.countryCount)) {
    return "Country count must be a whole number.";
  }
  return undefined;
}

async function listModuleRecords(moduleId: string): Promise<PublicRecord[]> {
  if (moduleId === "data-plans") {
    const rows = await db.select().from(esimPlansTable).orderBy(asc(esimPlansTable.destination), asc(esimPlansTable.name));
    return rows.map(planRecord);
  }
  if (moduleId === "coverage") {
    const rows = await db.select().from(coverageRegionsTable).orderBy(asc(coverageRegionsTable.name));
    return rows.map(coverageRecord);
  }
  if (moduleId === "diagnostics") {
    const [plans, regions, records] = await Promise.all([
      db.select({ id: esimPlansTable.id }).from(esimPlansTable).limit(1),
      db.select({ id: coverageRegionsTable.id }).from(coverageRegionsTable).limit(1),
      db.select({ id: adminRecordsTable.id }).from(adminRecordsTable).limit(1),
    ]);
    const now = new Date().toISOString();
    return [
      { id: "database-catalog", module: moduleId, name: "Catalog database", status: plans.length ? "ready" : "empty", data: { check: "database", details: "Plan table is responding." }, demoOnly: true, createdAt: now, updatedAt: now },
      { id: "database-coverage", module: moduleId, name: "Coverage database", status: regions.length ? "ready" : "empty", data: { check: "database", details: "Coverage table is responding." }, demoOnly: true, createdAt: now, updatedAt: now },
      { id: "sandbox-gates", module: moduleId, name: "Live action gates", status: "disabled", data: { provisioning: false, payments: false, customerData: records.length > 0 }, demoOnly: true, createdAt: now, updatedAt: now },
    ];
  }

  const rows = await db
    .select()
    .from(adminRecordsTable)
    .where(eq(adminRecordsTable.module, moduleId))
    .orderBy(desc(adminRecordsTable.updatedAt));
  return rows.map(genericRecord);
}

async function writeAudit(
  actorUserId: string,
  action: string,
  module: string,
  recordId: string,
  summary: string,
  idempotencyKey?: string,
): Promise<void> {
  await db.insert(adminAuditLogsTable).values({
    id: randomUUID(),
    actorUserId,
    action,
    module,
    recordId,
    summary,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });
}

function makeCatalogPlan(id: string, name: string, status: string, data: Data) {
  return {
    id,
    name,
    destination: String(data.destination),
    countryCode: String(data.countryCode).toUpperCase(),
    region: String(data.region),
    dataGb: Number(data.dataGb),
    validityDays: Number(data.validityDays),
    priceUsd: Number(data.priceUsd),
    planType: String(data.planType),
    networks: splitList(data.networks),
    featured: data.featured === true,
    status,
    demoOnly: true,
  };
}

router.get("/modules", async (_req, res): Promise<void> => {
  const { role } = getAdminContext(res);
  const visible = adminModules.filter((item) => canAccessModule(role, item));
  res.json(visible);
});

router.get("/records", async (req, res): Promise<void> => {
  const params = GetAdminRecordsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const module = findAdminModule(params.data.module);
  if (!module) {
    res.status(400).json({ error: "Unknown admin module." });
    return;
  }
  const { role } = getAdminContext(res);
  if (!canAccessModule(role, module)) {
    res.status(403).json({ error: "Your staff role cannot view this module." });
    return;
  }
  if (module.id === "staff-roles" || module.id === "audit-logs") {
    res.status(400).json({ error: "Use the dedicated staff or audit endpoint for this module." });
    return;
  }

  const query = params.data.q?.trim().toLowerCase();
  let rows = await listModuleRecords(module.id);
  if (query) {
    rows = rows.filter((row) =>
      `${row.name} ${row.status} ${JSON.stringify(row.data)}`.toLowerCase().includes(query),
    );
  }
  res.json(GetAdminRecordsResponse.parse(rows.map((row) => GetAdminRecordsResponseItem.parse(row))));
});

router.post("/records", async (req, res): Promise<void> => {
  const parsed = CreateAdminRecordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const module = findAdminModule(parsed.data.module);
  if (!module) {
    res.status(400).json({ error: "Unknown admin module." });
    return;
  }
  if (module.mode === "readonly") {
    res.status(403).json({ error: "This module is read-only." });
    return;
  }
  const context = getAdminContext(res);
  if (!canAccessModule(context.role, module, true)) {
    res.status(403).json({ error: "Your staff role cannot make changes in this module." });
    return;
  }
  if (!statusIsValid(module.id, parsed.data.status)) {
    res.status(400).json({ error: "Choose a valid record status." });
    return;
  }
  const checked = validateAdminData(module, parsed.data.data);
  if (!checked.ok) {
    res.status(400).json({ error: checked.error });
    return;
  }
  const dataError = catalogDataIsValid(module.id, checked.data);
  if (dataError) {
    res.status(400).json({ error: dataError });
    return;
  }

  const id = `${module.id}-${randomUUID()}`;
  let created: PublicRecord;
  if (module.id === "data-plans") {
    const [row] = await db.transaction(async (tx) => {
      const result = await tx.insert(esimPlansTable).values(makeCatalogPlan(id, parsed.data.name, parsed.data.status, checked.data)).returning();
      await tx.insert(adminAuditLogsTable).values({ id: randomUUID(), actorUserId: context.userId, action: "create", module: module.id, recordId: id, summary: "Created a sandbox plan record." });
      return result;
    });
    created = planRecord(row);
  } else if (module.id === "coverage") {
    const [row] = await db.transaction(async (tx) => {
      const result = await tx.insert(coverageRegionsTable).values({
        id,
        name: parsed.data.name,
        countryCount: Number(checked.data.countryCount),
        countries: splitList(checked.data.countries),
        status: parsed.data.status,
        demoOnly: true,
      }).returning();
      await tx.insert(adminAuditLogsTable).values({ id: randomUUID(), actorUserId: context.userId, action: "create", module: module.id, recordId: id, summary: "Created a sandbox coverage region." });
      return result;
    });
    created = coverageRecord(row);
  } else {
    const [row] = await db.transaction(async (tx) => {
      const result = await tx.insert(adminRecordsTable).values({
        id,
        module: module.id,
        name: parsed.data.name,
        status: parsed.data.status,
        data: checked.data,
        demoOnly: true,
      }).returning();
      await tx.insert(adminAuditLogsTable).values({ id: randomUUID(), actorUserId: context.userId, action: "create", module: module.id, recordId: id, summary: "Created a sandbox admin record." });
      return result;
    });
    created = genericRecord(row);
  }

  res.status(201).json(CreateAdminRecordResponse.parse(created));
});

router.patch("/records/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminRecordParams.safeParse(req.params);
  const parsed = UpdateAdminRecordBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  let existing: PublicRecord | undefined;
  let moduleId = "";
  const [generic] = await db.select().from(adminRecordsTable).where(eq(adminRecordsTable.id, params.data.id)).limit(1);
  if (generic) {
    moduleId = generic.module;
    existing = genericRecord(generic);
  } else {
    const [plan] = await db.select().from(esimPlansTable).where(eq(esimPlansTable.id, params.data.id)).limit(1);
    if (plan) {
      moduleId = "data-plans";
      existing = planRecord(plan);
    } else {
      const [region] = await db.select().from(coverageRegionsTable).where(eq(coverageRegionsTable.id, params.data.id)).limit(1);
      if (region) {
        moduleId = "coverage";
        existing = coverageRecord(region);
      }
    }
  }
  if (!existing) {
    res.status(404).json({ error: "Record not found." });
    return;
  }
  const module = findAdminModule(moduleId);
  if (!module || module.mode === "readonly") {
    res.status(403).json({ error: "This record cannot be edited." });
    return;
  }
  const context = getAdminContext(res);
  if (!canAccessModule(context.role, module, true)) {
    res.status(403).json({ error: "Your staff role cannot make changes in this module." });
    return;
  }

  const name = parsed.data.name ?? existing.name;
  const status = parsed.data.status ?? existing.status;
  const data = { ...existing.data, ...(parsed.data.data ?? {}) };
  if (!statusIsValid(module.id, status)) {
    res.status(400).json({ error: "Choose a valid record status." });
    return;
  }
  const checked = validateAdminData(module, data);
  if (!checked.ok) {
    res.status(400).json({ error: checked.error });
    return;
  }
  const dataError = catalogDataIsValid(module.id, checked.data);
  if (dataError) {
    res.status(400).json({ error: dataError });
    return;
  }

  let updated: PublicRecord;
  if (module.id === "data-plans") {
    const [row] = await db.transaction(async (tx) => {
      const result = await tx.update(esimPlansTable).set(makeCatalogPlan(params.data.id, name, status, checked.data)).where(eq(esimPlansTable.id, params.data.id)).returning();
      await tx.insert(adminAuditLogsTable).values({ id: randomUUID(), actorUserId: context.userId, action: "update", module: module.id, recordId: params.data.id, summary: "Updated a sandbox plan record." });
      return result;
    });
    updated = planRecord(row);
  } else if (module.id === "coverage") {
    const [row] = await db.transaction(async (tx) => {
      const result = await tx.update(coverageRegionsTable).set({
        name,
        countryCount: Number(checked.data.countryCount),
        countries: splitList(checked.data.countries),
        status,
      }).where(eq(coverageRegionsTable.id, params.data.id)).returning();
      await tx.insert(adminAuditLogsTable).values({ id: randomUUID(), actorUserId: context.userId, action: "update", module: module.id, recordId: params.data.id, summary: "Updated a sandbox coverage region." });
      return result;
    });
    updated = coverageRecord(row);
  } else {
    const [row] = await db.transaction(async (tx) => {
      const result = await tx.update(adminRecordsTable).set({ name, status, data: checked.data }).where(eq(adminRecordsTable.id, params.data.id)).returning();
      await tx.insert(adminAuditLogsTable).values({ id: randomUUID(), actorUserId: context.userId, action: "update", module: module.id, recordId: params.data.id, summary: "Updated a sandbox admin record." });
      return result;
    });
    updated = genericRecord(row);
  }

  res.json(UpdateAdminRecordResponse.parse(updated));
});

router.delete("/records/:id", async (req, res): Promise<void> => {
  const params = DeleteAdminRecordParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const id = params.data.id;
  const [generic] = await db.select().from(adminRecordsTable).where(eq(adminRecordsTable.id, id)).limit(1);
  const [plan] = generic ? [] : await db.select().from(esimPlansTable).where(eq(esimPlansTable.id, id)).limit(1);
  const [region] = generic || plan ? [] : await db.select().from(coverageRegionsTable).where(eq(coverageRegionsTable.id, id)).limit(1);
  const moduleId = generic?.module ?? (plan ? "data-plans" : region ? "coverage" : "");
  const module = findAdminModule(moduleId);
  if (!module) {
    res.status(404).json({ error: "Record not found." });
    return;
  }
  if (module.mode === "readonly") {
    res.status(403).json({ error: "This module is read-only." });
    return;
  }
  const context = getAdminContext(res);
  if (!canAccessModule(context.role, module, true)) {
    res.status(403).json({ error: "Your staff role cannot make changes in this module." });
    return;
  }

  await db.transaction(async (tx) => {
    if (generic) await tx.delete(adminRecordsTable).where(eq(adminRecordsTable.id, id));
    else if (plan) await tx.delete(esimPlansTable).where(eq(esimPlansTable.id, id));
    else if (region) await tx.delete(coverageRegionsTable).where(eq(coverageRegionsTable.id, id));
    await tx.insert(adminAuditLogsTable).values({
      id: randomUUID(),
      actorUserId: context.userId,
      action: "delete",
      module: module.id,
      recordId: id,
      summary: "Deleted a sandbox admin record.",
    });
  });
  res.sendStatus(204);
});

router.post("/actions", async (req, res): Promise<void> => {
  const parsed = RunAdminSandboxActionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { module: moduleId, recordId, action } = parsed.data;
  const module = findAdminModule(moduleId);
  if (!module || !module.actions.includes(action)) {
    res.status(400).json({ error: "This sandbox action is not available for that module." });
    return;
  }
  const context = getAdminContext(res);
  if (!canAccessModule(context.role, module, true)) {
    res.status(403).json({ error: "Your staff role cannot run this action." });
    return;
  }

  const existing = await listModuleRecords(moduleId);
  if (!existing.some((row) => row.id === recordId)) {
    res.status(404).json({ error: "Record not found." });
    return;
  }
  const idempotencyKey = parsed.data.idempotencyKey ?? randomUUID();
  const auditId = randomUUID();
  await db
    .insert(adminAuditLogsTable)
    .values({
      id: auditId,
      actorUserId: context.userId,
      action,
      module: moduleId,
      recordId,
      summary: "Sandbox dry run recorded; no external service was called and no live state was changed.",
      idempotencyKey,
    })
    .onConflictDoNothing();
  const [audit] = await db
    .select()
    .from(adminAuditLogsTable)
    .where(eq(adminAuditLogsTable.idempotencyKey, idempotencyKey))
    .limit(1);
  if (!audit || audit.actorUserId !== context.userId || audit.recordId !== recordId || audit.action !== action) {
    res.status(409).json({ error: "Idempotency key was already used for another action." });
    return;
  }

  res.json(
    RunAdminSandboxActionResponse.parse({
      id: audit.id,
      module: moduleId,
      recordId,
      action,
      status: "simulated",
      detail: "Sandbox dry run recorded. No provider call, payment settlement, provisioning, or customer state change occurred.",
      liveExecuted: false,
      createdAt: iso(audit.createdAt),
    }),
  );
});

router.get("/audit-logs", async (_req, res): Promise<void> => {
  const { role } = getAdminContext(res);
  const auditModule = findAdminModule("audit-logs");
  if (!auditModule || !canAccessModule(role, auditModule)) {
    res.status(403).json({ error: "Your staff role cannot view audit history." });
    return;
  }
  const rows = await db.select().from(adminAuditLogsTable).orderBy(desc(adminAuditLogsTable.createdAt)).limit(250);
  res.json(
    GetAdminAuditLogsResponse.parse(
      rows.map((row) => ({
        id: row.id,
        actorUserId: row.actorUserId,
        action: row.action,
        module: row.module,
        recordId: row.recordId,
        summary: row.summary,
        createdAt: iso(row.createdAt),
      })),
    ),
  );
});

export default router;
