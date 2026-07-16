"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/authContext";
import {
  useUserDashboardOverview,
  useUserDashboardSessions,
  useUserDashboardVehicles,
  useUserDashboardPaymentMethods,
} from "@/lib/api/hooks/useUserDashboard";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Plus, X, CreditCard, Trash2 } from "lucide-react";
import { VehiclesSection } from "./Others/VehiclesSection";
import { RecentSessionsTable } from "./Others/RecentSessionsTable";
import { PaymentMethodsSection } from "./Others/PaymentMethodsSection";
import { EntitlementsTable } from "./Others/EntitlementsTable";

/* ------------------------------ helpers ------------------------------ */
const money = (n?: number, cur = "RWF") =>
  typeof n === "number"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: cur,
        maximumFractionDigits: 0,
      }).format(n)
    : "—";

const kwh = (n?: number | null) =>
  typeof n === "number" ? `${n.toFixed(1)}kWh` : "—";

const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

/* ------------------------------ demo data ------------------------------ */
const DEMO = {
  wallet: { balance: 128500, currency: "RWF" },
  cards: [
    { id: "c1", brand: "Visa", last4: "4242" },
    { id: "c2", brand: "Mastercard", last4: "5511" },
    { id: "c3", brand: "Kabisa Wallet", last4: "0000" },
  ],
  vehicles: [
    {
      id: "v1",
      image:
        "https://images.unsplash.com/photo-1606661631334-c6d12a2f3f85?q=80&w=1200&auto=format&fit=crop",
      title: "Tesla Model 3",
      plate: "RAB 123 A",
    },
    {
      id: "v2",
      image:
        "https://images.unsplash.com/photo-1549924231-f129b911e442?q=80&w=1200&auto=format&fit=crop",
      title: "BYD Song Plus",
      plate: "RAC 456 B",
    },
    {
      id: "v3",
      image:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop",
      title: "VW ID.4",
      plate: "RAD 789 C",
    },
  ],
  sessions: [
    { id: "s1", stationName: "Kabisa – Nyutarama 1", soc: 46, energy: 33.5, price: 13500 },
    { id: "s2", stationName: "Kabisa – Nyutarama 2", soc: 33, energy: 50.1, price: 20800 },
    { id: "s3", stationName: "Kabisa – Rugunga", soc: 27, energy: 42.5, price: 17500 },
  ],
};

/* --------------------------- small components --------------------------- */

