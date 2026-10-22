import { randomUUID } from "node:crypto";
import { clerkClient } from "@clerk/express";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateAdminStaffBody,
  CreateAdminStaffResponse,
  DeleteAdminStaffParams,
  GetAdminStaffResponse,
  UpdateAdminStaffBody,
  UpdateAdminStaffParams,
  UpdateAdminStaffResponse,
} from "@workspace/api-zod";
import { adminAuditLogsTable, db, staffRolesTable } from "@workspace/db";
import { getAdminContext, requireOwner } from "../../middlewares/adminAccess";

const router: IRouter = Router();
router.use(requireOwner);

function permissionsFor(role: string): string[] {
  switch (role) {
    case "admin":
      return ["catalog:read", "catalog:write", "telecom:read", "telecom:write", "payments:read", "payments:write", "operations:read", "operations:write", "support:read", "support:write", "settings:read", "settings:write"];
    case "operator":
      return ["catalog:read", "catalog:write", "telecom:read", "telecom:write", "operations:read", "operations:write", "support:read"];
    case "support":
      return ["customers:read", "support:read", "support:write", "operations:read"];
    default:
      return ["catalog:read", "telecom:read", "payments:read", "operations:read", "support:read", "settings:read"];
  }
}

function toStaffRole(row: typeof staffRolesTable.$inferSelect) {
  return {
    userId: row.userId,
    email: row.email,
    role: row.role,
    permissions: row.permissions,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
  };
}

async function audit(actorUserId: string, action: string, userId: string, summary: string) {
  await db.insert(adminAuditLogsTable).values({
    id: randomUUID(),
    actorUserId,
    action,
    module: "staff-roles",
    recordId: userId,
    summary,
  });
}

router.get("/staff", async (_req, res): Promise<void> => {
  const rows = await db.select().from(staffRolesTable).orderBy(staffRolesTable.email);
  res.json(GetAdminStaffResponse.parse(rows.map(toStaffRole)));
});

router.post("/staff", async (req, res): Promise<void> => {
  const parsed = CreateAdminStaffBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const email = parsed.data.email.trim().toLowerCase();
  const userList = await clerkClient.users.getUserList({
    emailAddress: [email],
    limit: 1,
  });
  const account = userList.data[0];
  if (!account) {
    res.status(404).json({ error: "This person must create an account before a staff role can be assigned." });
    return;
  }
  const accountEmail = account.primaryEmailAddress?.emailAddress.toLowerCase();
  if (!accountEmail || accountEmail !== email) {
    res.status(400).json({ error: "The account does not have that email as its primary address." });
    return;
  }

  const [emailOwner] = await db.select().from(staffRolesTable).where(eq(staffRolesTable.email, email)).limit(1);
  if (emailOwner && emailOwner.userId !== account.id) {
    res.status(409).json({ error: "That email is already assigned to a different staff identity." });
    return;
  }
  const [existing] = await db.select().from(staffRolesTable).where(eq(staffRolesTable.userId, account.id)).limit(1);
  if (existing?.role === "owner") {
    res.status(409).json({ error: "The owner role cannot be changed through staff assignment." });
    return;
  }

  const role = parsed.data.role;
  const [row] = await db.transaction(async (tx) => {
    const result = await tx
      .insert(staffRolesTable)
      .values({
        userId: account.id,
        email,
        role,
        permissions: permissionsFor(role),
        enabled: true,
      })
      .onConflictDoUpdate({
        target: staffRolesTable.userId,
        set: { email, role, permissions: permissionsFor(role), enabled: true },
      })
      .returning();
    await tx.insert(adminAuditLogsTable).values({
      id: randomUUID(),
      actorUserId: getAdminContext(res).userId,
      action: existing ? "update-role" : "assign-role",
      module: "staff-roles",
      recordId: account.id,
      summary: `Assigned the ${role} role to a staff account.`,
    });
    return result;
  });
  res.status(201).json(CreateAdminStaffResponse.parse(toStaffRole(row)));
});

router.patch("/staff/:userId", async (req, res): Promise<void> => {
  const params = UpdateAdminStaffParams.safeParse(req.params);
  const parsed = UpdateAdminStaffBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [existing] = await db.select().from(staffRolesTable).where(eq(staffRolesTable.userId, params.data.userId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Staff account not found." });
    return;
  }
  if (existing.role === "owner") {
    res.status(403).json({ error: "The owner role cannot be changed through staff assignment." });
    return;
  }

  const [row] = await db.transaction(async (tx) => {
    const result = await tx
      .update(staffRolesTable)
      .set({
        role: parsed.data.role,
        permissions: permissionsFor(parsed.data.role),
        enabled: parsed.data.enabled,
      })
      .where(eq(staffRolesTable.userId, params.data.userId))
      .returning();
    await tx.insert(adminAuditLogsTable).values({
      id: randomUUID(),
      actorUserId: getAdminContext(res).userId,
      action: parsed.data.enabled ? "update-role" : "disable-role",
      module: "staff-roles",
      recordId: params.data.userId,
      summary: `Updated staff role to ${parsed.data.role}; enabled=${parsed.data.enabled}.`,
    });
    return result;
  });
  res.json(UpdateAdminStaffResponse.parse(toStaffRole(row)));
});

router.delete("/staff/:userId", async (req, res): Promise<void> => {
  const params = DeleteAdminStaffParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const context = getAdminContext(res);
  if (context.userId === params.data.userId) {
    res.status(400).json({ error: "You cannot revoke your own staff access." });
    return;
  }
  const [existing] = await db.select().from(staffRolesTable).where(eq(staffRolesTable.userId, params.data.userId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Staff account not found." });
    return;
  }
  if (existing.role === "owner") {
    res.status(403).json({ error: "The owner role cannot be revoked through staff assignment." });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.delete(staffRolesTable).where(eq(staffRolesTable.userId, params.data.userId));
    await tx.insert(adminAuditLogsTable).values({
      id: randomUUID(),
      actorUserId: context.userId,
      action: "revoke-role",
      module: "staff-roles",
      recordId: params.data.userId,
      summary: "Revoked staff access.",
    });
  });
  res.sendStatus(204);
});

export default router;
