import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, endpoints } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth.store';
import {
  ApiResponse,
  AuthUser,
  Tenant,
  Branch,
  User,
  Shipment,
  ShipmentStatusHistory,
  CODRecord,
  CODSettlement,
  PricingRule,
  CompanyStats,
  BranchStats,
  MerchantStats,
  CourierStats,
  ShipmentFilters,
  UserFilters,
  CODRecordFilters,
  CODSettlementFilters,
  LoginDto,
  CreateBranchDto,
  CreateUserDto,
  AssignCourierDto,
  UpdateShipmentStatusDto,
  CreateSettlementDto,
  ConfirmPayoutDto,
  CreatePricingRuleDto,
  CalculatePriceDto,
} from '@/types';

// ─────────────────────────────────────────
// Auth Hooks
// ─────────────────────────────────────────

export function useLogin() {
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginDto) => {
      const response = await api.post<ApiResponse<{ accessToken: string; user: AuthUser }>>(
        endpoints.auth.login,
        credentials
      );
      return response.data;
    },
    onSuccess: (data) => {
      login(data.accessToken, data.user);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post(endpoints.auth.logout);
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
}

export function useCurrentUser() {
  const { user, isAuthenticated, setLoading } = useAuthStore();

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AuthUser>>(endpoints.auth.me);
      return response.data;
    },
    enabled: isAuthenticated && !user,
    onSuccess: (data) => {
      useAuthStore.getState().setUser(data);
    },
    onSettled: () => {
      setLoading(false);
    },
  });
}

// ─────────────────────────────────────────
// Branches Hooks
// ─────────────────────────────────────────

export function useBranches(page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['branches', page, limit],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Branch[]>>(
        `${endpoints.branches.list}?page=${page}&limit=${limit}`
      );
      return response;
    },
  });
}

export function useBranch(id: string) {
  return useQuery({
    queryKey: ['branch', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Branch>>(endpoints.branches.get(id));
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBranchDto) => {
      const response = await api.post<ApiResponse<Branch>>(endpoints.branches.create, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

export function useUpdateBranchStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) => {
      const response = await api.patch<ApiResponse<Branch>>(
        endpoints.branches.updateStatus(id),
        { status }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
    },
  });
}

// ─────────────────────────────────────────
// Users Hooks
// ─────────────────────────────────────────

export function useUsers(filters: UserFilters = {}) {
  const params = new URLSearchParams();
  if (filters.role) params.append('role', filters.role);
  if (filters.branchId) params.append('branchId', filters.branchId);
  if (filters.status) params.append('status', filters.status);
  params.append('page', String(filters.page || 1));
  params.append('limit', String(filters.limit || 20));

  return useQuery({
    queryKey: ['users', filters],
    queryFn: async () => {
      const response = await api.get<ApiResponse<User[]>>(
        `${endpoints.users.list}?${params.toString()}`
      );
      return response;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<User>>(endpoints.users.get(id));
      return response.data;
    },
    enabled: !!id,
  });
}

export function useMerchants(page: number = 1, limit: number = 20) {
  return useUsers({ role: 'MERCHANT' as any, page, limit });
}

export function useCouriers(branchId?: string, page: number = 1, limit: number = 50) {
  return useUsers({ role: 'COURIER' as any, branchId, page, limit });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDto) => {
      const response = await api.post<ApiResponse<User>>(endpoints.users.create, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) => {
      const response = await api.patch<ApiResponse<User>>(
        endpoints.users.updateStatus(id),
        { status }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

// ─────────────────────────────────────────
// Shipments Hooks
// ─────────────────────────────────────────

export function useShipments(filters: ShipmentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.merchantId) params.append('merchantId', filters.merchantId);
  if (filters.courierId) params.append('courierId', filters.courierId);
  if (filters.branchId) params.append('branchId', filters.branchId);
  if (filters.city) params.append('city', filters.city);
  if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.append('dateTo', filters.dateTo);
  params.append('page', String(filters.page || 1));
  params.append('limit', String(filters.limit || 20));

  return useQuery({
    queryKey: ['shipments', filters],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Shipment[]>>(
        `${endpoints.shipments.list}?${params.toString()}`
      );
      return response;
    },
  });
}

export function useShipment(id: string) {
  return useQuery({
    queryKey: ['shipment', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Shipment>>(endpoints.shipments.get(id));
      return response.data;
    },
    enabled: !!id,
  });
}

export function useShipmentHistory(id: string) {
  return useQuery({
    queryKey: ['shipment', id, 'history'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ShipmentStatusHistory[]>>(
        endpoints.shipments.history(id)
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useAssignCourier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shipmentId, courierId }: { shipmentId: string; courierId: string }) => {
      const response = await api.patch<ApiResponse<Shipment>>(
        endpoints.shipments.assign(shipmentId),
        { courierId } as AssignCourierDto
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.shipmentId] });
    },
  });
}

export function useUpdateShipmentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shipmentId,
      data,
    }: {
      shipmentId: string;
      data: UpdateShipmentStatusDto;
    }) => {
      const response = await api.patch<ApiResponse<Shipment>>(
        endpoints.shipments.updateStatus(shipmentId),
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.shipmentId] });
      queryClient.invalidateQueries({ queryKey: ['shipment', variables.shipmentId, 'history'] });
    },
  });
}

