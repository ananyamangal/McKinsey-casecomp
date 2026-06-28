"use client";

import { useState } from "react";
import {
  Bell,
  Bot,
  Check,
  Cpu,
  Database,
  Mail,
  MessageSquare,
  Save,
  Satellite,
  ShieldCheck,
  Smartphone,
  UserPlus,
  X,
} from "lucide-react";
import { humanize, initials } from "@halo/utils";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@halo/ui";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { useAuthStore } from "@/lib/store/auth-store";

const ROLE_OPTIONS = [
  "owner",
  "general_manager",
  "service_advisor",
  "parts_manager",
  "finance",
  "technician",
  "viewer",
] as const;

type RoleBadgeVariant = "default" | "info" | "success" | "warning" | "secondary" | "muted";

function roleVariant(role: string): RoleBadgeVariant {
  switch (role) {
    case "owner":
      return "default";
    case "general_manager":
      return "info";
    case "finance":
      return "warning";
    case "parts_manager":
      return "success";
    case "service_advisor":
      return "secondary";
    default:
      return "muted";
  }
}

// ---------------------------------------------------------------------------
// RBAC matrix
// ---------------------------------------------------------------------------
const RBAC_ROLES = ["Owner", "Manager", "Service Advisor", "Parts Manager", "Finance", "Viewer"];
const RBAC_PERMISSIONS: { permission: string; grants: boolean[] }[] = [
  { permission: "View dashboards", grants: [true, true, true, true, true, true] },
  { permission: "Manage work orders", grants: [true, true, true, false, false, false] },
  { permission: "Manage inventory", grants: [true, true, false, true, false, false] },
  { permission: "Approve purchase orders", grants: [true, true, false, true, false, false] },
  { permission: "Issue & void invoices", grants: [true, true, false, false, true, false] },
  { permission: "Reconcile payments", grants: [true, true, false, false, true, false] },
  { permission: "Configure AI agents", grants: [true, true, false, false, false, false] },
  { permission: "Manage team & roles", grants: [true, false, false, false, false, false] },
  { permission: "Edit dealership settings", grants: [true, true, false, false, false, false] },
];

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------
type IntegrationStatus = "connected" | "action_required" | "disconnected";
const INTEGRATIONS: {
  id: string;
  name: string;
  description: string;
  icon: typeof Database;
  defaultOn: boolean;
  status: IntegrationStatus;
  meta: string;
}[] = [
  {
    id: "sap",
    name: "SAP ERP",
    description: "Sync invoices, GL postings and master data with your finance backbone.",
    icon: Database,
    defaultOn: true,
    status: "connected",
    meta: "Last sync 4 min ago",
  },
  {
    id: "dms",
    name: "Dealer Management System",
    description: "Two-way sync of work orders, vehicles and customer records.",
    icon: Cpu,
    defaultOn: true,
    status: "connected",
    meta: "Last sync 12 min ago",
  },
  {
    id: "ais140",
    name: "AIS140 Telematics",
    description: "Ingest live vehicle telemetry for predictive maintenance signals.",
    icon: Satellite,
    defaultOn: true,
    status: "action_required",
    meta: "3 devices need re-pairing",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Send service reminders, estimates and payment links over WhatsApp.",
    icon: MessageSquare,
    defaultOn: true,
    status: "connected",
    meta: "Verified number active",
  },
  {
    id: "sms",
    name: "SMS Gateway",
    description: "DLT-compliant transactional SMS for OTPs and status updates.",
    icon: Smartphone,
    defaultOn: false,
    status: "disconnected",
    meta: "Not configured",
  },
  {
    id: "email",
    name: "Email (SMTP)",
    description: "Deliver invoices and reports from your branded domain.",
    icon: Mail,
    defaultOn: true,
    status: "connected",
    meta: "mail.apexmotors.in",
  },
];

