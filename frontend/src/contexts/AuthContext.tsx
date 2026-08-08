import React, { createContext, useState, useContext, useEffect } from "react";
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
  const [authData, setAuthData] = useState<AuthData | null>(null);

  // Load auth data from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      try {
        setAuthData(JSON.parse(stored));
      } catch {
        localStorage.removeItem("auth");
      }
    }
  }, []);

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
