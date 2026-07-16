'use client';

/** Console platform-fleet data layer (KAB-162 + KAB-174). Cross-org admin
 *  fleet reads AND writes, reusing the existing lib/api clients (already
 *  global — see KAB-161). Only rendered inside the platform scope, so callers
 *  are platform admins. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  getAllIndividualVehicles,
  getIndividualVehicle,
  getVehiclesWithDebt,
  createIndividualVehicle,
  updateIndividualVehicle,
  deactivateIndividualVehicle,
  activateIndividualVehicle,
  addKabisaPaymentMethod,
  addMomoPaymentMethod,
  deactivatePaymentMethod,
  addFreeChargingAllowance,
  updateFreeChargingAllowance as updateIndividualFreeCharging,
  deleteFreeChargingAllowance,
  setVehicleDebt,
  addVehicleDebt,
  clearVehicleDebt,
  collectVehicleDebt,
  getVehicleDebtLogs,
  type IndividualVehicle,
  type CreateIndividualVehicleRequest,
  type UpdateIndividualVehicleRequest,
  type AddKabisaPaymentRequest,
  type AddMomoPaymentRequest,
  type AddFreeChargingRequest,
  type VehicleDebtLog,
} from '@/lib/api/adminIndividual';
import {
  getAllChargers,
  getShopVehicles,
  createShopVehicle,
  updateShopVehicle,
  deleteShopVehicle,
  getShopOrders,
  updateShopOrderStatus,
  type Charger,
  type ShopVehicleCreateData,
} from '@/lib/api/admin';
import {
  getAllBusinesses,
  getBusiness,
  createBusiness,
  updateBusiness,
  deactivateBusiness,
  addBusinessContract,
  updateBusinessContract,
  addVehicleToBusiness,
  updateBusinessVehicle,
  unassignVehicleFromBusiness,
  deactivateVehicle,
  getVehiclePaymentMethods as getBusinessVehiclePaymentMethods,
  addKabisaPaymentMethod as addBusinessKabisaPayment,
  deactivatePaymentMethod as deactivateBusinessPayment,
  addFreeChargingAllowance as addBusinessFreeCharging,
  updateFreeChargingAllowance as updateBusinessFreeCharging,
  deleteFreeChargingAllowance as deleteBusinessFreeCharging,
  type Business,
  type UpdateBusinessVehicleRequest,
  type CreateBusinessRequest,
  type UpdateBusinessRequest,
  type AddBusinessContractRequest,
  type AddVehicleRequest,
  type PricingTier,
} from '@/lib/api/adminBusiness';
import { apiErrorMessage } from '@/lib/console/team';
import type { IShopVehicle, ShopOrder } from '@/types/shop';

export type {
  IndividualVehicle,
  Business,
  IShopVehicle,
  ShopOrder,
  ShopVehicleCreateData,
  CreateIndividualVehicleRequest,
  UpdateIndividualVehicleRequest,
  AddKabisaPaymentRequest,
  AddMomoPaymentRequest,
  AddFreeChargingRequest,
  VehicleDebtLog,
  CreateBusinessRequest,
  UpdateBusinessRequest,
  AddBusinessContractRequest,
  AddVehicleRequest,
  PricingTier,
  UpdateBusinessVehicleRequest,
};

/** One mutation shape for the whole fleet module: run `fn`, invalidate the
 *  affected console-fleet queries, toast success/failure (backend message
 *  preserved). Keeps the write hooks below one-liners. */
function useFleetMutation<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  successMessage: string | ((vars: TVars) => string),
  errorFallback: string,
  keys: readonly (readonly string[])[],
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, vars) => {
      for (const key of keys) qc.invalidateQueries({ queryKey: [...key] });
      toast.success(typeof successMessage === 'function' ? successMessage(vars) : successMessage);
    },
    onError: (e) => toast.error(apiErrorMessage(e, errorFallback), { duration: Infinity }),
  });
}

const VEHICLES_KEY = ['console', 'admin', 'individual-vehicles'] as const;
const VEHICLE_KEY = ['console', 'admin', 'individual-vehicle'] as const;
const DEBT_KEY = ['console', 'admin', 'vehicles-with-debt'] as const;
const DEBT_LOGS_KEY = ['console', 'admin', 'vehicle-debt-logs'] as const;
const BUSINESSES_KEY = ['console', 'admin', 'businesses'] as const;
const BUSINESS_KEY = ['console', 'admin', 'business'] as const;
const VEHICLE_SCOPE = [VEHICLES_KEY, VEHICLE_KEY] as const;
const DEBT_SCOPE = [DEBT_KEY, DEBT_LOGS_KEY, VEHICLES_KEY, VEHICLE_KEY] as const;
const BUSINESS_SCOPE = [BUSINESSES_KEY, BUSINESS_KEY] as const;