function integrationBadge(status: IntegrationStatus): { variant: RoleBadgeVariant; label: string } {
  switch (status) {
    case "connected":
      return { variant: "success", label: "Connected" };
    case "action_required":
      return { variant: "warning", label: "Action required" };
    default:
      return { variant: "muted", label: "Disconnected" };
  }
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
const NOTIFICATION_PREFS: { id: string; label: string; description: string; defaultOn: boolean }[] = [
  {
    id: "wo_updates",
    label: "Work order updates",
    description: "Status changes, parts arrivals and quality-check completions.",
    defaultOn: true,
  },
  {
    id: "low_stock",
    label: "Low stock alerts",
    description: "Notify when an SKU drops below its reorder point.",
    defaultOn: true,
  },
  {
    id: "po_approvals",
    label: "Purchase order approvals",
    description: "Requests waiting for your sign-off above the approval threshold.",
    defaultOn: true,
  },
  {
    id: "overdue_invoices",
    label: "Overdue invoices",
    description: "Daily digest of receivables past their due date.",
    defaultOn: true,
  },
  {
    id: "ai_actions",
    label: "AI agent actions",
    description: "When an agent acts autonomously or requests human approval.",
    defaultOn: true,
  },
  {
    id: "weekly_digest",
    label: "Weekly performance digest",
    description: "A Monday-morning summary of revenue, CSAT and utilisation.",
    defaultOn: false,
  },
];

// ---------------------------------------------------------------------------
// AI agents
// ---------------------------------------------------------------------------
const AI_AGENTS: {
  id: string;
  name: string;
  domain: string;
  description: string;
  confidence: number;
  defaultAutonomous: boolean;
}[] = [
  {
    id: "aria",
    name: "Aria",
    domain: "Customer & Service",
    description: "Schedules proactive service, runs win-back campaigns and triages customer requests.",
    confidence: 92,
    defaultAutonomous: true,
  },
  {
    id: "vault",
    name: "Vault",
    domain: "Inventory & Procurement",
    description: "Forecasts demand, drafts purchase orders and prevents stock-outs.",
    confidence: 88,
    defaultAutonomous: true,
  },
  {
    id: "cipher",
    name: "Cipher",
    domain: "Finance & Collections",
    description: "Reconciles payments, chases receivables and flags ERP sync gaps.",
    confidence: 85,
    defaultAutonomous: false,
  },
];

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const userName = user?.fullName ?? "—";
  const userEmail = user?.email ?? "";
  const userRole = user?.roles?.[0] ?? "viewer";

  // Profile form
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);

  // Dealership form
  const [dealerName, setDealerName] = useState("Apex Motors — Bandra Kurla");
  const [brand, setBrand] = useState("Multi-brand");
  const [city, setCity] = useState("Mumbai");
  const [region, setRegion] = useState("West");
  const [gstNumber, setGstNumber] = useState("27AAPCA1234M1Z5");
  const [bayCount, setBayCount] = useState("8");

  // Toggles
  const [integrations, setIntegrations] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(INTEGRATIONS.map((i) => [i.id, i.defaultOn])),
  );
  const [notifications, setNotifications] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFICATION_PREFS.map((n) => [n.id, n.defaultOn])),
  );
  const [autonomous, setAutonomous] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(AI_AGENTS.map((a) => [a.id, a.defaultAutonomous])),
  );
  const [approvalThreshold, setApprovalThreshold] = useState("50000");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile, dealership, team, integrations and AI automation."
      />

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="dealership">Dealership</TabsTrigger>
          <TabsTrigger value="team">Team &amp; Roles</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="ai">AI &amp; Automation</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------------- */}
        {/* Profile */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="profile">
          <SectionCard
            title="Profile"
            description="Your personal details and how you appear across Halo."
            action={
              <Button size="sm">
                <Save className="h-4 w-4" /> Save changes
              </Button>
            }
          >
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">{initials(userName)}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-foreground">{userName}</p>
                    <Badge variant={roleVariant(userRole)}>{humanize(userRole)}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                  <Button variant="outline" size="sm" className="mt-1">
                    Change avatar
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full name</Label>
                  <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-role">Role</Label>
                  <Input id="profile-role" value={humanize(userRole)} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-dealership">Dealership</Label>
                  <Input id="profile-dealership" value={dealerName} disabled />
                </div>
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Dealership */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="dealership">
          <SectionCard
            title="Dealership"
            description="Organisation details used on invoices, reports and compliance filings."
            action={
              <Button size="sm">
                <Save className="h-4 w-4" /> Save changes
              </Button>
            }
          >
            <div className="grid max-w-3xl gap-5 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="d-name">Dealership name</Label>
                <Input id="d-name" value={dealerName} onChange={(e) => setDealerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-brand">Brand</Label>
                <Input id="d-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-city">City</Label>
                <Input id="d-city" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-region">Region</Label>
                <Input id="d-region" value={region} onChange={(e) => setRegion(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-gst">GST number</Label>
                <Input id="d-gst" value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="d-bays">Service bays</Label>
                <Input
                  id="d-bays"
                  type="number"
                  value={bayCount}
                  onChange={(e) => setBayCount(e.target.value)}
                />
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Team & Roles */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="team">
          <div className="space-y-6">
            <SectionCard
              title="Team members"
              description={`You are signed in to ${dealerName}.`}
              action={
                <Button size="sm">
                  <UserPlus className="h-4 w-4" /> Invite member
                </Button>
              }
              noPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Member</th>
                      <th className="px-5 py-3 font-medium">Role</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Change role</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{initials(userName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{userName}</p>
                            <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={roleVariant(userRole)}>{humanize(userRole)}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant="success">Active</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Select defaultValue={userRole}>
                          <SelectTrigger className="h-8 w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r}>
                                {humanize(r)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Roles & permissions"
              description="What each role can do across the platform."
              action={
                <Badge variant="info">
                  <ShieldCheck className="h-3.5 w-3.5" /> RBAC
                </Badge>
              }
              noPadding
            >
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-5 py-3 font-medium">Permission</th>
                      {RBAC_ROLES.map((r) => (
                        <th key={r} className="px-3 py-3 text-center font-medium">
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {RBAC_PERMISSIONS.map((row) => (
                      <tr key={row.permission} className="border-b border-border last:border-0">
                        <td className="px-5 py-3 font-medium text-foreground">{row.permission}</td>
                        {RBAC_ROLES.map((r, i) => {
                          const granted = row.grants[i] ?? false;
                          return (
                            <td key={r} className="px-3 py-3 text-center">
                              {granted ? (
                                <Check className="mx-auto h-4 w-4 text-emerald-600" />
                              ) : (
                                <X className="mx-auto h-4 w-4 text-muted-foreground/50" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Integrations */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="integrations">
          <SectionCard
            title="Integrations"
            description="Connect Halo to the systems that run your business."
          >
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {INTEGRATIONS.map((integration) => {
                const Icon = integration.icon;
                const on = integrations[integration.id] ?? false;
                const badge = integrationBadge(integration.status);
                return (
                  <div
                    key={integration.id}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <Switch
                        checked={on}
                        onCheckedChange={(checked) =>
                          setIntegrations((prev) => ({ ...prev, [integration.id]: checked }))
                        }
                        aria-label={`Toggle ${integration.name}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{integration.description}</p>
                    </div>
                    <p className="mt-auto text-xs text-muted-foreground">{integration.meta}</p>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* Notifications */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="notifications">
          <SectionCard
            title="Notifications"
            description="Choose what you want to be notified about."
            action={
              <Button size="sm" variant="outline">
                <Bell className="h-4 w-4" /> Test notification
              </Button>
            }
            noPadding
          >
            <div className="divide-y divide-border">
              {NOTIFICATION_PREFS.map((pref) => (
                <div key={pref.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{pref.label}</p>
                    <p className="text-xs text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch
                    checked={notifications[pref.id] ?? false}
                    onCheckedChange={(checked) =>
                      setNotifications((prev) => ({ ...prev, [pref.id]: checked }))
                    }
                    aria-label={`Toggle ${pref.label}`}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ---------------------------------------------------------------- */}
        {/* AI & Automation */}
        {/* ---------------------------------------------------------------- */}
        <TabsContent value="ai">
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {AI_AGENTS.map((agent) => {
                const on = autonomous[agent.id] ?? false;
                return (
                  <div
                    key={agent.id}
                    className="flex flex-col gap-4 rounded-xl border border-border bg-background p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Bot className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{agent.name}</p>
                          <p className="text-xs text-muted-foreground">{agent.domain}</p>
                        </div>
                      </div>
                      <Badge variant={on ? "success" : "muted"}>{on ? "Autonomous" : "Assisted"}</Badge>
                    </div>

                    <p className="text-xs text-muted-foreground">{agent.description}</p>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confidence threshold</span>
                        <span className="font-medium text-foreground">{agent.confidence}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${agent.confidence}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                      <span className="text-sm font-medium text-foreground">Autonomous mode</span>
                      <Switch
                        checked={on}
                        onCheckedChange={(checked) =>
                          setAutonomous((prev) => ({ ...prev, [agent.id]: checked }))
                        }
                        aria-label={`Toggle autonomous mode for ${agent.name}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <SectionCard
              title="Global guardrails"
              description="Safety limits applied across every agent."
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Require human approval above a value</p>
                  <p className="text-xs text-muted-foreground">
                    Any agent action exceeding this amount must be approved by a human.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    className="w-40"
                    value={approvalThreshold}
                    onChange={(e) => setApprovalThreshold(e.target.value)}
                    aria-label="Human approval threshold"
                  />
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <Button size="sm">
                <Save className="h-4 w-4" /> Save automation settings
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