function VehiclesPanel({
  items,
  loading,
}: {
  items: Array<{ id?: string | number; image?: string; title?: string; plate?: string }>;
  loading?: boolean;
}) {
  const list =
    Array.isArray(items) && items.length > 0 ? items : loading ? [] : DEMO.vehicles;

  return (
    <Card className="rounded-2xl border shadow-sm" role="region" aria-label="Vehicles">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Your vehicles</h2>
        <Button size="sm" variant="outline">Manage</Button>
      </div>
      <div className="px-4 pb-4">
        {loading ? (
          <div className="flex gap-4">
            <Skeleton className="h-[160px] w-[260px]" />
            <Skeleton className="h-[160px] w-[260px]" />
          </div>
        ) : list.length === 0 ? (
          <div className="text-sm text-muted-foreground">No vehicles yet.</div>
        ) : (
          <>
            <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
              {list.map((v) => (
                <div
                  key={v.id}
                  className="min-w-[260px] snap-start rounded-xl overflow-hidden border bg-white shadow-sm"
                >
                  <div
                    className="h-[140px] bg-cover bg-center"
                    style={{ backgroundImage: `url(${v.image})` }}
                    aria-label={v.title}
                  />
                  <div className="p-3">
                    <div className="text-sm font-semibold truncate">{v.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{v.plate}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-1 h-1.5 w-16 rounded-full bg-gray-200" />
          </>
        )}
      </div>
    </Card>
  );
}

function CardsPanel({
  cards,
  loading,
  onSelect,
}: {
  cards: Array<{ id?: string; brand?: string; last4?: string }>;
  loading?: boolean;
  onSelect?: (card: { id?: string; brand?: string; last4?: string }) => void;
}) {
  const list =
    Array.isArray(cards) && cards.length > 0 ? cards : loading ? [] : DEMO.cards;

  return (
    <Card className="rounded-2xl border shadow-sm" role="region" aria-label="Payment methods">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Your cards</h2>
        <Button size="sm" variant="outline" className="transition active:scale-[.99]">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {loading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : list.length === 0 ? (
          <div className="text-sm text-muted-foreground">No saved cards.</div>
        ) : (
          list.map((c) => (
            <button
              key={c.id}
              role="button"
              onClick={() => onSelect?.(c)}
              className="w-full group flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md active:scale-[.99] focus:outline-none focus:ring-2 focus:ring-black/10"
              aria-label={`Manage ${c.brand} ending in ${c.last4}`}
            >
              <div className="h-9 w-44 shrink-0 rounded-md bg-gradient-to-br from-slate-700 to-slate-500" />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900 group-hover:underline truncate">
                  {c.brand}
                </div>
                <div className="text-xs text-muted-foreground">•••• {c.last4}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

function SessionsList({
  rows,
  currency,
  loading,
}: {
  rows: Array<{
    id?: string | number;
    stationName?: string;
    soc?: number | null;
    energy?: number | null;
    price?: number | null;
  }>;
  currency: string;
  loading?: boolean;
}) {
  const list =
    Array.isArray(rows) && rows.length > 0 ? rows : loading ? [] : DEMO.sessions;

  return (
    <Card className="rounded-2xl border shadow-sm" role="region" aria-label="Recent sessions">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Recent sessions</h2>
        <Button size="sm" variant="outline" className="transition active:scale-[.99]">
          View all
        </Button>
      </div>

      <div className="px-2 pb-2">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : list.length === 0 ? (
          <div className="px-4 pb-4 text-sm text-muted-foreground">No sessions yet.</div>
        ) : (
          <ul className="space-y-2">
            {list.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-xl border bg-white px-4 py-3 shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-amber-100 grid place-items-center border shrink-0">
                    <span className="font-bold text-amber-700">K</span>
                  </div>
                  <div className="font-medium text-gray-900 truncate">
                    {r.stationName || "Kabisa Supercharger"}
                  </div>
                </div>

                <div className="hidden sm:block font-semibold tabular-nums">
                  {typeof r.soc === "number" ? `${r.soc}%` : "—"}
                </div>
                <div className="hidden sm:block font-semibold tabular-nums">
                  {kwh(r.energy)}
                </div>
                <div className="font-semibold tabular-nums">
                  {money(r.price ?? undefined, currency)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

/* -------------------------- Slide-over (in-file) -------------------------- */

function ManageCardSlideOver({
  open,
  onClose,
  card,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  card?: { id?: string; brand?: string; last4?: string };
  currency: string;
}) {
  return (
    <>
      {/* backdrop */}
      <div
        aria-hidden={!open}
        className={`fixed inset-0 bg-black/30 transition-opacity ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />
      {/* panel */}
      <aside
        aria-hidden={!open}
        className={`fixed right-0 top-0 h-full w-[360px] bg-white shadow-2xl border-l transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        role="dialog"
        aria-label="Manage card"
      >
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <h3 className="text-sm font-semibold">Manage card</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          {card ? (
            <>
              <div className="rounded-xl border p-3">
                <div className="h-10 w-full rounded-md bg-gradient-to-br from-slate-700 to-slate-500" />
                <div className="mt-2 text-sm font-semibold truncate">{card.brand}</div>
                <div className="text-xs text-muted-foreground">•••• {card.last4}</div>
              </div>

              <div className="space-y-2">
                <Button className="w-full transition active:scale-[.99]">Set as default</Button>
                <Button variant="outline" className="w-full transition active:scale-[.99]">
                  Rename card
                </Button>
                <Button variant="outline" className="w-full transition active:scale-[.99]">
                  View statements
                </Button>
                <Button
                  variant="destructive"
                  className="w-full transition active:scale-[.99] flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" /> Remove card
                </Button>
              </div>

              <div className="text-xs text-muted-foreground">
                All charges are billed in {currency}. Card removal won’t affect settled payments.
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No card selected.</div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ------------------------------- main ------------------------------- */

export default function CustomerDashboard() {
  const { user } = useAuth();

  const { data: overview, isLoading: loadingOverview } = useUserDashboardOverview();
  const { data: vehiclesData, isLoading: loadingVehicles } = useUserDashboardVehicles();
  const { data: sessionsRespRaw, isLoading: loadingSessions } = useUserDashboardSessions(1, 8);
  const { data: paymentMethodsData, isLoading: loadingPM } = useUserDashboardPaymentMethods();

  // normalize inbound data (fallback to demo so it looks complete)
  const vehicles = Array.isArray(vehiclesData) && vehiclesData.length
    ? vehiclesData.map((v: any) => ({
        id: v.id,
        image: v.imageUrl,
        title: v.make ? `${v.make} ${v.model ?? ""}` : "Vehicle",
        plate: v.plateNumber,
      }))
    : DEMO.vehicles;

  const paymentMethods =
    Array.isArray(paymentMethodsData) && paymentMethodsData.length
      ? paymentMethodsData.map((pm: any) => ({
          id: pm.id,
          brand: pm.brand ?? pm.label ?? "Card",
          last4: pm.last4 ?? "0000",
        }))
      : DEMO.cards;

  const sessionsResp =
    sessionsRespRaw && typeof sessionsRespRaw === "object" ? sessionsRespRaw : { sessions: [] };
  const sessionsRaw = Array.isArray((sessionsResp as any).sessions)
    ? (sessionsResp as any).sessions
    : [];
  const sessions = sessionsRaw.length ? sessionsRaw : DEMO.sessions;

  const name =
    (user?.firstName && `Hey, ${user.firstName}`) ||
    (overview?.vehicles?.[0]?.ownerFirstName &&
      `Hey, ${overview.vehicles[0].ownerFirstName}`) ||
    "Hey there";

  const currency = overview?.balance?.currency ?? DEMO.wallet.currency;
  const walletBalance =
    typeof overview?.balance?.balance === "number"
      ? overview.balance.balance
      : DEMO.wallet.balance;

  const sessionRows = useMemo(
    () =>
      sessions.map((s: any) => ({
        id: s.id,
        stationName: s.stationName ?? "Kabisa Supercharger",
        soc: typeof s.soc === "number" ? s.soc : null,
        energy:
          typeof s.chargedKW === "number"
            ? s.chargedKW
            : typeof s.energy === "number"
            ? s.energy
            : null,
        price:
          typeof s.cost === "number" ? s.cost : typeof s.price === "number" ? s.price : null,
      })),
    [sessions]
  );

  // slide-over state
  const [manageOpen, setManageOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ id?: string; brand?: string; last4?: string } | undefined>(undefined);
  const openManage = (c: { id?: string; brand?: string; last4?: string }) => {
    setSelectedCard(c);
    setManageOpen(true);
  };

  return (
    <>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-6">
        {name}
      </h1>

      {/* grid: LEFT wallet/cards (sticky) | RIGHT content */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* LEFT (sticky rail) */}
        <div className="space-y-6 lg:sticky lg:top-4">
          <Card className="rounded-2xl border shadow-sm" role="region" aria-label="Wallet">
            <div className="p-4">
              {loadingOverview ? (
                <>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-40 mb-2" />
                  <Skeleton className="h-4 w-28" />
                  <div className="mt-3 flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xs font-semibold text-gray-700">Kabisa Balance</div>
                  <div className="mt-1 text-3xl font-extrabold tabular-nums">
                    {money(walletBalance, currency)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Available</div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="default" size="sm" className="transition active:scale-[.99]">
                      Add money
                    </Button>
                    <Button variant="outline" size="sm" className="transition active:scale-[.99]">
                      Withdraw
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>

          <CardsPanel
            cards={paymentMethods}
            loading={loadingPM}
            onSelect={openManage}
          />
        </div>

        {/* RIGHT main content */}
        <div className="space-y-6">
          <VehiclesPanel items={vehicles} loading={loadingVehicles} />
          {/* Small recent sessions snippet (the full RecentSessions lives in its own component/page) */}
          <SessionsList rows={sessionRows} currency={currency} loading={loadingSessions} />
        </div>
      </div>

      {/* Slide-over overlay */}
      <ManageCardSlideOver
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        card={selectedCard}
        currency={currency}
      />
    </>
  );
}
