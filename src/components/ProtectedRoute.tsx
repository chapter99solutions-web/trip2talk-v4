import { Navigate } from 'react-router-dom';
import {
  getStoredRole,
  ROLE_DASHBOARD_PATH,
  type SessionRole,
} from '../lib/sessionRole';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredRole: SessionRole;
};

/** Blocks /dashboard/* unless `trip2talk_role` in sessionStorage matches. */
export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const stored = getStoredRole();

  if (!stored) {
    return <Navigate to="/ops" replace />;
  }

  if (stored !== requiredRole) {
    return <Navigate to={ROLE_DASHBOARD_PATH[stored]} replace />;
  }

  return <>{children}</>;
}
