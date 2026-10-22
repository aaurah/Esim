export type AdminFieldType = "text" | "textarea" | "number" | "boolean" | "select";

export type AdminFieldDefinition = {
  key: string;
  label: string;
  type: AdminFieldType;
  required: boolean;
  options?: string[];
  helpText?: string;
};

export type AdminModuleDefinition = {
  id: string;
  label: string;
  description: string;
  category:
    | "operations"
    | "catalog"
    | "telecom"
    | "payments"
    | "customers"
    | "support"
    | "security"
    | "system";
  mode: "editable" | "gated" | "readonly";
  fields: AdminFieldDefinition[];
  actions: string[];
};

const f = (
  key: string,
  label: string,
  type: AdminFieldType = "text",
  required = false,
  options?: string[],
  helpText?: string,
): AdminFieldDefinition => ({
  key,
  label,
  type,
  required,
  ...(options ? { options } : {}),
  ...(helpText ? { helpText } : {}),
});

const fields = {
  customer: [
    f("customerRef", "Pseudonymous customer ref", "text", true),
    f("region", "Region"),
    f("accountType", "Account type", "select", true, ["guest", "optional-account"]),
    f("note", "Internal note", "textarea"),
  ],
  profile: [
    f("profileRef", "Profile request ref", "text", true),
    f("destination", "Destination", "text", true),
    f("planRef", "Plan ref"),
    f("serviceType", "Service type", "select", true, ["data-only", "voice-sms"]),
    f("note", "Internal note", "textarea"),
  ],
  provider: [
    f("providerName", "Provider name", "text", true),
    f("environment", "Environment", "select", true, ["sandbox", "production"]),
    f("baseUrl", "API base URL"),
    f("capabilities", "Capabilities", "textarea"),
    f("credentialSecretName", "Replit Secret name", "text", false, undefined, "Store the credential value in Replit Secrets. Secret values are never accepted or stored here."),
  ],
  network: [
    f("country", "Country", "text", true),
    f("carrierName", "Carrier/network", "text", true),
    f("technology", "Technology", "select", true, ["4G", "5G", "4G/5G", "Unknown"]),
    f("providerRef", "Provider ref"),
  ],
  plan: [
    f("destination", "Destination", "text", true),
    f("countryCode", "Country code", "text", true),
    f("region", "Region", "text", true),
    f("dataGb", "Data allowance (GB)", "number", true),
    f("validityDays", "Validity (days)", "number", true),
    f("priceUsd", "Retail price (USD)", "number", true),
    f("planType", "Plan type", "select", true, ["data-only", "data-voice-sms"]),
    f("networks", "Networks", "text", true, undefined, "Separate sample network names with commas."),
    f("featured", "Feature on storefront", "boolean"),
  ],
  phone: [
    f("country", "Country", "text", true),
    f("numberType", "Number type", "select", true, ["mobile", "local", "toll-free"]),
    f("providerRef", "Authorized provider ref"),
    f("inventoryRef", "Inventory reference", "text", true),
  ],
  voice: [
    f("packageName", "Package name", "text", true),
    f("country", "Country", "text", true),
    f("minutes", "Included minutes", "number"),
    f("smsCount", "Included SMS", "number"),
    f("providerRef", "Provider ref"),
  ],
  crypto: [
    f("gateway", "Gateway", "select", true, ["BTCPay Server", "Other approved gateway"]),
    f("currency", "Currency", "text", true),
    f("network", "Network", "text", true),
    f("confirmations", "Required confirmations", "number"),
    f("credentialSecretName", "Replit Secret name", "text", false, undefined, "Do not enter an API key, seed phrase, or private key here. Store credentials in Replit Secrets."),
  ],
  recharge: [
    f("orderRef", "Order ref", "text", true),
    f("profileRef", "Profile request ref", "text", true),
    f("planRef", "Top-up plan", "text", true),
    f("amountUsd", "Amount (USD)", "number", true),
  ],
  order: [
    f("orderRef", "Order ref", "text", true),
    f("customerRef", "Pseudonymous customer ref", "text", true),
    f("planRef", "Plan ref", "text", true),
    f("amountUsd", "Amount (USD)", "number", true),
    f("currency", "Currency", "text", true),
  ],
  inventory: [
    f("providerRef", "Provider ref", "text", true),
    f("sku", "Supplier SKU", "text", true),
    f("availableUnits", "Available units", "number"),
    f("wholesaleCostUsd", "Wholesale cost (USD)", "number"),
  ],
  pricing: [
    f("itemRef", "Plan or product ref", "text", true),
    f("retailPrice", "Retail price", "number", true),
    f("currency", "Currency", "text", true),
    f("targetMarginPercent", "Target margin (%)", "number"),
  ],
  coverage: [
    f("countryCount", "Country count", "number", true),
    f("countries", "Countries", "textarea", true, undefined, "Separate sandbox country names with commas."),
  ],
  job: [
    f("jobType", "Job type", "text", true),
    f("attempts", "Attempts", "number"),
    f("nextRunAt", "Next run (UTC)"),
    f("note", "Job context", "textarea"),
  ],
  webhook: [
    f("endpointUrl", "HTTPS endpoint", "text", true),
    f("eventTypes", "Event types", "textarea", true, undefined, "One event name per line. Sandbox tests do not send network requests."),
    f("signingSecretName", "Replit Secret name", "text", false, undefined, "Only store the secret name here. Put the signing secret itself in Replit Secrets."),
  ],
  ticket: [
    f("ticketRef", "Ticket ref", "text", true),
    f("category", "Category", "select", true, ["activation", "billing", "device", "coverage", "other"]),
    f("priority", "Priority", "select", true, ["low", "normal", "high"]),
    f("summary", "Summary", "textarea", true),
  ],
  invoice: [
    f("invoiceRef", "Invoice ref", "text", true),
    f("orderRef", "Order ref", "text", true),
    f("amount", "Amount", "number", true),
    f("currency", "Currency", "text", true),
  ],
  refund: [
    f("orderRef", "Order ref", "text", true),
    f("amountUsd", "Amount (USD)", "number", true),
    f("reason", "Reason", "textarea", true),
  ],
  promotion: [
    f("code", "Promo code", "text", true),
    f("discountPercent", "Discount (%)", "number", true),
    f("expiresOn", "Expiry date"),
  ],
  setting: [
    f("settingKey", "Setting", "text", true),
    f("value", "Value", "text", true),
    f("section", "Section", "select", true, ["storefront", "privacy", "operations", "support"]),
  ],
};

