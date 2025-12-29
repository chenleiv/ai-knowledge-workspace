import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./Auth";
import type { Role } from "./Auth";

export default function RequireRole({ allow }: { allow: Role[] }) {
  const { user, isReady } = useAuth();

  if (!isReady) return <div />;
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/documents" replace />;

  return <Outlet />;
}
