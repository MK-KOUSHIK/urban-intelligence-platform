import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { AuthProvider } from './context/AuthContext';
import { ConnectionProvider } from './context/ConnectionContext';
import { ThemeProvider } from './context/ThemeContext';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ConnectionProvider>
          <RouterProvider router={router} />
        </ConnectionProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
