import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

const DEFAULT_DEMO_USERS = [
  {
    id: 1,
    facility_name: 'CityCare General Hospital',
    email: 'hospital@citycare.org',
    role: 'HOSPITAL',
    facility_type: 'Tertiary Care Hospital',
    district: 'Metro District',
    state: 'Karnataka'
  },
  {
    id: 2,
    facility_name: 'Green Valley Community Health Center',
    email: 'clinic@greenvalley.org',
    role: 'HOSPITAL',
    facility_type: 'Primary Health Center',
    district: 'Rural District',
    state: 'Karnataka'
  },
  {
    id: 3,
    facility_name: 'Apex Biologics & Vaccines Ltd.',
    email: 'manufacturer@serumlab.com',
    role: 'MANUFACTURER',
    facility_type: 'Vaccine Production Plant',
    district: 'Industrial Zone',
    state: 'Maharashtra'
  },
  {
    id: 4,
    facility_name: 'Jharkhand Central Vaccine Depot',
    email: 'depot@jharkhandhealth.gov.in',
    role: 'HOSPITAL',
    facility_type: 'Regional Depository',
    district: 'Ranchi',
    state: 'Jharkhand'
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [demoUsers, setDemoUsers] = useState(DEFAULT_DEMO_USERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only load session if user had explicitly logged in
    const saved = localStorage.getItem('vaccine_hub_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }

    // Pre-fetch demo accounts for 1-click switcher from DB
    api.getDemoUsers()
      .then((users) => {
        if (Array.isArray(users) && users.length > 0) {
          setDemoUsers(users);
        }
      })
      .catch((err) => console.warn("Using offline demo users fallback:", err.message))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    setUser(res.user);
    localStorage.setItem('vaccine_hub_user', JSON.stringify(res.user));
    localStorage.setItem('vaccine_hub_token', res.token);
    return res.user;
  };

  const loginAs = (targetUser) => {
    setUser(targetUser);
    localStorage.setItem('vaccine_hub_user', JSON.stringify(targetUser));
    localStorage.setItem('vaccine_hub_token', `demo-jwt-${targetUser.id}-${targetUser.role}`);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('vaccine_hub_user');
    localStorage.removeItem('vaccine_hub_token');
  };

  return (
    <AuthContext.Provider value={{ user, demoUsers, login, loginAs, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
