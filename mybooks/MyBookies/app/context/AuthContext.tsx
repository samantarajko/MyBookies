import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AuthContextProps {
  isLoggedIn: boolean;
  userId: number | null;
  login: (userId: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextProps>({
  isLoggedIn: false,
  userId: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const login = (id: number) => {
    setIsLoggedIn(true);
    setUserId(id);
  };
  const logout = () => {
    setIsLoggedIn(false);
    setUserId(null);
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, userId, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