export function useIndividualVehicles() {
  return useQuery({
    queryKey: ['console', 'admin', 'individual-vehicles'],
    queryFn: async () => (await getAllIndividualVehicles()).data.vehicles,
    staleTime: 30_000,
  });
}

export function useIndividualVehicle(vehicleId: string | null) {
  return useQuery({
    queryKey: ['console', 'admin', 'individual-vehicle', vehicleId],
    queryFn: async () => (await getIndividualVehicle(vehicleId as string)).data.vehicle,
    enabled: !!vehicleId,
    staleTime: 30_000,
  });
}

export function useShopVehicles() {
  return useQuery({
    queryKey: ['console', 'admin', 'shop-vehicles'],
    queryFn: async () => (await getShopVehicles()).data.shopVehicles,
    staleTime: 30_000,
  });
}

export function useChargers() {
  return useQuery<Charger[]>({
    queryKey: ['console', 'admin', 'chargers'],
    queryFn: async () => (await getAllChargers()).data.chargers,
    staleTime: 60_000,
  });
}

export function useBusinesses() {
  return useQuery({
    queryKey: ['console', 'admin', 'businesses'],
    queryFn: async () => (await getAllBusinesses()).data.businesses,
    staleTime: 30_000,
  });
}

export function useBusiness(businessId: string | null) {
  return useQuery({
    queryKey: ['console', 'admin', 'business', businessId],
    queryFn: async () => (await getBusiness(businessId as string)).data.business,
    enabled: !!businessId,
    staleTime: 30_000,
  });
}

export interface VehicleWithDebt {
  id: string;
  make: string;
  model: string;
  debtBalance: number;
  debtNote?: string | null;
  licensePlates?: string[];
}

export interface VehiclesWithDebtData {
  vehicles: VehicleWithDebt[];
  totalDebt: number;
  count: number;
}

export function useVehiclesWithDebt() {
  return useQuery<VehiclesWithDebtData>({
    queryKey: ['console', 'admin', 'vehicles-with-debt'],
    queryFn: async () => (await getVehiclesWithDebt()).data as VehiclesWithDebtData,
    staleTime: 30_000,
  });
}

// ---- Individual vehicles (KAB-174) ----

export function useCreateIndividualVehicle() {
  return useFleetMutation(
    (data: CreateIndividualVehicleRequest) => createIndividualVehicle(data),
    'Vehicle created',
    "Couldn't create the vehicle",
    VEHICLE_SCOPE,
  );
}

export function useUpdateIndividualVehicle() {
  return useFleetMutation(
    ({ id, data }: { id: string; data: UpdateIndividualVehicleRequest }) => updateIndividualVehicle(id, data),
    'Vehicle updated',
    "Couldn't update the vehicle",
    VEHICLE_SCOPE,
  );
}

export function useSetIndividualVehicleActive() {
  return useFleetMutation(
    ({ id, active }: { id: string; active: boolean }) =>
      active ? activateIndividualVehicle(id) : deactivateIndividualVehicle(id),
    (vars) => (vars.active ? 'Vehicle activated' : 'Vehicle deactivated'),
    "Couldn't update the vehicle",
    VEHICLE_SCOPE,
  );
}

export function useAddKabisaPayment() {
  return useFleetMutation(
    ({ vehicleId, data }: { vehicleId: string; data: AddKabisaPaymentRequest }) =>
      addKabisaPaymentMethod(vehicleId, data),
    'Kabisa payment method added',
    "Couldn't add the payment method",
    VEHICLE_SCOPE,
  );
}

export function useAddMomoPayment() {
  return useFleetMutation(
    ({ vehicleId, data }: { vehicleId: string; data: AddMomoPaymentRequest }) =>
      addMomoPaymentMethod(vehicleId, data),
    'MoMo payment method added',
    "Couldn't add the payment method",
    VEHICLE_SCOPE,
  );
}

export function useRemovePaymentMethod() {
  return useFleetMutation(
    ({ vehicleId, paymentMethodId }: { vehicleId: string; paymentMethodId: string }) =>
      deactivatePaymentMethod(vehicleId, paymentMethodId),
    'Payment method removed',
    "Couldn't remove the payment method",
    VEHICLE_SCOPE,
  );
}

export function useAddAllowance() {
  return useFleetMutation(
    ({ vehicleId, data }: { vehicleId: string; data: AddFreeChargingRequest }) =>
      addFreeChargingAllowance(vehicleId, data),
    'Free-charging allowance added',
    "Couldn't add the allowance",
    VEHICLE_SCOPE,
  );
}

