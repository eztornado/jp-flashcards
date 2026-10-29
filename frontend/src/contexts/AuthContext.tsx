import React, { createContext, useState, useContext } from "react";
import { api } from "../lib/api";

interface User {
  id: number;
  username: string;
  role: "USER" | "ADMIN";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthData {
  token: string;
  user: User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Inicialización perezosa: leemos localStorage ANTES del primer render.
  // Si se hace en un useEffect, ProtectedRoute ve isAuthenticated=false en el
  // primer render y redirige a /login en cada recarga de la página.
  const [authData, setAuthData] = useState<AuthData | null>(() => {
    const stored = localStorage.getItem("auth");
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored) as AuthData;
      if (!parsed?.token || !parsed?.user) {
        localStorage.removeItem("auth");
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem("auth");
      return null;
    }
  });

  const login = async (username: string, password: string) => {
    const response = await api.post("/api/auth/login", { username, password });
    const data: AuthData = response.data;

    setAuthData(data);
    localStorage.setItem("auth", JSON.stringify(data));
  };

  const logout = () => {
    setAuthData(null);
    localStorage.removeItem("auth");
  };

  const value: AuthContextType = {
    user: authData?.user || null,
    token: authData?.token || null,
    isAuthenticated: !!authData,
    isAdmin: authData?.user?.role === "ADMIN",
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
