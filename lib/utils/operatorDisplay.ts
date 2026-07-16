export interface OperatorInfo {
  name: string
  email: string
}

export interface SessionWithOperator {
  operatorId: string
  operator?: {
    firstName?: string
    lastName?: string
    email?: string
  } | null
}

export function getOperatorDisplay(
  session: SessionWithOperator,
  operatorCache: Record<string, { firstName: string; lastName: string; email: string }>,
  loadingOperators: Set<string>
): OperatorInfo {
  if (session.operator?.firstName && session.operator?.lastName) {
    return {
      name: `${session.operator.firstName} ${session.operator.lastName}`,
      email: session.operator.email || session.operatorId,
    }
  }
  const cached = operatorCache[session.operatorId]
  if (cached) {
    return { name: `${cached.firstName} ${cached.lastName}`, email: cached.email || session.operatorId }
  }
  if (loadingOperators.has(session.operatorId)) {
    return { name: 'Loading...', email: session.operatorId }
  }
  return { name: session.operatorId, email: session.operatorId }
}
