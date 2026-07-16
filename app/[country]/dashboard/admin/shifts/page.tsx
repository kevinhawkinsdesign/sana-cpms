'use client'

import React from 'react'
import { AdminAccessGuard } from '@/components/shared/AdminAccessGuard'
import { ShiftBoard } from '@/components/dashboard/admin/ShiftBoard'

const AdminShiftsPage = () => {
  return (
    <AdminAccessGuard>
      <div className="min-h-screen bg-gray-50">
        <ShiftBoard />
      </div>
    </AdminAccessGuard>
  )
}

export default AdminShiftsPage
