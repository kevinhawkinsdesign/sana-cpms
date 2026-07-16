# SessionsTable Component

A comprehensive, reusable table component for displaying charging sessions across different user roles (admin, operator, customer) in the KABISA dashboard.

## Features

- **Role-based Display**: Automatically shows/hides columns based on user role
- **Search & Filter**: Built-in search and status filtering
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Custom Actions**: Support for custom action buttons
- **Loading States**: Built-in loading skeleton
- **Empty States**: Customizable empty state messages
- **Session Details Modal**: Built-in modal for viewing session details
- **TypeScript Support**: Fully typed with generic support

## Basic Usage

```tsx
import SessionsTable from '@/components/shared/tables/SessionsTable'

function MyComponent() {
  const sessions = [
    {
      id: '1',
      sessionId: 'RAI928M-20250921104424',
      startTime: '2025-09-21T12:44:24Z',
      endTime: '2025-09-21T13:31:24Z',
      sessionStatus: 'COMPLETED',
      chargedKwh: 23.15,
      totalAmount: 9260,
      vehicle: {
        make: 'Haval',
        model: 'Raptor Hi 4',
        kabisaId: 'R35CGG46'
      },
      operator: {
        firstName: 'Rukimirana',
        lastName: 'tresor',
        email: 'rutresor0002@gmail.com'
      },
      charger: {
        name: 'SP Kanombe',
        kabisaId: '38V0XG0G'
      }
    }
  ]

  return (
    <SessionsTable
      sessions={sessions}
      title="My Sessions"
      userRole="admin"
      onViewDetails={(session) => console.log('View:', session)}
      onDeleteSession={(session) => console.log('Delete:', session)}
    />
  )
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `sessions` | `T[]` | `[]` | Array of session objects |
| `isLoading` | `boolean` | `false` | Show loading skeleton |
| `title` | `string` | `"Sessions"` | Table title |
| `description` | `string` | `undefined` | Table description |
| `showSearch` | `boolean` | `true` | Show search input |
| `showFilter` | `boolean` | `true` | Show status filter |
| `showActions` | `boolean` | `true` | Show actions column |
| `showStats` | `boolean` | `false` | Show statistics in header |
| `maxHeight` | `string` | `"400px"` | Maximum table height |
| `userRole` | `'admin' \| 'operator' \| 'customer'` | `'admin'` | User role for column visibility |
| `onViewDetails` | `(session: T) => void` | `undefined` | View details callback |
| `onDeleteSession` | `(session: T) => void` | `undefined` | Delete session callback |
| `onTransferSession` | `(session: T) => void` | `undefined` | Transfer session callback |
| `onPaymentSession` | `(session: T) => void` | `undefined` | Payment session callback |
| `customActions` | `Array<CustomAction>` | `[]` | Custom action buttons |
| `emptyMessage` | `string` | `"No sessions found"` | Empty state message |
| `searchPlaceholder` | `string` | `"Search by session ID..."` | Search input placeholder |
| `className` | `string` | `""` | Additional CSS classes |

## User Roles

### Admin Role
Shows all columns: Session, Vehicle, Operator, Charger, Duration, Status, Amount, Actions
- Full access to all session data
- Can delete sessions
- Can view all session details

### Operator Role
Shows: Session, Vehicle, Charger, Duration, Status, Amount, Actions
- Focus on operational data
- Can transfer sessions
- Can handle payments

### Customer Role
Shows: Session, Vehicle, Station, Duration, Status, Amount, Actions
- Customer-focused view
- Station information instead of charger details
- Limited actions

## Custom Actions

```tsx
const customActions = [
  {
    label: "View All Sessions",
    icon: <Eye className="h-4 w-4" />,
    onClick: (session) => console.log('View all:', session),
    variant: 'default'
  },
  {
    label: "Delete Session",
    icon: <Trash2 className="h-4 w-4" />,
    onClick: (session) => console.log('Delete:', session),
    variant: 'destructive'
  }
]

<SessionsTable
  sessions={sessions}
  customActions={customActions}
/>
```

## Session Data Structure

The component expects session objects that extend the `BaseSession` interface:

```tsx
interface BaseSession {
  id: string
  sessionId?: string
  startTime: string
  endTime?: string | null
  sessionStatus: 'STARTED' | 'COMPLETED' | 'CANCELLED' | 'completed' | 'failed' | 'in_progress'
  chargedKwh?: number | null
  totalAmount?: number | null
  startSoc?: number
  endSoc?: number | null
  createdAt?: string
  vehicle?: {
    make?: string
    model?: string
    kabisaId?: string
  }
  operator?: {
    firstName?: string
    lastName?: string
    email?: string
  }
  charger?: {
    name?: string
    kabisaId?: string
    location?: string
  }
  // Additional fields for different contexts
  stationName?: string
  location?: string
  paymentType?: string
  duration?: number
  cost?: number
  maskedCard?: string
  category?: string[]
}
```

## Examples

### Admin Dashboard
```tsx
<SessionsTable
  sessions={todaySessions}
  title="Today's Sessions"
  description="Monitor today's charging sessions and track real-time activity"
  userRole="admin"
  showStats={true}
  onViewDetails={handleViewDetails}
  onDeleteSession={handleDeleteSession}
/>
```

### Operator Dashboard
```tsx
<SessionsTable
  sessions={mySessions}
  title="My Sessions"
  userRole="operator"
  onTransferSession={handleTransfer}
  onPaymentSession={handlePayment}
/>
```

### Customer Dashboard
```tsx
<SessionsTable
  sessions={mySessions}
  title="My Charging History"
  userRole="customer"
  showStats={false}
/>
```

### Minimal Usage
```tsx
<SessionsTable
  sessions={sessions}
  showActions={false}
  showSearch={false}
  showFilter={false}
/>
```

## Migration from Existing Tables

To migrate from existing table implementations:

1. **Replace the table JSX** with the SessionsTable component
2. **Map your data** to the BaseSession interface
3. **Configure props** based on your use case
4. **Remove duplicate code** (search, filter, modal logic)
5. **Test the functionality** with your data

## Benefits

- **Reduced Code Duplication**: One component for all session tables
- **Consistent UI**: Same look and feel across all dashboards
- **Maintainability**: Changes in one place affect all tables
- **Type Safety**: Full TypeScript support
- **Responsive**: Works on all screen sizes
- **Accessible**: Built with accessibility in mind

