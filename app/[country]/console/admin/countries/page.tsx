'use client';

/** Platform · Countries (KAB-163): CRUD over /api/admin/countries — name, code,
 *  currency, fiscal-receipt system and payment provider. Platform-admin only. */
import React from 'react';
import { Btn, PageHead } from '@/components/console/ui';
import { ListCard } from '@/components/console/ListCard';
import { ConfirmDialog } from '@/components/console/ConfirmDialog';
import { CountryFormModal } from '@/components/console/platformAdmin/CountryFormModal';
import { fmtNumber } from '@/lib/console/dashboard';
import { useCountries, useDeleteCountry, type Country } from '@/lib/console/platformAdmin';

export default function ConsoleAdminCountriesPage() {
  const { data, isPending, isError, refetch } = useCountries();
  const del = useDeleteCountry();
  const [editing, setEditing] = React.useState<{ mode: 'create' | 'edit'; country?: Country } | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState<Country | null>(null);

  return (
    <div className="space-y-6">
      <PageHead
        title="Countries"
        sub="Fiscal-receipt system & payment provider per country"
        actions={<Btn size="sm" variant="primary" icon="plus" onClick={() => setEditing({ mode: 'create' })}>Add country</Btn>}
      />

      <ListCard
        title="Countries"
        totalLabel={data ? `${data.length} total` : undefined}
        isPending={isPending}
        isError={isError}
        isEmpty={!!data && data.length === 0}
        emptyMessage="No countries yet."
        errorMessage="Couldn't load countries."
        onRetry={refetch}
      >
        <table className="kc-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Code</th>
              <th>Currency</th>
              <th>Receipt system</th>
              <th>Payment provider</th>
              <th className="num">Orgs</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.map((c) => (
              <tr key={c.id}>
                <td className="font-medium text-gray-800 dark:text-white/90">{c.name}</td>
                <td className="mono">{c.code}</td>
                <td className="text-gray-500 dark:text-gray-400">{c.currency}</td>
                <td className="text-gray-500 dark:text-gray-400">{c.receiptMethod || '—'}</td>
                <td className="text-gray-500 dark:text-gray-400">{c.paymentMethod || '—'}</td>
                <td className="num mono">{fmtNumber(c._count?.organizations ?? 0)}</td>
                <td>
                  <span className="flex justify-end gap-1.5">
                    <Btn size="xs" variant="ghost" onClick={() => setEditing({ mode: 'edit', country: c })}>Edit</Btn>
                    <Btn size="xs" variant="ghost" icon="trash" onClick={() => setConfirmDelete(c)} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ListCard>

      {editing && (
        <CountryFormModal mode={editing.mode} country={editing.country} onClose={() => setEditing(null)} />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete country?"
          body={<>Deactivating <strong>{confirmDelete.name}</strong> hides it from new configuration.</>}
          confirmLabel="Delete"
          pending={del.isPending}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => del.mutate(confirmDelete.id, { onSettled: () => setConfirmDelete(null) })}
        />
      )}
    </div>
  );
}
