import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./Auth";

export default function RequireAuth() {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
