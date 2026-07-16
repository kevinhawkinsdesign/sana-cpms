// Examples of how to use the SessionsTable component in different contexts

import React from 'react'
import SessionsTable from './SessionsTable'
import { Eye, Trash2, User, DollarSign } from 'lucide-react'

// Example 1: Admin Dashboard Usage
export const AdminSessionsExample = ({ sessions, onViewDetails, onDeleteSession }) => {
  return (
    <SessionsTable
      sessions={sessions}
      title="Today's Sessions"
      description="Monitor today's charging sessions and track real-time activity"
      userRole="admin"
      showStats={true}
      onViewDetails={onViewDetails}
      onDeleteSession={onDeleteSession}
      customActions={[
        {
          label: "View All Sessions",
          icon: <Eye className="h-4 w-4" />,
          onClick: () => console.log('Navigate to all sessions'),
          variant: 'default'
        }
      ]}
    />
  )
}

// Example 2: Operator Dashboard Usage
export const OperatorSessionsExample = ({ sessions, onViewDetails, onTransferSession, onPaymentSession }) => {
  return (
    <SessionsTable
      sessions={sessions}
      title="My Sessions"
      description="Manage your assigned charging sessions"
      userRole="operator"
      showStats={true}
      onViewDetails={onViewDetails}
      onTransferSession={onTransferSession}
      onPaymentSession={onPaymentSession}
      customActions={[
        {
          label: "Transfer Session",
          icon: <User className="h-4 w-4" />,
          onClick: (session) => console.log('Transfer session:', session),
          variant: 'default'
        }
      ]}
    />
  )
}

// Example 3: Customer Dashboard Usage
export const CustomerSessionsExample = ({ sessions, onViewDetails }) => {
  return (
    <SessionsTable
      sessions={sessions}
      title="My Charging History"
      description="View your charging session history and detailed information"
      userRole="customer"
      showStats={false}
      onViewDetails={onViewDetails}
      customActions={[
        {
          label: "Download Receipt",
          icon: <DollarSign className="h-4 w-4" />,
          onClick: (session) => console.log('Download receipt for:', session),
          variant: 'default'
        }
      ]}
    />
  )
}

// Example 4: Minimal Usage (No Actions)
export const MinimalSessionsExample = ({ sessions }) => {
  return (
    <SessionsTable
      sessions={sessions}
      title="Recent Sessions"
      showActions={false}
      showSearch={false}
      showFilter={false}
      maxHeight="300px"
    />
  )
}

// Example 5: Custom Configuration
export const CustomSessionsExample = ({ sessions, onCustomAction }) => {
  return (
    <SessionsTable
      sessions={sessions}
      title="Custom Sessions View"
      description="A custom configured sessions table"
      userRole="admin"
      showStats={true}
      showSearch={true}
      showFilter={true}
      showActions={true}
      maxHeight="500px"
      emptyMessage="No custom sessions found"
      searchPlaceholder="Search custom sessions..."
      customActions={[
        {
          label: "Custom Action 1",
          icon: <Eye className="h-4 w-4" />,
          onClick: onCustomAction,
          variant: 'default'
        },
        {
          label: "Custom Action 2",
          icon: <Trash2 className="h-4 w-4" />,
          onClick: (session) => console.log('Custom action 2:', session),
          variant: 'destructive'
        }
      ]}
      className="border-2 border-blue-200"
    />
  )
}

// Example 6: Loading State
export const LoadingSessionsExample = () => {
  return (
    <SessionsTable
      sessions={[]}
      isLoading={true}
      title="Loading Sessions"
      description="Please wait while we load your sessions..."
    />
  )
}

// Example 7: Empty State
export const EmptySessionsExample = () => {
  return (
    <SessionsTable
      sessions={[]}
      title="No Sessions"
      description="No sessions found for the selected criteria"
      emptyMessage="No sessions available at this time"
    />
  )
}

