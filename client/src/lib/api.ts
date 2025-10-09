import { apiRequest } from "./queryClient";

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiRequest("POST", "/api/auth/login", { email, password }),
    signup: (data: { email: string; password: string; fullName: string; companyName: string }) =>
      apiRequest("POST", "/api/auth/signup", data),
    me: () => apiRequest("GET", "/api/me"),
  },
  contacts: {
    list: () => apiRequest("GET", "/api/contacts"),
    create: (data: any) => apiRequest("POST", "/api/contacts", data),
  },
  properties: {
    list: () => apiRequest("GET", "/api/properties"),
    create: (data: any) => apiRequest("POST", "/api/properties", data),
  },
  contracts: {
    list: () => apiRequest("GET", "/api/contracts"),
    create: (data: any) => apiRequest("POST", "/api/contracts", data),
    activate: (id: string) => apiRequest("POST", `/api/contracts/${id}/activate`),
  },
  invoices: {
    list: () => apiRequest("GET", "/api/invoices"),
    get: (id: string) => apiRequest("GET", `/api/invoices/${id}`),
    remind: (id: string) => apiRequest("POST", `/api/invoices/${id}/remind`),
    recalc: (id: string) => apiRequest("POST", `/api/invoices/${id}/recalc`),
  },
  payments: {
    list: () => apiRequest("GET", "/api/payments"),
    create: (data: any) => apiRequest("POST", "/api/payments", data),
  },
  insurers: {
    list: () => apiRequest("GET", "/api/insurers"),
    create: (data: any) => apiRequest("POST", "/api/insurers", data),
  },
  policies: {
    list: () => apiRequest("GET", "/api/policies"),
    create: (data: any) => apiRequest("POST", "/api/policies", data),
  },
  ocr: {
    upload: (fileUrl: string) => apiRequest("POST", "/api/ocr/upload", { fileUrl }),
    logs: (status?: string) => apiRequest("GET", `/api/ocr/logs${status ? `?status=${status}` : ''}`),
    approve: (id: string, invoiceId: string, description?: string) =>
      apiRequest("POST", `/api/ocr/${id}/approve`, { invoiceId, description }),
  },
  billing: {
    createCheckout: (plan: string) => apiRequest("POST", "/api/billing/create-checkout-session", { plan }),
    customerPortal: () => apiRequest("POST", "/api/billing/customer-portal"),
  },
  dashboard: {
    stats: () => apiRequest("GET", "/api/dashboard/stats"),
  },
};
