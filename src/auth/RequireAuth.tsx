import { Navigate, Outlet } from "react-router-dom";
import { useAuth, type Role } from "./Auth";

export default function RequireAuth({ role }: { role?: Role }) {
  const { token, user } = useAuth();

  if (!token || !user) return <Navigate to="/login" replace />;

  if (role && user.role !== role) return <Navigate to="/documents" replace />;

  return <Outlet />;
}