export function useUpdateAllowance() {
  return useFleetMutation(
    ({ vehicleId, allowanceId, data }: { vehicleId: string; allowanceId: string; data: AddFreeChargingRequest }) =>
      updateIndividualFreeCharging(vehicleId, allowanceId, data),
    'Allowance updated',
    "Couldn't update the allowance",
    VEHICLE_SCOPE,
  );
}

export function useDeleteAllowance() {
  return useFleetMutation(
    ({ vehicleId, allowanceId }: { vehicleId: string; allowanceId: string }) =>
      deleteFreeChargingAllowance(vehicleId, allowanceId),
    'Allowance removed',
    "Couldn't remove the allowance",
    VEHICLE_SCOPE,
  );
}

// ---- Shop (KAB-175) ----

const SHOP_VEHICLES_KEY = ['console', 'admin', 'shop-vehicles'] as const;
const SHOP_ORDERS_KEY = ['console', 'admin', 'shop-orders'] as const;

export function useShopOrders() {
  return useQuery({
    queryKey: [...SHOP_ORDERS_KEY],
    queryFn: async () => (await getShopOrders()).data.shopOrders,
    staleTime: 30_000,
  });
}

export function useUpdateShopOrderStatus() {
  return useFleetMutation(
    ({ id, status }: { id: string; status: ShopOrder['status'] }) => updateShopOrderStatus(id, status),
    'Order status updated',
    "Couldn't update the order status",
    [SHOP_ORDERS_KEY],
  );
}

export function useCreateShopVehicle() {
  return useFleetMutation(
    (data: ShopVehicleCreateData) => createShopVehicle(data),
    'Shop vehicle created',
    "Couldn't create the shop vehicle",
    [SHOP_VEHICLES_KEY],
  );
}

export function useUpdateShopVehicle() {
  return useFleetMutation(
    ({ id, data }: { id: string; data: Partial<ShopVehicleCreateData> }) => updateShopVehicle(id, data),
    'Shop vehicle updated',
    "Couldn't update the shop vehicle",
    [SHOP_VEHICLES_KEY],
  );
}

export function useDeactivateShopVehicle() {
  return useFleetMutation(
    (id: string) => deleteShopVehicle(id),
    'Shop vehicle deactivated',
    "Couldn't deactivate the shop vehicle",
    [SHOP_VEHICLES_KEY],
  );
}

// ---- Vehicle debt (KAB-174) ----

export function useVehicleDebtLogs(vehicleId: string | null) {
  return useQuery({
    queryKey: [...DEBT_LOGS_KEY, vehicleId],
    queryFn: async () => (await getVehicleDebtLogs(vehicleId as string)).logs,
    enabled: !!vehicleId,
    staleTime: 30_000,
  });
}

export function useSetDebt() {
  return useFleetMutation(
    ({ vehicleId, debtAmount, note }: { vehicleId: string; debtAmount: number; note?: string }) =>
      setVehicleDebt(vehicleId, { debtAmount, note }),
    'Debt balance set',
    "Couldn't set the debt balance",
    DEBT_SCOPE,
  );
}

export function useAddDebt() {
  return useFleetMutation(
    ({ vehicleId, additionalDebt, note }: { vehicleId: string; additionalDebt: number; note?: string }) =>
      addVehicleDebt(vehicleId, { additionalDebt, note }),
    'Debt added',
    "Couldn't add debt",
    DEBT_SCOPE,
  );
}

export function useClearDebt() {
  return useFleetMutation(
    (vehicleId: string) => clearVehicleDebt(vehicleId),
    'Debt cleared',
    "Couldn't clear the debt",
    DEBT_SCOPE,
  );
}

export function useCollectDebt() {
  return useFleetMutation(
    ({ vehicleId, phone }: { vehicleId: string; phone: string }) => collectVehicleDebt(vehicleId, { phone }),
    'Collection request sent',
    "Couldn't start the collection",
    DEBT_SCOPE,
  );
}

// ---- Businesses (KAB-174) ----

export function useCreateBusiness() {
  return useFleetMutation(
    (data: CreateBusinessRequest) => createBusiness(data),
    'Business created',
    "Couldn't create the business",
    BUSINESS_SCOPE,
  );
}

export function useUpdateBusiness() {
  return useFleetMutation(
    ({ id, data }: { id: string; data: UpdateBusinessRequest }) => updateBusiness(id, data),
    'Business updated',
    "Couldn't update the business",
    BUSINESS_SCOPE,
  );
}

export function useDeactivateBusiness() {
  return useFleetMutation(
    (id: string) => deactivateBusiness(id),
    'Business deactivated',
    "Couldn't deactivate the business",
    BUSINESS_SCOPE,
  );
}

