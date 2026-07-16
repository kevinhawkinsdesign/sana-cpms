'use client';

import React, { useMemo, useState } from 'react';
import {
  Search,
  MoreHorizontal,
  ChevronDown,
  CreditCard as CardIcon,
  Wallet,
  Calendar,
  MapPin,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Payment = 'Master Card' | 'Visa' | 'Stripe' | 'Paypal' | 'American Express';
type Status = 'completed' | 'failed' | 'in_progress';

interface Session {
  id?: string;
  startDate?: string;
  chargedKW?: number | null;
  stationName?: string;
  status?: Status;
  cost?: number;
  duration?: number;
  paymentType?: Payment;
  paymentMethodName?: string;
  paymentMethodEnum?: 'MOMO' | 'MOMO_CODE_PAYMENT' | 'FREE_ALLOWANCE' | 'CONTRACT' | 'CARD';
  category?: string[];
  location?: string;
  maskedCard?: string;
}

interface Props {
  sessions?: Session[];
  fullPage?: boolean;
  showAll?: boolean;
}

export function RecentSessionsTable({
  sessions = [],
  fullPage = false,
  showAll = false
}: Props) {
  // Ensure sessions is always an array
  const safeSessions = Array.isArray(sessions) ? sessions : [];
  const data = safeSessions;

  // Local state
  const [q, setQ] = useState<string>('');
  const [open, setOpen] = useState<boolean>(false);
  const [active, setActive] = useState<Session | null>(null);

  // Helpers
  const filtered = useMemo(() => {
    if (!q.trim()) return data;
    const t = q.toLowerCase();
    return data.filter(s =>
      (s.stationName || '').toLowerCase().includes(t) ||
      (s.paymentType || '').toLowerCase().includes(t) ||
      (s.location || '').toLowerCase().includes(t)
    );
  }, [q, data]);

  const formatMoney = (n?: number) =>
    typeof n === 'number'
      ? n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
      : '—';

  const formatDate = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const Brand = ({ type }: { type?: Payment }) => {
    const tints: Record<string, string> = {
      'Master Card':'bg-orange-50 ring-orange-100',
      'Visa':'bg-sky-50 ring-sky-100',
      'Stripe':'bg-indigo-50 ring-indigo-100',
      'Paypal':'bg-blue-50 ring-blue-100',
      'American Express':'bg-cyan-50 ring-cyan-100',
    };
    const t = type || 'Stripe';
    return (
      <div className="flex items-center gap-2">
        <div className={cn("h-6 w-6 rounded-md grid place-items-center ring-1", tints[t])}>
          <CardIcon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground">{t}</span>
      </div>
    );
  };

  return (
    <Card className={cn("shadow-sm", fullPage && "border-0 rounded-none")}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transaction</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                className="pl-8 h-9 w-[260px]"
              />
            </div>
            <Button variant="outline" size="sm" className="h-9">
              Filter <ChevronDown className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[34px]"></TableHead>
                <TableHead className="min-w-[220px]">Merchant</TableHead>
                <TableHead className="text-right w-[120px]">Amount</TableHead>
                <TableHead className="w-[220px]">Category</TableHead>
                <TableHead className="w-[220px]">Payment Type</TableHead>
                <TableHead className="w-[150px]">Payment Method</TableHead>
                <TableHead className="w-[150px]">Date</TableHead>
                <TableHead className="w-[90px] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {(showAll ? filtered : filtered.slice(0, 10)).map((s, i) => (
                <TableRow
                  key={s.id ?? i}
                  className="cursor-pointer h-[72px]"
                  onClick={() => { setActive(s); setOpen(true); }}
                >
                  <TableCell>
                    <input
                      aria-label="Select row"
                      type="checkbox"
                      className="h-4 w-4 rounded border-muted-foreground/30"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-md bg-muted grid place-items-center">
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{s.stationName || 'Unknown merchant'}</span>
                        <span className="text-xs text-muted-foreground">{s.location || '—'}</span>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-right font-semibold tabular-nums">
                    {formatMoney(s.cost)}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {(s.category?.length ? s.category : ['EV Charging']).map((c) => (
                        <span
                          key={c}
                          className="rounded-full px-2 py-[2px] text-[11px] leading-5 border bg-muted/40"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Brand type={s.paymentType} />
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {s.paymentMethodName || 'N/A'}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {formatDate(s.startDate)}
                    </div>
                  </TableCell>

                  <TableCell className="text-right">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Edit removed intentionally */}
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center py-8">
                      <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-4">
                        <Calendar className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-semibold mb-2">
                        {data.length === 0 ? 'No charging sessions yet' : 'No sessions found'}
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-sm">
                        {data.length === 0 
                          ? 'Start charging your vehicle to see your session history here.'
                          : 'Try adjusting your search criteria to find sessions.'
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Floating details card */}
      {open && active && (
        <div
          className="fixed inset-0 z-50 grid place-items-center px-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{ backdropFilter: 'blur(2px)' }}
        >
          <div
            className="w-full max-w-[540px] sm:max-w-[640px] rounded-2xl bg-white shadow-2xl border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-4 pb-3 border-b rounded-t-2xl bg-white">
              <div className="flex items-center justify-between">
                <div className="text-[15px] font-medium">Detail Store</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full border bg-white shadow-sm"
                  onClick={() => setOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 pb-6">
              {/* Merchant + amount */}
              <div className="flex items-start justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-emerald-50 ring-1 ring-emerald-100 grid place-items-center">
                    <Wallet className="h-4 w-4 text-emerald-700" />
                  </div>
                  <div>
                    <div className="font-medium">{active.stationName}</div>
                    <div className="text-xs text-muted-foreground">{active.location || '—'}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="text-xl font-semibold tabular-nums">{formatMoney(active.cost)}</div>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Account */}
              <div className="flex items-center justify-between py-4">
                <div className="text-xs text-muted-foreground">Account</div>
                <div className="flex items-center gap-2">
                  <Brand type={active.paymentType} />
                  <span className="text-xs text-muted-foreground">{active.maskedCard || '•••• 2321'}</span>
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Category */}
              <div className="flex items-center justify-between py-4">
                <div className="text-xs text-muted-foreground">Category</div>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {(active.category || ['EV charging', 'Fast charge']).map((c) => (
                    <span
                      key={c}
                      className="rounded-full px-2 py-[2px] text-[11px] leading-5 border bg-muted/40"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Date */}
              <div className="flex items-center justify-between py-4">
                <div className="text-xs text-muted-foreground">Transaction Date</div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDate(active.startDate)}
                </div>
              </div>

              <div className="h-px bg-border" />

              {/* Location */}
              <div className="flex items-center justify-between py-4">
                <div className="text-xs text-muted-foreground">Location</div>
                <div className="flex items-center gap-2 text-sm max-w-[65%] text-right">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{active.location || '—'}</span>
                </div>
              </div>

              {/* Footer action */}
              <Button className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white">
                Download EBM
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
