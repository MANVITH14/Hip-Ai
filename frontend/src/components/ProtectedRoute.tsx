import { Navigate } from "react-router-dom";
import { getToken } from "../lib/storage";

type ProtectedRouteProps = {
  children: JSX.Element;
};

export function ProtectedRoute({ children }: ProtectedRouteProps): JSX.Element {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
