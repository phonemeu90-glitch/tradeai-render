/**
 * ProtectedRoute — Componente para proteger rotas autenticadas
 */
import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Activity } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0a0f23 0%, #1a2a4a 50%, #0f1a35 100%)" }}>
        <div className="text-center">
          <Activity className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" />
          <p className="text-white">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    setLocation("/auth");
    return null;
  }

  return <>{children}</>;
}
