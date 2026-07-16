export interface Organization {
  id: string;
  name: string;
  citrineTenantId?: number | null;
  logo?: string | null;
  defaultOperatorId?: string | null;
  defaultOperator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  countryId?: string | null;
  country?: {
    id: string;
    name: string;
    code: string;
    currency: string;
  } | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    chargers: number;
  };
}

export interface OrganizationDetail extends Organization {
  country?: {
    id: string;
    name: string;
    code: string;
    currency: string;
    receiptMethod?: string | null;
    paymentMethod?: string | null;
  } | null;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
  }>;
  chargers: Array<{
    id: string;
    kabisaId: string;
    name: string;
    address: string;
    operationalStatus: string;
    power: number;
  }>;
}

export interface CreateOrganizationData {
  name: string;
  citrineTenantId?: number | null;
  logo?: string | null;
  defaultOperatorId?: string | null;
  countryId?: string | null;
}

export interface UpdateOrganizationData {
  name?: string;
  citrineTenantId?: number | null;
  logo?: string | null;
  defaultOperatorId?: string | null;
  countryId?: string | null;
}
