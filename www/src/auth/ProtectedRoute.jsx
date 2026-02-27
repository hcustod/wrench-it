import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser, routeForRole } from './keycloak.js';

function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toUpperCase() : '';
}

export default function ProtectedRoute({ children, roles = [] }) {
  const location = useLocation();
  const [state, setState] = useState({ loading: true, user: null });

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((user) => {
        if (!active) return;
        setState({ loading: false, user: user ?? null });
      })
      .catch(() => {
        if (!active) return;
        setState({ loading: false, user: null });
      });

    return () => {
      active = false;
    };
  }, []);

  if (state.loading) {
    return null;
  }

  if (!state.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (Array.isArray(roles) && roles.length > 0) {
    const currentRole = normalizeRole(state.user.role);
    const allowedRoles = roles.map(normalizeRole);
    if (!allowedRoles.includes(currentRole)) {
      return <Navigate to={routeForRole(currentRole)} replace />;
    }
  }

  return children;
}
