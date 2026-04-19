import axiosInstance from "@/api/axios.instance";
import type { ApiResponse } from "@/types";
import type {
  AdminAccount,
  AdminAccountListParams,
  AdminAccountListResponse,
  AdminAccountUpsertPayload,
} from "@/feature/admin-accounts/types/admin-accounts.types";

const ADMIN_ACCOUNT_ENDPOINTS = {
  ACCOUNTS: "/users/accounts",
} as const;

export const adminAccountsApi = {
  async listAccounts(params: AdminAccountListParams) {
    const response = await axiosInstance.get<
      ApiResponse<AdminAccountListResponse>
    >(ADMIN_ACCOUNT_ENDPOINTS.ACCOUNTS, {
      params,
    });

    return response.data.data;
  },

  async getAccount(id: string) {
    const response = await axiosInstance.get<ApiResponse<AdminAccount>>(
      `${ADMIN_ACCOUNT_ENDPOINTS.ACCOUNTS}/${id}`,
    );

    return response.data.data;
  },

  async createAccount(payload: AdminAccountUpsertPayload) {
    const response = await axiosInstance.post<ApiResponse<AdminAccount>>(
      ADMIN_ACCOUNT_ENDPOINTS.ACCOUNTS,
      payload,
    );

    return response.data.data;
  },

  async updateAccount(id: string, payload: AdminAccountUpsertPayload) {
    const response = await axiosInstance.patch<ApiResponse<AdminAccount>>(
      `${ADMIN_ACCOUNT_ENDPOINTS.ACCOUNTS}/${id}/account`,
      payload,
    );

    return response.data.data;
  },
};
