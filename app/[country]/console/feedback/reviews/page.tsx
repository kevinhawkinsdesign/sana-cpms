'use client';

/** Console Feedback → Reviews. Post-session ratings & comments from drivers —
 *  read-only sentiment (no workflow, unlike Reports). Summary card up top,
 *  filterable list below. Gated behind `view_feedback`. */
import React from 'react';
import { Badge, Card, Icon, Select, TableCard } from '@/components/console/ui';
import { AccessDenied } from '@/components/console/AccessDenied';
import { hasPerm, useOrgs } from '@/lib/console/orgs';
import { useUrlState } from '@/lib/console/useUrlState';
import { useOrgReviews, useOrgReviewsSummary } from '@/lib/console/feedback';

function Stars({ rating, size = 13 }: Readonly<{ rating: number; size?: number }>) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" size={size} style={{ color: n <= rating ? '#f5b400' : 'var(--text3, #9ca3af)', fill: n <= rating ? '#f5b400' : 'none' }} />
      ))}
    </span>
  );
}

const RATING_LABELS: Record<string, string> = { all: 'All ratings', '5': '5 stars', '4': '4 stars', '3': '3 stars', '2': '2 stars', '1': '1 star' };
const RATING_VALUES: Record<string, string> = { 'All ratings': 'all', '5 stars': '5', '4 stars': '4', '3 stars': '3', '2 stars': '2', '1 star': '1' };

export default function ConsoleFeedbackReviewsPage() {
  const { data: orgsData, isPending: orgsPending, isPlaceholderData } = useOrgs();
  const permsResolved = !!orgsData && !orgsPending && !isPlaceholderData;
  const allowed = orgsData?.isPlatformAdmin || hasPerm(orgsData, 'view_feedback');
  const orgId = orgsData?.activeOrgId ?? null;

  const { get, set, setMany } = useUrlState({ rating: 'all', q: '' });
  const rating = get('rating');
  const search = get('q');
  const [searchInput, setSearchInput] = React.useState(search);

  const summary = useOrgReviewsSummary(orgId);
  const { data, isPending } = useOrgReviews(orgId, { rating, search });

  if (permsResolved && !allowed) return <AccessDenied title="Reviews" />;

  const reviews = data?.reviews ?? [];
  const dist = summary.data?.distribution ?? {};
  const maxCount = Math.max(1, ...[5, 4, 3, 2, 1].map((n) => dist[String(n)] ?? 0));

  return (
    <div className="space-y-4 p-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr]">
        <Card title="Average rating">
          {summary.isPending ? (
            <span className="kc-skeleton block h-24" />
          ) : (
            <div className="flex items-center gap-4">
              <div>
                <div className="text-3xl font-semibold text-gray-900 dark:text-white/90">
                  {summary.data?.average != null ? summary.data.average.toFixed(1) : '—'}
                </div>
                {summary.data?.average != null && <Stars rating={Math.round(summary.data.average)} size={15} />}
                <div className="mt-1 text-xs text-gray-400">{summary.data?.count ?? 0} review{summary.data?.count === 1 ? '' : 's'}</div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Distribution">
          {summary.isPending ? (
            <span className="kc-skeleton block h-24" />
          ) : (
            <div className="flex flex-col gap-1.5">
              {[5, 4, 3, 2, 1].map((n) => {
                const count = dist[String(n)] ?? 0;
                return (
                  <div key={n} className="flex items-center gap-2 text-xs">
                    <span className="w-10 shrink-0 text-gray-500 dark:text-gray-400">{n} star</span>
                    <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/5">
                      <div className="h-full rounded-full" style={{ width: `${(count / maxCount) * 100}%`, background: '#f5b400' }} />
                    </div>
                    <span className="mono w-6 shrink-0 text-right text-gray-500 dark:text-gray-400">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <TableCard
        title="Reviews"
        totalLabel={`${reviews.length} shown`}
        searchValue={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={() => setMany({ q: searchInput.trim() })}
        action={
          <Select
            options={Object.keys(RATING_VALUES)}
            value={RATING_LABELS[rating] ?? 'All ratings'}
            onChange={(label) => set('rating', RATING_VALUES[label] ?? 'all')}
            style={{ width: 150 }}
          />
        }
      >
        {isPending ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 4 }, (_, i) => <span key={i} className="kc-skeleton h-14 rounded" />)}
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-400">
            {search || rating !== 'all' ? 'No reviews match this filter.' : 'No reviews yet.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {reviews.map((r) => (
              <div key={r.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating} />
                    <span className="text-sm font-medium text-gray-800 dark:text-white/90">{r.customerName}</span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>
                {r.chargerName && (
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Icon name="station" size={12} /> {r.chargerName}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </TableCard>
    </div>
  );
}