export function useSaveBusinessContract() {
  return useFleetMutation(
    ({ businessId, data, exists }: { businessId: string; data: AddBusinessContractRequest; exists: boolean }) =>
      exists ? updateBusinessContract(businessId, data) : addBusinessContract(businessId, data),
    (vars) => (vars.exists ? 'Contract updated' : 'Contract added'),
    "Couldn't save the contract",
    BUSINESS_SCOPE,
  );
}

export function useAddBusinessVehicle() {
  return useFleetMutation(
    ({ businessId, data }: { businessId: string; data: AddVehicleRequest }) =>
      addVehicleToBusiness(businessId, data),
    'Vehicle added to the business',
    "Couldn't add the vehicle",
    [...BUSINESS_SCOPE, ...VEHICLE_SCOPE],
  );
}

export function useUnassignBusinessVehicle() {
  return useFleetMutation(
    ({ businessId, vehicleId }: { businessId: string; vehicleId: string }) =>
      unassignVehicleFromBusiness(businessId, { vehicleId }),
    'Vehicle unassigned',
    "Couldn't unassign the vehicle",
    [...BUSINESS_SCOPE, ...VEHICLE_SCOPE],
  );
}

export function useDeactivateBusinessVehicle() {
  return useFleetMutation(
    ({ businessId, vehicleId }: { businessId: string; vehicleId: string }) =>
      deactivateVehicle(businessId, vehicleId),
    'Vehicle deactivated',
    "Couldn't deactivate the vehicle",
    [...BUSINESS_SCOPE, ...VEHICLE_SCOPE],
  );
}

export function useUpdateBusinessVehicle() {
  return useFleetMutation(
    ({ businessId, vehicleId, data }: { businessId: string; vehicleId: string; data: UpdateBusinessVehicleRequest }) =>
      updateBusinessVehicle(businessId, vehicleId, data),
    'Vehicle updated',
    "Couldn't update the vehicle",
    [...BUSINESS_SCOPE, ...VEHICLE_SCOPE],
  );
}

// ---- Business-scoped per-vehicle payment methods & free charging ----
// Distinct endpoints from the individual-vehicle ones above (/businesses/:id/vehicles/:vid/…).

const BUSINESS_VEHICLE_PAYMENTS_KEY = ['console', 'admin', 'business-vehicle-payments'] as const;

export function useBusinessVehiclePaymentMethods(businessId: string | null, vehicleId: string | null) {
  return useQuery({
    queryKey: [...BUSINESS_VEHICLE_PAYMENTS_KEY, businessId, vehicleId],
    queryFn: async () => (await getBusinessVehiclePaymentMethods(businessId as string, vehicleId as string)).data,
    enabled: !!businessId && !!vehicleId,
    staleTime: 30_000,
  });
}

export function useAddBusinessKabisaPayment() {
  return useFleetMutation(
    ({ businessId, vehicleId, data }: { businessId: string; vehicleId: string; data: AddKabisaPaymentRequest }) =>
      addBusinessKabisaPayment(businessId, vehicleId, data),
    'Kabisa payment method added',
    "Couldn't add the payment method",
    [...BUSINESS_SCOPE, BUSINESS_VEHICLE_PAYMENTS_KEY],
  );
}

export function useRemoveBusinessPayment() {
  return useFleetMutation(
    ({ businessId, vehicleId, paymentMethodId }: { businessId: string; vehicleId: string; paymentMethodId: string }) =>
      deactivateBusinessPayment(businessId, vehicleId, paymentMethodId),
    'Payment method removed',
    "Couldn't remove the payment method",
    [...BUSINESS_SCOPE, BUSINESS_VEHICLE_PAYMENTS_KEY],
  );
}

export function useAddBusinessAllowance() {
  return useFleetMutation(
    ({ businessId, vehicleId, data }: { businessId: string; vehicleId: string; data: AddFreeChargingRequest }) =>
      addBusinessFreeCharging(businessId, vehicleId, data),
    'Free-charging allowance added',
    "Couldn't add the allowance",
    BUSINESS_SCOPE,
  );
}

export function useUpdateBusinessAllowance() {
  return useFleetMutation(
    ({ businessId, vehicleId, allowanceId, data }: { businessId: string; vehicleId: string; allowanceId: string; data: AddFreeChargingRequest }) =>
      updateBusinessFreeCharging(businessId, vehicleId, allowanceId, data),
    'Allowance updated',
    "Couldn't update the allowance",
    BUSINESS_SCOPE,
  );
}

export function useDeleteBusinessAllowance() {
  return useFleetMutation(
    ({ businessId, vehicleId, allowanceId }: { businessId: string; vehicleId: string; allowanceId: string }) =>
      deleteBusinessFreeCharging(businessId, vehicleId, allowanceId),
    'Allowance removed',
    "Couldn't remove the allowance",
    BUSINESS_SCOPE,
  );
}
