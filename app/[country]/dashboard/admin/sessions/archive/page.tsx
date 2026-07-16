'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, RotateCcw, Search } from 'lucide-react'
import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { getArchivedSessions, restoreArchivedSession } from '@/lib/api/admin'

const PAGE_SIZE = 20

function fmtDate(value: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

function fmtNumber(n: number | null): string {
  return n == null ? '—' : n.toLocaleString('en-US')
}

function ArchiveBody() {
  const params = useParams<{ country: string }>()
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set())

  // Debounce the search so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['archivedSessions', page, search],
    queryFn: () => getArchivedSessions({ page, limit: PAGE_SIZE, search: search || undefined }),
  })

  const restore = useMutation({
    mutationFn: (archiveId: string) => restoreArchivedSession(archiveId),
    // Track pending ids per-row so concurrent Undos each show their own state.
    onMutate: (archiveId: string) => setRestoringIds((prev) => new Set(prev).add(archiveId)),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['archivedSessions'] })
      queryClient.invalidateQueries({ queryKey: ['allSessions'] })
      queryClient.invalidateQueries({ queryKey: ['adminSessionStats'] })
      toast.success(`Restored ${res.data?.sessionCode ?? 'the session'} back to sessions`)
    },
    onError: (error: any) => toast.error(error.message || 'Failed to restore session'),
    onSettled: (_data, _error, archiveId) => setRestoringIds((prev) => {
      const next = new Set(prev)
      next.delete(archiveId)
      return next
    }),
  })

  const items = data?.data.items ?? []
  const pagination = data?.data.pagination

  return (
    <div className="container mx-auto px-4 py-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/${params?.country}/dashboard/admin/sessions`}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to sessions
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Session Archive</h1>
            <p className="text-sm text-gray-500">Deleted sessions — who deleted them, why, and restore.</p>
          </div>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by session ID or reason…"
            className="pl-8"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session</TableHead>
                  <TableHead>Deleted by</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Deleted at</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Airtable</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500">Loading…</TableCell></TableRow>
                )}
                {isError && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-red-500">
                      Couldn&apos;t load the archive.
                      <Button variant="outline" size="sm" className="ml-3" onClick={() => refetch()}>Retry</Button>
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && !isError && items.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="py-10 text-center text-gray-500">No archived sessions.</TableCell></TableRow>
                )}
                {items.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.sessionCode}</TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900 dark:text-gray-100">{a.deletedBy.name}</div>
                      {a.deletedBy.email && <div className="text-xs text-gray-500">{a.deletedBy.email}</div>}
                    </TableCell>
                    <TableCell className="max-w-xs whitespace-pre-wrap break-words text-sm text-gray-600 dark:text-gray-400">{a.reason}</TableCell>
                    <TableCell className="text-sm text-gray-500">{fmtDate(a.deletedAt)}</TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {fmtNumber(a.session.chargedKwh)} kWh · {fmtNumber(a.session.totalAmount)} RWF
                      {a.session.sessionStatus && <> · {a.session.sessionStatus}</>}
                    </TableCell>
                    <TableCell>
                      {a.airtableDeleted
                        ? <Badge variant="secondary">deleted</Badge>
                        : <Badge variant="outline">{a.airtableDeleteError ? 'failed' : 'n/a'}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restoringIds.has(a.id)}
                        onClick={() => restore.mutate(a.id)}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        {restoringIds.has(a.id) ? 'Restoring…' : 'Undo'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} archived
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SessionArchivePage() {
  return (
    <AdminAccessGuard>
      <ArchiveBody />
    </AdminAccessGuard>
  )
}
