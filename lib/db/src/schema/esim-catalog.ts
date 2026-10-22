import {
  boolean,
  integer,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const esimPlansTable = pgTable("esim_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  destination: text("destination").notNull(),
  countryCode: text("country_code").notNull(),
  region: text("region").notNull(),
  dataGb: real("data_gb").notNull(),
  validityDays: integer("validity_days").notNull(),
  priceUsd: real("price_usd").notNull(),
  planType: text("plan_type").notNull(),
  networks: text("networks").array().notNull(),
  featured: boolean("featured").notNull().default(false),
  status: text("status").notNull().default("available"),
  demoOnly: boolean("demo_only").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEsimPlanSchema = createInsertSchema(esimPlansTable).omit({
  demoOnly: true,
});
export type InsertEsimPlan = z.infer<typeof insertEsimPlanSchema>;
export type EsimPlan = typeof esimPlansTable.$inferSelect;

export const coverageRegionsTable = pgTable("coverage_regions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  countryCount: integer("country_count").notNull(),
  countries: text("countries").array().notNull(),
  status: text("status").notNull().default("available"),
  demoOnly: boolean("demo_only").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCoverageRegionSchema = createInsertSchema(
  coverageRegionsTable,
).omit({ demoOnly: true });
export type InsertCoverageRegion = z.infer<typeof insertCoverageRegionSchema>;
export type CoverageRegion = typeof coverageRegionsTable.$inferSelect;
