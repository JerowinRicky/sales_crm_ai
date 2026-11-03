import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const Ctx = createContext(null);

function safeParseUser(str) {
  if (!str || str === 'undefined' || str === 'null') return null;
  try {
    const parsed = JSON.parse(str);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token || token === 'undefined' || token === 'null') {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      setLoading(false);
      return;
    }

    const stored = localStorage.getItem('crm_user');
    const parsed = safeParseUser(stored);
    if (parsed) {
      setUser(parsed);
    } else {
      localStorage.removeItem('crm_user');
    }

    authAPI.getMe()
      .then(r => {
        if (r?.user) {
          setUser(r.user);
          localStorage.setItem('crm_user', JSON.stringify(r.user));
        } else {
          localStorage.removeItem('crm_user');
        }
      })
      .catch(() => {
        localStorage.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await authAPI.login({ email, password });
    if (r?.token) {
      localStorage.setItem('crm_token', r.token);
    }
    if (r?.user) {
      localStorage.setItem('crm_user', JSON.stringify(r.user));
      setUser(r.user);
    }
    return r?.user;
  }, []);

  const logout = useCallback(() => { localStorage.clear(); setUser(null); }, []);

  return (
    <Ctx.Provider value={{
      user, loading, login, logout,
      isAdmin:  user?.role_name === 'admin',
      isManager: ['admin','sales_manager'].includes(user?.role_name),
      isSalesManager: user?.role_name === 'sales_manager',
      isSales:   user?.role_name === 'salesperson',
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
