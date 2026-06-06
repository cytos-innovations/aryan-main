import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Building04Icon,
  UserStar01Icon,
  ArrowRight01Icon,
  TableIcon,
  Calendar01Icon,
  ReceiptIndianRupeeIcon,
  ChefHatIcon,
  CashIcon,
  ShoppingBag01Icon,
} from "@hugeicons/core-free-icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { useAuth, Can } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";

// ── Constants ────────────────────────────────────────────────────
const FOOD_COLOR     = "#f59e0b"; // amber-500
const BEV_COLOR      = "#8b5cf6"; // violet-500
const AVAIL_COLOR    = "#22c55e"; // green-500
const OCCUP_COLOR    = "#f59e0b"; // amber-500
const BILL_COLOR     = "#8b5cf6"; // violet-500
const RES_COLOR      = "#3b82f6"; // blue-500

const HOURLY_CONFIG = {
  food:    { label: "Food",     color: FOOD_COLOR },
  beverage:{ label: "Beverage", color: BEV_COLOR  },
};

const TABLE_CONFIG = {
  available:    { label: "Available", color: AVAIL_COLOR },
  occupied:     { label: "Occupied",  color: OCCUP_COLOR },
  bill_printed: { label: "Bill Out",  color: BILL_COLOR  },
  reserved:     { label: "Reserved",  color: RES_COLOR   },
};

