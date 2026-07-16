'use client'

import { useState } from 'react'
import { useTransactions } from '@/lib/api/hooks/usePayments'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { UserSelect } from '@/components/shared/UserSelect'
import { Button } from '@/components/ui/button'

export function Transactions() {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  const { data: transactionData } = useTransactions(selectedUserId || '', currentPage, limit)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  return (
    <div className="space-y-4">
      <div className="w-96">
        <UserSelect
          onUserSelect={(userId) => {
            setSelectedUserId(userId)
            setCurrentPage(1) // Reset to first page when user changes
          }}
          userType="CUSTOMER"
          placeholder="Select customer..."
        />
      </div>

      {selectedUserId && transactionData && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionData.transactions.map((transaction: { id: string, timestamp: string }) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {new Date(transaction.timestamp).toLocaleString()}
                  </TableCell>
                  <TableCell>{(transaction as any).description}</TableCell>
                  <TableCell className={`text-right font-medium ${
                    (transaction as any).amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {(transaction as any).amount.toLocaleString()} {(transaction as any).currency}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {transactionData.pagination.total > limit && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <PaginationPrevious />
                  </Button>
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, Math.ceil(transactionData.pagination.total / limit)) }).map((_, i) => (
                  <PaginationItem key={i}>
                    <PaginationLink
                      onClick={() => handlePageChange(i + 1)}
                      isActive={currentPage === i + 1}
                    >
                      {i + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                {Math.ceil(transactionData.pagination.total / limit) > 5 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => handlePageChange(Math.ceil(transactionData.pagination.total / limit))}
                        isActive={currentPage === Math.ceil(transactionData.pagination.total / limit)}
                      >
                        {Math.ceil(transactionData.pagination.total / limit)}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}

                <PaginationItem>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(transactionData.pagination.total / limit)}
                  >
                    <PaginationNext />
                  </Button>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  )
} 