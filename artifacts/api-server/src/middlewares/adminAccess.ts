import { clerkClient, getAuth } from "@clerk/express";
import { and, eq } from "drizzle-orm";
import type { RequestHandler, Response } from "express";
import { db, staffRolesTable } from "@workspace/db";

export type WaylineRole = "owner" | "admin" | "operator" | "support" | "read-only";

export type AdminContext = {
  userId: string;
  role: WaylineRole;
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  try {
    const userId = getAuth(req).userId;
    if (!userId) {
      res.status(401).json({ error: "Sign in to continue.", code: "sign_in_required" });
      return;
    }

    let [staff] = await db
      .select()
      .from(staffRolesTable)
      .where(and(eq(staffRolesTable.userId, userId), eq(staffRolesTable.enabled, true)))
      .limit(1);

    if (!staff && process.env.WAYLINE_ADMIN_EMAIL) {
      const [owners] = await db
        .select({ userId: staffRolesTable.userId })
        .from(staffRolesTable)
        .where(eq(staffRolesTable.role, "owner"))
        .limit(1);

      if (!owners) {
        const user = await clerkClient.users.getUser(userId);
        const accountEmail = user.primaryEmailAddress?.emailAddress.toLowerCase();
        const configuredEmail = process.env.WAYLINE_ADMIN_EMAIL.trim().toLowerCase();
        if (accountEmail && accountEmail === configuredEmail) {
          await db
            .insert(staffRolesTable)
            .values({
              userId,
              email: accountEmail,
              role: "owner",
              permissions: ["*"],
              enabled: true,
            })
            .onConflictDoNothing();
          [staff] = await db
            .select()
            .from(staffRolesTable)
            .where(and(eq(staffRolesTable.userId, userId), eq(staffRolesTable.enabled, true)))
            .limit(1);
        }
      }
    }

    if (!staff) {
      const code = process.env.WAYLINE_ADMIN_EMAIL
        ? "admin_access_required"
        : "admin_setup_required";
      res.status(403).json({
        error:
          code === "admin_setup_required"
            ? "Admin access is not configured. Set WAYLINE_ADMIN_EMAIL, then sign in with that account."
            : "Your account does not have an enabled Wayline staff role.",
        code,
      });
      return;
    }

    res.locals.wayline = {
      userId: staff.userId,
      role: staff.role as WaylineRole,
    } satisfies AdminContext;
    next();
  } catch (error) {
    next(error);
  }
};

export const requireOwner: RequestHandler = (req, res, next) => {
  const context = getAdminContext(res);
  if (context.role !== "owner") {
    res.status(403).json({ error: "Owner access is required.", code: "owner_required" });
    return;
  }
  next();
};

export function getAdminContext(res: Response): AdminContext {
  return res.locals.wayline as AdminContext;
}

export function canAccessModule(
  role: WaylineRole,
  module: { id: string; category: string },
  write = false,
): boolean {
  if (module.id === "staff-roles") return role === "owner" && !write;
  if (module.id === "audit-logs") {
    return !write && ["owner", "admin", "read-only"].includes(role);
  }
  if (role === "owner") return true;
  if (role === "admin") return module.id !== "staff-roles";

  if (!write) {
    if (role === "read-only") return true;
    if (role === "operator") return module.category !== "security";
    return ["support", "customers", "operations"].includes(module.category);
  }

  if (role === "operator") {
    return ["operations", "catalog", "telecom"].includes(module.category);
  }
  if (role === "support") return module.category === "support";
  return false;
}