// ── Helpers ──────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}
function fmtK(n) {
  if (n == null) return "—";
  if (n >= 100_000) return `${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}
function fmtInt(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN").format(n);
}
function hourLabel(h) {
  if (h === 0)  return "12 AM";
  if (h < 12)   return `${h} AM`;
  if (h === 12) return "12 PM";
  return `${h - 12} PM`;
}

// Build a full 6 AM → 11 PM hourly array merged with real data
function buildHourlyData(rawHours) {
  const map = {};
  (rawHours ?? []).forEach(r => { map[r.hour] = r; });
  return Array.from({ length: 18 }, (_, i) => {
    const h = i + 6;
    const d = map[h];
    return { hour: h, label: hourLabel(h), food: d?.food_sales ?? 0, beverage: d?.bev_sales ?? 0 };
  });
}

// ── KPI card ──────────────────────────────────────────────────────
function KpiCard({ title, value, prefix, icon, accentClass, sub, loading }) {
  return (
    <Card className="overflow-hidden">
      <div className={`h-1 ${accentClass}`} />
      <CardContent className="pt-4 pb-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-28 mt-1" />
            ) : (
              <p className="text-xl font-bold tracking-tight">
                {prefix && <span className="text-sm font-semibold text-muted-foreground mr-0.5">{prefix}</span>}
                {value}
              </p>
            )}
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
            <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4 text-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Custom tooltip for hourly chart ──────────────────────────────
function HourlyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const total = (payload[0]?.value ?? 0) + (payload[1]?.value ?? 0);
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl space-y-1">
      <p className="font-semibold">{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium ml-auto pl-2">₹{fmtK(p.value)}</span>
        </div>
      ))}
      <div className="border-t pt-1 flex items-center gap-2 font-semibold">
        <span className="text-muted-foreground flex-1">Total:</span>
        <span>₹{fmtK(total)}</span>
      </div>
    </div>
  );
}

// ── Custom tooltip for table occupancy ───────────────────────────
function OccupancyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl space-y-1">
      <p className="font-semibold">{label || "Ungrouped"}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{TABLE_CONFIG[p.dataKey]?.label ?? p.name}:</span>
          <span className="font-medium ml-auto pl-2">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ── Custom tooltip for donut ──────────────────────────────────────
function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.payload.fill }} />
        <span className="text-muted-foreground">{p.name}:</span>
        <span className="font-semibold ml-1">₹{fmt(p.value)}</span>
      </div>
      <p className="text-muted-foreground mt-0.5">{p.payload.pct}% of total</p>
    </div>
  );
}

// ── Chart skeleton ───────────────────────────────────────────────
function ChartSkeleton({ h = "h-52" }) {
  return (
    <div className={`${h} flex items-end gap-2 px-4 pb-4`}>
      {[60, 40, 75, 55, 90, 45, 80, 35, 65, 50, 85, 70].map((pct, i) => (
        <Skeleton
          key={i}
          className="flex-1 rounded-sm"
          style={{ height: `${pct}%` }}
        />
      ))}
    </div>
  );
}

// ── Quick-action card ─────────────────────────────────────────────
function QuickAction({ title, description, icon, to }) {
  const navigate = useNavigate();
  return (
    <Card className="cursor-pointer transition-all hover:shadow-md" onClick={() => navigate(to)}>
      <CardContent className="flex items-center gap-4 pt-5 pb-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5 text-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4 text-muted-foreground shrink-0" />
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const { auth } = useAuth();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  const todayLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const adminQuery = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => invoke("get_dashboard_stats"),
    staleTime: 30_000,
  });

  const restQuery = useQuery({
    queryKey: ["restaurant-dashboard"],
    queryFn: () => invoke("get_restaurant_dashboard"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const adminStats = adminQuery.data;
  const restData   = restQuery.data;
  const adminLoad  = adminQuery.isLoading;
  const restLoad   = restQuery.isLoading;

  const sales       = restData?.sales_today;
  const tableGroups = restData?.table_groups ?? [];
  const hourlyData  = buildHourlyData(restData?.hourly_sales);

  // Pie data for food vs beverage split
  const foodAmt = sales?.food_sales ?? 0;
  const bevAmt  = sales?.beverage_sales ?? 0;
  const totalForPct = foodAmt + bevAmt || 1;
  const pieData = [
    { name: "Food",     value: foodAmt, fill: FOOD_COLOR, pct: Math.round((foodAmt / totalForPct) * 100) },
    { name: "Beverage", value: bevAmt,  fill: BEV_COLOR,  pct: Math.round((bevAmt  / totalForPct) * 100) },
  ];

  // Table occupancy chart data — trim group_name for display
  const tableChartData = tableGroups.map(g => ({
    name:         g.group_name ?? "Ungrouped",
    available:    Number(g.available),
    occupied:     Number(g.occupied),
    bill_printed: Number(g.bill_printed),
    reserved:     Number(g.reserved),
  }));

  const totalTables    = tableGroups.reduce((s, g) => s + Number(g.total), 0);
  const occupiedTables = tableGroups.reduce((s, g) => s + Number(g.occupied) + Number(g.bill_printed) + Number(g.reserved), 0);

  return (
    <div className="p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting}, {auth?.user?.username}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {auth?.application?.application_name ?? "Restaurant"} · Dashboard
          </p>
        </div>
        <p className="text-sm text-muted-foreground sm:text-right shrink-0 mt-0.5">{todayLabel}</p>
      </div>

      <Separator />

      {/* ── KPI Row ── */}
      <Can perm="billing:view">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="T S "
            value={restLoad ? null : fmt(sales?.total_sales)}
            prefix="₹"
            icon={ReceiptIndianRupeeIcon}
            accentClass="bg-primary"
            sub="Net revenue today"
            loading={restLoad}
          />
          <KpiCard
            title="Food Sales"
            value={restLoad ? null : fmt(sales?.food_sales)}
            prefix="₹"
            icon={ChefHatIcon}
            accentClass="bg-amber-500"
            sub="Food items"
            loading={restLoad}
          />
          <KpiCard
            title="Beverage Sales"
            value={restLoad ? null : fmt(sales?.beverage_sales)}
            prefix="₹"
            icon={CashIcon}
            accentClass="bg-violet-500"
            sub="Drinks & beverages"
            loading={restLoad}
          />
          <KpiCard
            title="Bills Settled"
            value={restLoad ? null : fmtInt(sales?.total_bills ?? 0)}
            icon={ShoppingBag01Icon}
            accentClass="bg-emerald-500"
            sub="Closed today"
            loading={restLoad}
          />
        </div>
      </Can>

      {/* ── Hourly Revenue Chart ── */}
      <Can perm="billing:view">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Hourly Revenue — Today</CardTitle>
            <CardDescription className="text-xs">Food and beverage sales by hour</CardDescription>
          </CardHeader>
          <CardContent>
            {restLoad ? (
              <ChartSkeleton h="h-52" />
            ) : (
              <ChartContainer config={HOURLY_CONFIG} className="h-52 w-full">
                <BarChart data={hourlyData} barSize={14} barGap={2}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={1}
                  />
                  <YAxis
                    tickFormatter={fmtK}
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip content={<HourlyTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                  <Bar dataKey="food"     stackId="s" fill={FOOD_COLOR} radius={[0, 0, 0, 0]} name="Food" />
                  <Bar dataKey="beverage" stackId="s" fill={BEV_COLOR}  radius={[3, 3, 0, 0]} name="Beverage" />
                </BarChart>
              </ChartContainer>
            )}
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-sm inline-block" style={{ background: FOOD_COLOR }} />
                Food
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-sm inline-block" style={{ background: BEV_COLOR }} />
                Beverage
              </div>
            </div>
          </CardContent>
        </Card>
      </Can>

      {/* ── Sales Split + Table Occupancy ── */}
      <Can perm="billing:view">
        <div className="grid gap-4 lg:grid-cols-2">

          {/* Donut — food vs beverage */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Sales Split</CardTitle>
              <CardDescription className="text-xs">Food vs beverage breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {restLoad ? (
                <div className="h-52 flex items-center justify-center">
                  <Skeleton className="h-36 w-36 rounded-full" />
                </div>
              ) : (
                <>
                  <div className="h-52 relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={88}
                          paddingAngle={3}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<DonutTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">₹{fmtK(sales?.total_sales ?? 0)}</p>
                    </div>
                  </div>
                  <div className="flex justify-center gap-6 mt-2">
                    {pieData.map(d => (
                      <div key={d.name} className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: d.fill }} />
                          <span className="text-xs text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="text-sm font-semibold">₹{fmtK(d.value)}</span>
                        <span className="text-xs text-muted-foreground">{d.pct}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stacked bar — table occupancy by section */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Table Occupancy</CardTitle>
                  <CardDescription className="text-xs">By section — {occupiedTables}/{totalTables} occupied</CardDescription>
                </div>
                {!restLoad && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    {tableGroups.length} section{tableGroups.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {restLoad ? (
                <ChartSkeleton h="h-52" />
              ) : tableGroups.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-muted-foreground">
                  No tables configured yet.
                </div>
              ) : (
                <>
                  <ChartContainer config={TABLE_CONFIG} className="h-52 w-full">
                    <BarChart data={tableChartData} barSize={22} layout="vertical">
                      <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border/40" />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        width={72}
                        tickFormatter={v => v.length > 10 ? v.slice(0, 10) + "…" : v}
                      />
                      <Tooltip content={<OccupancyTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                      <Bar dataKey="available"    stackId="t" fill={AVAIL_COLOR} name="Available"  radius={[0, 0, 0, 0]} />
                      <Bar dataKey="occupied"     stackId="t" fill={OCCUP_COLOR} name="Occupied"   radius={[0, 0, 0, 0]} />
                      <Bar dataKey="bill_printed" stackId="t" fill={BILL_COLOR}  name="Bill Out"   radius={[0, 0, 0, 0]} />
                      <Bar dataKey="reserved"     stackId="t" fill={RES_COLOR}   name="Reserved"   radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ChartContainer>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
                    {[
                      { color: AVAIL_COLOR, label: "Available" },
                      { color: OCCUP_COLOR, label: "Occupied"  },
                      { color: BILL_COLOR,  label: "Bill Out"  },
                      { color: RES_COLOR,   label: "Reserved"  },
                    ].map(d => (
                      <div key={d.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="h-2 w-2 rounded-sm inline-block" style={{ background: d.color }} />
                        {d.label}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>
      </Can>

      <Separator />

      {/* ── Live Activity counters ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Can perm="billing:view">
          <Card>
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Sessions</p>
                  {restLoad ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold mt-0.5">{fmtInt(restData?.active_sessions ?? 0)}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Open + KOT + Bill out</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={TableIcon} strokeWidth={2} className="size-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Can>
        <Can perm="billing:view">
          <Card>
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Today's Reservations</p>
                  {restLoad ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold mt-0.5">{fmtInt(restData?.todays_reservations ?? 0)}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Pending & arrived</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Can>
        <Can perm="users:view">
          <Card>
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Active Users</p>
                  {adminLoad ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold mt-0.5">{fmtInt(adminStats?.users)}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Users with access</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Can>
        <Can perm="user-access:view">
          <Card>
            <CardContent className="pt-4 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Applications</p>
                  {adminLoad ? <Skeleton className="h-8 w-12 mt-1" /> : (
                    <p className="text-3xl font-bold mt-0.5">{fmtInt(adminStats?.applications)}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">Registered</p>
                </div>
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <HugeiconsIcon icon={Building04Icon} strokeWidth={2} className="size-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Can>
      </div>

      <Separator />

      {/* ── Quick Actions ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Quick Actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Can perm="billing:view">
            <QuickAction
              title="Billing"
              description="Open tables and manage orders"
              icon={ShoppingBag01Icon}
              to="/transaction/billing"
            />
          </Can>
          <Can perm="billing:view">
            <QuickAction
              title="Reservations"
              description="View and manage table reservations"
              icon={Calendar01Icon}
              to="/transaction/billing"
            />
          </Can>
          <Can perm="users:view">
            <QuickAction
              title="Manage Users"
              description="Create and manage user accounts"
              icon={UserGroupIcon}
              to="/admin/users"
            />
          </Can>
          <Can perm="user-access:view">
            <QuickAction
              title="User Access"
              description="Assign permissions to users"
              icon={UserStar01Icon}
              to="/admin/user-access"
            />
          </Can>
        </div>
      </section>

    </div>
  );
}
