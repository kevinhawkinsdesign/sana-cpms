export interface Country {
  id: string;
  name: string;
  code: string;
  currency: string;
  receiptMethod?: string | null;
  paymentMethod?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { organizations: number };
}

export interface CreateCountryData {
  name: string;
  code: string;
  currency?: string;
  receiptMethod?: string | null;
  paymentMethod?: string | null;
}

export interface UpdateCountryData {
  name?: string;
  code?: string;
  currency?: string;
  receiptMethod?: string | null;
  paymentMethod?: string | null;
}
