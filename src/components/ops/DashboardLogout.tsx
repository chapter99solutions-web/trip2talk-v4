import { useNavigate } from 'react-router-dom';
import { clearStoredRole } from '../../lib/sessionRole';

export function useDashboardLogout() {
  const navigate = useNavigate();
  return () => {
    clearStoredRole();
    navigate('/ops', { replace: true });
  };
}
