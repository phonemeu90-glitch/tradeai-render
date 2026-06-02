/**
 * AuthContext — Sistema de Autenticação com Persistência de Sessão
 * Mantém o usuário logado ao atualizar a página
 */
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  demoBalance: number;
  realBalance: number;
  demoPnL: number;
  realPnL: number;
  isAdmin: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  register: (email: string, name: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateBalance: (type: "demo" | "real", amount: number) => Promise<void>;
  updatePnL: (type: "demo" | "real", amount: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = "tradeai_session";
const TOKEN_KEY = "tradeai_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const sessionData = localStorage.getItem(SESSION_KEY);
        const token = localStorage.getItem(TOKEN_KEY);

        if (sessionData && token) {
          const userData = JSON.parse(sessionData);
          if (!userData.id || !userData.email) {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(TOKEN_KEY);
            setIsLoading(false);
            return;
          }
          try {
            const response = await fetch(`/api/users/${userData.id}`);
            if (response.ok) {
              const data = await response.json();
              setUser(data.user);
              localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
            } else {
              setUser(userData);
            }
          } catch {
            setUser(userData);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar sessão:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSession();
  }, []);

  const register = useCallback(async (email: string, name: string, password: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao registrar");
    }
    const data = await response.json();
    setUser(data.user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
    localStorage.setItem(TOKEN_KEY, data.user.id);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erro ao fazer login");
    }
    const data = await response.json();
    setUser(data.user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
    localStorage.setItem(TOKEN_KEY, data.user.id);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("tradeai_pro_binary_state");
    window.location.href = "/";
  }, []);

  const updateBalance = useCallback(async (type: "demo" | "real", amount: number) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/users/${user.id}/balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount }),
      });
      if (response.ok) {
        const updated = { ...user, [type === "demo" ? "demoBalance" : "realBalance"]: amount };
        setUser(updated);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Erro ao atualizar saldo:", err);
    }
  }, [user]);

  const updatePnL = useCallback(async (type: "demo" | "real", amount: number) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/users/${user.id}/pnl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount }),
      });
      if (response.ok) {
        const updated = { ...user, [type === "demo" ? "demoPnL" : "realPnL"]: amount };
        setUser(updated);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      }
    } catch (err) {
      console.error("Erro ao atualizar P&L:", err);
    }
  }, [user]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/users/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
      }
    } catch (err) {
      console.error("Erro ao atualizar usuário:", err);
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, register, login, logout, updateBalance, updatePnL, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return context;
}