const moduleDef = (
  id: string,
  label: string,
  description: string,
  category: AdminModuleDefinition["category"],
  mode: AdminModuleDefinition["mode"],
  moduleFields: AdminFieldDefinition[] = [],
  actions: string[] = [],
): AdminModuleDefinition => ({
  id,
  label,
  description,
  category,
  mode,
  fields: moduleFields,
  actions,
});

export const adminModules: AdminModuleDefinition[] = [
  moduleDef("customers", "Customers", "Pseudonymous sandbox customer records.", "customers", "editable", fields.customer),
  moduleDef("esim-profiles", "eSIM profiles", "Track profile requests without storing fake credentials or QR codes.", "telecom", "gated", fields.profile, ["dry-run-provision"]),
  moduleDef("telecom-providers", "Telecom providers", "Provider metadata and capabilities; credentials stay in Replit Secrets.", "telecom", "gated", fields.provider, ["test-provider-sandbox"]),
  moduleDef("networks", "Mobile networks", "Carrier and technology catalog examples.", "telecom", "editable", fields.network),
  moduleDef("data-plans", "Data plans", "Manage sandbox storefront plans and their availability.", "catalog", "editable", fields.plan),
  moduleDef("phone-numbers", "Phone numbers", "Manage authorized-provider inventory references, never fabricated numbers.", "telecom", "gated", fields.phone),
  moduleDef("voice-sms", "Voice and SMS", "Manage service-package definitions; carrier activation is unavailable.", "telecom", "gated", fields.voice),
  moduleDef("crypto-payments", "Crypto payments", "Gateway and network metadata only; no wallet keys or live settlement.", "payments", "gated", fields.crypto, ["test-provider-sandbox"]),
  moduleDef("recharges", "Recharges", "Track top-up requests; success requires supplier confirmation.", "operations", "gated", fields.recharge, ["dry-run-recharge"]),
  moduleDef("orders", "Orders", "Sandbox order records. Payment is never inferred from an order status.", "operations", "editable", fields.order),
  moduleDef("supplier-inventory", "Supplier inventory", "Track sample wholesale inventory and costs.", "telecom", "editable", fields.inventory),
  moduleDef("pricing", "Pricing and margins", "Manage retail pricing assumptions and target margins.", "catalog", "editable", fields.pricing),
  moduleDef("coverage", "Country coverage", "Manage the demo regions displayed in the storefront.", "catalog", "editable", fields.coverage),
  moduleDef("jobs", "Automation jobs", "Track job requests; retries only create sandbox dry-run events.", "operations", "gated", fields.job, ["retry-job-sandbox"]),
  moduleDef("webhooks", "Webhooks", "Configure event destinations; sandbox test does not send network traffic.", "system", "gated", fields.webhook, ["test-webhook-sandbox"]),
  moduleDef("support-tickets", "Support tickets", "Pseudonymous sandbox support cases.", "support", "editable", fields.ticket),
  moduleDef("invoices", "Invoices", "Track invoice metadata without marking crypto payments settled.", "payments", "editable", fields.invoice),
  moduleDef("refunds", "Refunds", "Review refund requests; no payment provider call is made.", "payments", "gated", fields.refund, ["simulate-refund"]),
  moduleDef("promotions", "Discounts", "Manage sandbox promotional codes.", "catalog", "editable", fields.promotion),
  moduleDef("staff-roles", "Staff roles", "Manage access for existing staff accounts. Owner-only.", "security", "readonly"),
  moduleDef("audit-logs", "Audit history", "Review administrative actions; entries cannot be edited.", "security", "readonly"),
  moduleDef("settings", "System settings", "Manage non-secret sandbox preferences.", "system", "editable", fields.setting),
  moduleDef("diagnostics", "Diagnostics", "Review service readiness and blocked live capabilities.", "system", "readonly"),
];

