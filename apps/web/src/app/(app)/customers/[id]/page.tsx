"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Car,
  ChevronRight,
  Gauge,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Smartphone,
  Sparkles,
  UserX,
  Wrench,
} from "lucide-react";
import { formatDate, formatMoney, initials } from "@halo/utils";
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Progress,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@halo/ui";
import { SectionCard } from "@/components/shared/section-card";
import { ProgressRing } from "@/components/shared/progress-ring";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Timeline, type TimelineItem } from "@/components/shared/timeline";
import { useCustomer, useCustomerVehicles } from "@/lib/api/queries";

const TIER_VARIANT: Record<string, "warning" | "muted" | "info" | "success"> = {
  bronze: "warning",
  silver: "muted",
  gold: "info",
  platinum: "success",
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const customerQuery = useCustomer(id);
  const { data: customer, isLoading } = customerQuery;
  const { data: vehicles = [] } = useCustomerVehicles(id);

  if (customerQuery.isError) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <ErrorState onRetry={() => customerQuery.refetch()} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <EmptyState
          icon={UserX}
          title="Customer not found"
          description="This customer may have been removed or the link is incorrect."
          action={
            <Button asChild size="sm">
              <Link href="/customers">Back to customers</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const tierVariant = TIER_VARIANT[customer.loyaltyTier] ?? "muted";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => router.back()}>
        <ArrowLeft className="h-4 w-4" /> Back to customers
      </Button>

      {/* Header card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="rounded-xl border border-border bg-card p-6 shadow-card"
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
                {initials(customer.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                  {customer.name}
                </h1>
                <Badge variant={tierVariant} className="capitalize">
                  {customer.loyaltyTier}
                </Badge>
                {customer.whatsappReachable ? (
                  <Badge variant="success">WhatsApp Reachable</Badge>
                ) : (
                  <Badge variant="muted">WhatsApp Opted out</Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> {customer.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {customer.city}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-1 text-sm">
                <span className="text-muted-foreground">
                  Loyalty points{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {customer.loyaltyPoints.toLocaleString()}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Lifetime value{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatMoney(customer.lifetimeValue)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Vehicles{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {customer.vehicleCount}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-1">
            <ProgressRing value={customer.satisfactionScore} size={88} strokeWidth={8} />
            <span className="text-xs font-medium text-muted-foreground">Satisfaction</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          <TabsTrigger value="service">Service History</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SectionCard
              title="Upcoming Maintenance"
              description="Predicted and scheduled service for this customer's vehicles"
            >
              <div className="space-y-3">
                {UPCOMING_MAINTENANCE.map((item) => (
                  <div
                    key={item.title}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Wrench className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.vehicle}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-medium text-foreground">{item.due}</p>
                      <p className="text-xs text-muted-foreground">{item.estimate}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard
              title="AI Recommendations"
              description="Proactive actions suggested by your agents"
            >
              <div className="space-y-3">
                {RECOMMENDATIONS.map((rec, i) => (
                  <motion.div
                    key={rec.title}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </span>
                      <Badge variant="muted" className="text-[10px]">
                        {rec.agent}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{rec.title}</p>
                    <p className="text-xs text-muted-foreground">{rec.body}</p>
                    <div className="mt-1">
                      <Button size="sm" className="h-7 text-xs">
                        {rec.cta}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </SectionCard>
          </div>
        </TabsContent>

        {/* Vehicles */}
        <TabsContent value="vehicles">
          {vehicles.length === 0 ? (
            <EmptyState
              icon={Car}
              title="No vehicles on file"
              description="This customer doesn't have any registered vehicles yet."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {vehicles.map((v) => (
                <Link
                  key={v.id}
                  href={`/vehicles/${v.id}`}
                  className="group flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Car className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {v.make} {v.model}
                        </p>
                        <p className="text-xs text-muted-foreground">{v.variant}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-mono uppercase tracking-wide">{v.registration}</span>
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3.5 w-3.5" />
                      {v.mileageKm.toLocaleString()} km
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Health score</span>
                      <span className="font-medium text-foreground tabular-nums">
                        {Math.round(v.healthScore)}%
                      </span>
                    </div>
                    <Progress value={v.healthScore} className="h-1.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Service History */}
        <TabsContent value="service">
          <SectionCard title="Service History" description="Past visits and completed work orders">
            <Timeline items={SERVICE_HISTORY} />
          </SectionCard>
        </TabsContent>

        {/* Communication */}
        <TabsContent value="communication">
          <SectionCard
            title="Communication Log"
            description="Recent messages across WhatsApp, SMS and email"
          >
            <div className="divide-y divide-border">
              {COMMUNICATIONS.map((msg) => {
                const Icon = CHANNEL_ICON[msg.channel];
                return (
                  <div key={msg.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-foreground">{msg.subject}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">{msg.time}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">{msg.preview}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const UPCOMING_MAINTENANCE = [
  {
    title: "Scheduled service (40,000 km)",
    vehicle: "Hyundai Creta · MH 12 AB 1234",
    due: "Due in 12 days",
    estimate: "Est. ₹8,500",
  },
  {
    title: "Brake pad replacement",
    vehicle: "Hyundai Creta · MH 12 AB 1234",
    due: "Predicted ~ 3 weeks",
    estimate: "Est. ₹4,200",
  },
  {
    title: "Annual warranty inspection",
    vehicle: "Maruti Baleno · MH 14 CD 5678",
    due: "Due next month",
    estimate: "Complimentary",
  },
];

const RECOMMENDATIONS = [
  {
    agent: "Aria",
    title: "Offer a loyalty service bundle",
    body: "This customer is approaching a milestone tier. A bundled service offer could lift retention.",
    cta: "Create offer",
  },
  {
    agent: "Cipher",
    title: "Send a WhatsApp service reminder",
    body: "Upcoming 40,000 km service is due in under two weeks. A proactive reminder boosts booking rates.",
    cta: "Send reminder",
  },
  {
    agent: "Aria",
    title: "Invite to premium care plan",
    body: "Based on lifetime value and visit cadence, this customer is a strong fit for the annual care plan.",
    cta: "Send invite",
  },
];

const SERVICE_HISTORY: TimelineItem[] = [
  {
    id: "svc-1",
    title: "Periodic service (30,000 km)",
    subtitle: "Hyundai Creta · Oil, filters, brake inspection",
    meta: formatDate("2026-03-14", "medium"),
    status: "succeeded",
  },
  {
    id: "svc-2",
    title: "Tyre rotation & wheel alignment",
    subtitle: "Hyundai Creta · 4-wheel alignment",
    meta: formatDate("2025-12-02", "medium"),
    status: "succeeded",
  },
  {
    id: "svc-3",
    title: "AC service & cabin filter",
    subtitle: "Maruti Baleno · Pre-summer check",
    meta: formatDate("2025-09-18", "medium"),
    status: "succeeded",
  },
  {
    id: "svc-4",
    title: "Battery replacement",
    subtitle: "Maruti Baleno · 12V AGM battery",
    meta: formatDate("2025-06-07", "medium"),
    status: "succeeded",
  },
  {
    id: "svc-5",
    title: "Periodic service (20,000 km)",
    subtitle: "Hyundai Creta · Full inspection",
    meta: formatDate("2025-02-21", "medium"),
    status: "succeeded",
  },
];

const CHANNEL_ICON = {
  whatsapp: MessageCircle,
  sms: Smartphone,
  email: Mail,
} as const;

const COMMUNICATIONS: {
  id: string;
  channel: keyof typeof CHANNEL_ICON;
  subject: string;
  preview: string;
  time: string;
}[] = [
  {
    id: "msg-1",
    channel: "whatsapp",
    subject: "Service reminder sent",
    preview: "Your Creta is due for its 40,000 km service. Reply BOOK to schedule.",
    time: "2 days ago",
  },
  {
    id: "msg-2",
    channel: "email",
    subject: "Invoice INV-2041 receipt",
    preview: "Thanks for your visit — your invoice and warranty summary are attached.",
    time: "1 week ago",
  },
  {
    id: "msg-3",
    channel: "sms",
    subject: "Pickup ready notification",
    preview: "Your vehicle is ready for collection at Apex Motors, Andheri.",
    time: "1 week ago",
  },
  {
    id: "msg-4",
    channel: "whatsapp",
    subject: "Feedback request",
    preview: "How was your recent service experience? Tap to rate us out of 5.",
    time: "2 weeks ago",
  },
  {
    id: "msg-5",
    channel: "email",
    subject: "Loyalty points update",
    preview: "You've earned 450 points. You're 200 points from Platinum status.",
    time: "1 month ago",
  },
];