export function useCancelShipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shipmentId: string) => {
      const response = await api.delete<ApiResponse<Shipment>>(
        endpoints.shipments.cancel(shipmentId)
      );
      return response.data;
    },
    onSuccess: (_, shipmentId) => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['shipment', shipmentId] });
    },
  });
}

// ─────────────────────────────────────────
// COD Hooks
// ─────────────────────────────────────────

export function useCODRecords(filters: CODRecordFilters = {}) {
  const params = new URLSearchParams();
  if (filters.merchantId) params.append('merchantId', filters.merchantId);
  if (filters.status) params.append('status', filters.status);
  params.append('page', String(filters.page || 1));
  params.append('limit', String(filters.limit || 50));

  return useQuery({
    queryKey: ['cod-records', filters],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CODRecord[]>>(
        `${endpoints.cod.records}?${params.toString()}`
      );
      return response;
    },
  });
}

export function useCODBalance(merchantId: string) {
  return useQuery({
    queryKey: ['cod-balance', merchantId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{
        merchantId: string;
        merchantName: string;
        pendingBalance: number;
        settledTotal: number;
        recordCount: number;
      }>>(endpoints.cod.balance(merchantId));
      return response.data;
    },
    enabled: !!merchantId,
  });
}

export function useCODSettlements(filters: CODSettlementFilters = {}) {
  const params = new URLSearchParams();
  if (filters.merchantId) params.append('merchantId', filters.merchantId);
  if (filters.status) params.append('status', filters.status);
  params.append('page', String(filters.page || 1));
  params.append('limit', String(filters.limit || 20));

  return useQuery({
    queryKey: ['cod-settlements', filters],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CODSettlement[]>>(
        `${endpoints.cod.settlements}?${params.toString()}`
      );
      return response;
    },
  });
}

export function useCODSettlement(id: string) {
  return useQuery({
    queryKey: ['cod-settlement', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CODSettlement>>(
        endpoints.cod.settlement(id)
      );
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSettlementDto) => {
      const response = await api.post<ApiResponse<CODSettlement>>(
        endpoints.cod.createSettlement,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cod-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['cod-records'] });
      queryClient.invalidateQueries({ queryKey: ['cod-balance'] });
    },
  });
}

export function useConfirmPayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const response = await api.patch<ApiResponse<CODSettlement>>(
        endpoints.cod.confirmPayout(id),
        { note } as ConfirmPayoutDto
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cod-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['cod-records'] });
      queryClient.invalidateQueries({ queryKey: ['cod-balance'] });
    },
  });
}

// ─────────────────────────────────────────
// Pricing Hooks
// ─────────────────────────────────────────

export function usePricingRules(page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['pricing-rules', page, limit],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PricingRule[]>>(
        `${endpoints.pricing.list}?page=${page}&limit=${limit}`
      );
      return response;
    },
  });
}

export function usePricingRule(id: string) {
  return useQuery({
    queryKey: ['pricing-rule', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<PricingRule>>(endpoints.pricing.get(id));
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePricingRuleDto) => {
      const response = await api.post<ApiResponse<PricingRule>>(
        endpoints.pricing.create,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
}

export function useUpdatePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreatePricingRuleDto> }) => {
      const response = await api.patch<ApiResponse<PricingRule>>(
        endpoints.pricing.update(id),
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
}

export function useDeletePricingRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete<ApiResponse<{ message: string }>>(
        endpoints.pricing.delete(id)
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pricing-rules'] });
    },
  });
}

export function useCalculatePrice() {
  return useMutation({
    mutationFn: async (data: CalculatePriceDto) => {
      const response = await api.post<ApiResponse<{
        price: number | null;
        appliedRule: string | null;
        ruleId: string | null;
        message?: string;
      }>>(endpoints.pricing.calculate, data);
      return response.data;
    },
  });
}

// ─────────────────────────────────────────
// Stats Hooks
// ─────────────────────────────────────────

export function useCompanyStats(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  return useQuery({
    queryKey: ['stats', 'company', dateFrom, dateTo],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CompanyStats>>(
        `${endpoints.stats.company}?${params.toString()}`
      );
      return response.data;
    },
  });
}

export function useBranchStats(branchId?: string, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (branchId) params.append('branchId', branchId);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  return useQuery({
    queryKey: ['stats', 'branch', branchId, dateFrom, dateTo],
    queryFn: async () => {
      const response = await api.get<ApiResponse<BranchStats>>(
        `${endpoints.stats.branch}?${params.toString()}`
      );
      return response.data;
    },
  });
}

export function useMerchantStats(merchantId?: string, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (merchantId) params.append('merchantId', merchantId);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  return useQuery({
    queryKey: ['stats', 'merchant', merchantId, dateFrom, dateTo],
    queryFn: async () => {
      const response = await api.get<ApiResponse<MerchantStats>>(
        `${endpoints.stats.merchant}?${params.toString()}`
      );
      return response.data;
    },
  });
}

export function useCourierStats(courierId: string, dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  params.append('courierId', courierId);
  if (dateFrom) params.append('dateFrom', dateFrom);
  if (dateTo) params.append('dateTo', dateTo);

  return useQuery({
    queryKey: ['stats', 'courier', courierId, dateFrom, dateTo],
    queryFn: async () => {
      const response = await api.get<ApiResponse<CourierStats>>(
        `${endpoints.stats.courier}?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!courierId,
  });
}