export function findAdminModule(id: string): AdminModuleDefinition | undefined {
  return adminModules.find((item) => item.id === id);
}

export function validateAdminData(
  module: AdminModuleDefinition,
  value: unknown,
): { ok: true; data: Record<string, unknown> } | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Record data must be an object." };
  }

  const data = value as Record<string, unknown>;
  const allowed = new Set(module.fields.map((item) => item.key));
  const unexpected = Object.keys(data).find((key) => !allowed.has(key));
  if (unexpected) {
    return { ok: false, error: `Field "${unexpected}" is not allowed for this module.` };
  }

  for (const field of module.fields) {
    const fieldValue = data[field.key];
    if (field.required && (fieldValue == null || fieldValue === "")) {
      return { ok: false, error: `${field.label} is required.` };
    }
    if (fieldValue == null || fieldValue === "") continue;
    if (field.type === "text" || field.type === "textarea") {
      if (typeof fieldValue !== "string" || fieldValue.length > 4000) {
        return { ok: false, error: `${field.label} must be text under 4,000 characters.` };
      }
      if (/^(api.?key|secret|token|password|private.?key|seed.?phrase)$/i.test(field.key)) {
        return { ok: false, error: "Credential values are not accepted in admin records." };
      }
    } else if (field.type === "number") {
      if (typeof fieldValue !== "number" || !Number.isFinite(fieldValue) || fieldValue < 0) {
        return { ok: false, error: `${field.label} must be a non-negative number.` };
      }
    } else if (field.type === "boolean") {
      if (typeof fieldValue !== "boolean") {
        return { ok: false, error: `${field.label} must be true or false.` };
      }
    } else if (field.type === "select") {
      if (typeof fieldValue !== "string" || !field.options?.includes(fieldValue)) {
        return { ok: false, error: `${field.label} has an unsupported value.` };
      }
    }
  }

  return { ok: true, data };
}
