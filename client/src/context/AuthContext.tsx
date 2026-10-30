import { getMe } from "@/lib/services/users";
import type { LoginInput, RegisterInput, User } from "@/types";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as authService from "@/lib/services/auth";
import { setUnauthorizedHandler } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    getMe()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function register(input: RegisterInput) {
    await authService.register(input);
  }

  async function login(input: LoginInput) {
    await authService.login(input);
    const data = await getMe();
    setUser(data.user);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  // re-reads the user from the server, e.g. after changing the avatar
  async function refreshUser() {
    const data = await getMe();
    setUser(data.user);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, register, login, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }
  return context;
}
