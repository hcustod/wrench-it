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
    return (
      <div
        className="d-flex justify-content-center align-items-center py-5 px-3"
        style={{ minHeight: '45vh' }}
      >
        <div className="text-center">
          <div
            className="spinner-border mb-3"
            role="status"
            aria-label="Loading"
            style={{
              width: '2.5rem',
              height: '2.5rem',
              color: 'var(--wt-accent-soft)',
            }}
          />
          <p className="wt-text-muted small mb-0">Checking your session...</p>
        </div>
      </div>
    );
  }

  if (!state.user) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
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
