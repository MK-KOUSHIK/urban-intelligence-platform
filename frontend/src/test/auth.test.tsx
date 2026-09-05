import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, AuthContext } from '../context/AuthContext';
import { useAuth } from '../hooks/useAuth';
import { ProtectedRoute } from '../router/ProtectedRoute';
import { LoginPage } from '../pages/Login/Index';
import { RoleGuard } from '../components/common/RoleGuard';
import { formatRoleName } from '../utils/formatters';
import { TOKEN_KEY, USER_KEY, hasRole } from '../utils/auth';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import { User } from '../types';

// Mock authApi
vi.mock('../api/auth', () => ({
  authApi: {
    login: vi.fn(),
    getMe: vi.fn(),
    getBackendStatus: vi.fn(),
    getHealth: vi.fn(),
  },
}));

describe('Step 21 — Authentication & Role System Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // A. Login page renders
  it('A. renders login page with branding and input fields', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );

    expect(screen.getByText(/URBAN INTELLIGENCE/i)).toBeInTheDocument();
    expect(screen.getByText(/TRAFFIC COMMAND CENTER/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Operator Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Security Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Command Center/i })).toBeInTheDocument();
  });

  // B. Login validation
  it('B. validates required input fields before submission', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const submitBtn = screen.getByRole('button', { name: /Sign In to Command Center/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Operator username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password credentials are required/i)).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  // C. Successful login
  it('C. performs successful login and updates session', async () => {
    const mockUser: User = { id: 'usr-1', username: 'admin', role: 'admin' };
    (authApi.login as any).mockResolvedValueOnce({
      accessToken: 'test-jwt-token',
      tokenType: 'bearer',
      user: mockUser,
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard Screen</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Operator Username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Security Password/i), { target: { value: 'secret123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Sign In to Command Center/i }));
    });

    await waitFor(() => {
      expect(authApi.login).toHaveBeenCalledWith('admin', 'secret123');
      expect(localStorage.getItem(TOKEN_KEY)).toBe('test-jwt-token');
      expect(screen.getByText(/Dashboard Screen/i)).toBeInTheDocument();
    });
  });

  // D. Failed login
  it('D. displays clear error message on failed login', async () => {
    (authApi.login as any).mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Incorrect username or password' } },
    });

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Operator Username/i), { target: { value: 'wronguser' } });
    fireEvent.change(screen.getByLabelText(/Security Password/i), { target: { value: 'wrongpass' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Sign In to Command Center/i }));
    });

    expect(await screen.findByText(/Incorrect username or password/i)).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  // E. Loading state
  it('E. shows loading state during form submission', async () => {
    (authApi.login as any).mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 200))
    );

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Operator Username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/Security Password/i), { target: { value: 'password' } });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /Sign In to Command Center/i }));
    });

    expect(screen.getByText(/Signing in.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Signing in.../i })).toBeDisabled();
  });

  // F. AuthContext initializes without token
  it('F. initializes AuthContext as unauthenticated when no token exists', async () => {
    let contextValue: any;
    const TestComponent = () => {
      contextValue = useAuth();
      return <div>Unauthenticated Test</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
      expect(contextValue.isAuthenticated).toBe(false);
      expect(contextValue.user).toBeNull();
      expect(contextValue.token).toBeNull();
    });
  });

  // G. AuthContext restores valid session
  it('G. restores valid session from stored token', async () => {
    const mockUser: User = { id: 'usr-123', username: 'traffic_operator', role: 'traffic_authority' };
    localStorage.setItem(TOKEN_KEY, 'valid-saved-jwt');
    (authApi.getMe as any).mockResolvedValueOnce(mockUser);

    let contextValue: any;
    const TestComponent = () => {
      contextValue = useAuth();
      return <div>Session Restored</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(authApi.getMe).toHaveBeenCalled();
      expect(contextValue.isAuthenticated).toBe(true);
      expect(contextValue.user).toEqual(mockUser);
      expect(contextValue.role).toBe('traffic_authority');
    });
  });

  // H. Invalid token clears session
  it('H. clears session when stored token returns 401', async () => {
    localStorage.setItem(TOKEN_KEY, 'invalid-jwt-token');
    (authApi.getMe as any).mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Token expired' } },
    });

    let contextValue: any;
    const TestComponent = () => {
      contextValue = useAuth();
      return <div>Invalid Token Check</div>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.isAuthenticated).toBe(false);
      expect(contextValue.token).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });

  // I. ProtectedRoute redirects unauthenticated user
  it('I. ProtectedRoute redirects unauthenticated user to /login', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login Page Redirected</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Login Page Redirected/i)).toBeInTheDocument();
      expect(screen.queryByText(/Secret Dashboard/i)).not.toBeInTheDocument();
    });
  });

  // J. Authenticated user can access protected route
  it('J. ProtectedRoute allows access for authenticated user', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid-token');
    const mockUser: User = { id: 'u1', username: 'admin', role: 'admin' };
    (authApi.getMe as any).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Secret Dashboard Content</div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Secret Dashboard Content/i)).toBeInTheDocument();
    });
  });

  // K. Authenticated user visiting /login redirects dashboard
  it('K. redirects authenticated user visiting /login to /dashboard', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid-token');
    const mockUser: User = { id: 'u1', username: 'admin', role: 'admin' };
    (authApi.getMe as any).mockResolvedValueOnce(mockUser);

    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<div>Dashboard Redirect Success</div>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Dashboard Redirect Success/i)).toBeInTheDocument();
    });
  });

  // L. Logout clears session
  it('L. logout function clears token and resets user state', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid-token');
    localStorage.setItem(USER_KEY, JSON.stringify({ id: '1', username: 'admin', role: 'admin' }));

    let contextValue: any;
    const TestComponent = () => {
      contextValue = useAuth();
      return (
        <button onClick={contextValue.logout}>Logout Button</button>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(contextValue.isLoading).toBe(false);
    });

    await act(async () => {
      fireEvent.click(screen.getByText(/Logout Button/i));
    });

    expect(contextValue.isAuthenticated).toBe(false);
    expect(contextValue.user).toBeNull();
    expect(contextValue.token).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  // M. Authorization header is attached
  it('M. attaches Authorization Bearer header when token is stored', async () => {
    localStorage.setItem(TOKEN_KEY, 'my-test-bearer-token');

    const config: any = { headers: {} };
    const requestInterceptor = (apiClient.interceptors.request as any).handlers[0].fulfilled;

    const modifiedConfig = requestInterceptor(config);

    expect(modifiedConfig.headers.Authorization).toBe('Bearer my-test-bearer-token');
  });

  // N. 401 clears authentication
  it('N. centralized 401 response interceptor clears stored session', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired-token');
    localStorage.setItem(USER_KEY, JSON.stringify({ id: '1', username: 'u', role: 'admin' }));

    const responseError = { response: { status: 401 } };
    const responseInterceptor = (apiClient.interceptors.response as any).handlers[0].rejected;

    await expect(responseInterceptor(responseError)).rejects.toEqual(responseError);

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(USER_KEY)).toBeNull();
  });

  // O-R. Role detection and formatting
  it('O-R. formats technical role names into human-readable labels', () => {
    expect(formatRoleName('admin')).toBe('Administrator');
    expect(formatRoleName('traffic_authority')).toBe('Traffic Authority');
    expect(formatRoleName('municipal_authority')).toBe('Municipal Authority');
    expect(formatRoleName(null as any)).toBe('Unknown Role');
  });

  // S. Role-aware UI
  it('S. RoleGuard correctly displays content for authorized role and hides for unauthorized', () => {
    const adminUser: User = { id: '1', username: 'admin_usr', role: 'admin' };
    const trafficUser: User = { id: '2', username: 'traffic_usr', role: 'traffic_authority' };

    expect(hasRole(adminUser, ['admin'])).toBe(true);
    expect(hasRole(trafficUser, ['admin'])).toBe(false);
    expect(hasRole(trafficUser, ['traffic_authority', 'municipal_authority'])).toBe(true);

    const { rerender } = render(
      <AuthContext.Provider
        value={{
          user: adminUser,
          token: 'token',
          role: 'admin',
          isAuthenticated: true,
          isLoading: false,
          isBackendUnavailable: false,
          login: vi.fn(),
          logout: vi.fn(),
          restoreSession: vi.fn(),
        }}
      >
        <RoleGuard allowedRoles={['admin']}>
          <div>Admin Only Panel</div>
        </RoleGuard>
      </AuthContext.Provider>
    );

    expect(screen.getByText(/Admin Only Panel/i)).toBeInTheDocument();

    rerender(
      <AuthContext.Provider
        value={{
          user: trafficUser,
          token: 'token',
          role: 'traffic_authority',
          isAuthenticated: true,
          isLoading: false,
          isBackendUnavailable: false,
          login: vi.fn(),
          logout: vi.fn(),
          restoreSession: vi.fn(),
        }}
      >
        <RoleGuard allowedRoles={['admin']}>
          <div>Admin Only Panel</div>
        </RoleGuard>
      </AuthContext.Provider>
    );

    expect(screen.queryByText(/Admin Only Panel/i)).not.toBeInTheDocument();
  });

  // T. No credentials exposed in UI
  it('T. ensures credentials and tokens are not leaked into the DOM text', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/login']}>
          <LoginPage />
        </MemoryRouter>
      </AuthProvider>
    );

    const html = document.body.innerHTML;
    expect(html).not.toContain('urban_intelligence_token');
    expect(html).not.toContain('secret123');
    expect(html).not.toContain('password_hash');
  });
});
