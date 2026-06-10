import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Base API URL
  const API_URL = 'http://localhost:5000/api';

  // Show toast utility
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Check token and fetch user on load
  useEffect(() => {
    const fetchUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.data);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Failed to load user', err);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const handleLogin = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser({ _id: data._id, name: data.name, email: data.email });
        showToast('Login successful!', 'success');
        return { success: true };
      } else {
        const errorMsg = data.message || data.error || 'Login failed';
        showToast(errorMsg, 'error');
        return { success: false, message: errorMsg };
      }
    } catch (err) {
      showToast('Server connection failed', 'error');
      return { success: false, message: 'Server connection failed' };
    }
  };

  const handleRegister = async (name, email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser({ _id: data._id, name: data.name, email: data.email });
        showToast('Registration successful!', 'success');
        return { success: true };
      } else {
        const errorMsg = data.message || data.error || 'Registration failed';
        showToast(errorMsg, 'error');
        return { success: false, message: errorMsg };
      }
    } catch (err) {
      showToast('Server connection failed', 'error');
      return { success: false, message: 'Server connection failed' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    showToast('Logged out successfully', 'info');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        toasts,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        showToast,
        API_URL
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
