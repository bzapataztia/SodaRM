import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  role: string;
  needsOnboarding?: boolean;
}

interface AuthTenant {
  id: string;
  name: string;
  plan: string;
  maxProperties: number;
  propertiesCount: number;
}

interface AuthResponse {
  user: AuthUser;
  tenant: AuthTenant | null;
}

export function useAuth() {
  const { data: response, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user: response?.user,
    tenant: response?.tenant,
    isLoading,
    isAuthenticated: !!response?.user,
    needsOnboarding: response?.user?.needsOnboarding,
  };
}
