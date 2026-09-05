import React, { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { getErrorMessage } from '../../utils/formatters';
import {
  ShieldAlert,
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Activity,
  ShieldCheck,
  Radio,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ username?: string; password?: string }>({});

  const fromLocation = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // If user is already authenticated, redirect to /dashboard immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(fromLocation, { replace: true });
    }
  }, [isAuthenticated, navigate, fromLocation]);

  const validateForm = (): boolean => {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) {
      errors.username = 'Operator username is required.';
    }
    if (!password) {
      errors.password = 'Password credentials are required.';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authApi.login(username.trim(), password);
      login(response.accessToken, response.user);
      navigate(fromLocation, { replace: true });
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-950 text-slate-100">
      <div className="grid w-full grid-cols-1 lg:grid-cols-12 min-h-screen">
        {/* LEFT COLUMN: System Branding */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
          <div className="space-y-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 shadow-lg shadow-blue-500/10">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-wider font-mono text-white uppercase">
                  Urban Intelligence
                </h1>
                <p className="text-xs text-blue-400 font-mono tracking-widest uppercase">
                  Traffic Command Center
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-xl">
              <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-100">
                Municipal Operations & Telemetry Control Portal
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Centralized real-time monitoring system processing vehicle edge camera feeds, incident triage, and automated traffic authority notifications.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg pt-4">
              <div className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-800 bg-slate-900/60">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Role-Based Access</div>
                  <div className="text-[11px] text-slate-400 font-mono">Encrypted Auth Handshake</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3.5 rounded-lg border border-slate-800 bg-slate-900/60">
                <Radio className="h-5 w-5 text-blue-400 shrink-0 animate-pulse" />
                <div>
                  <div className="text-xs font-semibold text-slate-200">Live Edge Telemetry</div>
                  <div className="text-[11px] text-slate-400 font-mono">Real-time WebSocket Stream</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-8 mt-8 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              Command Center Online
            </span>
            <span>v1.0.0-PROD</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Operational Login Form */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center p-8 lg:p-16 bg-slate-950">
          <div className="mx-auto w-full max-w-md space-y-6">
            <div className="space-y-2 text-left">
              <h2 className="text-2xl font-bold tracking-tight text-white font-mono uppercase">
                Operator Sign In
              </h2>
              <p className="text-xs text-slate-400">
                Enter your command center credentials to access operational feeds.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 p-3.5 rounded-lg border border-red-500/30 bg-red-950/40 text-red-300 text-xs font-mono"
              >
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-semibold block">Authentication Failure</span>
                  <span>{error}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <Input
                  id="username"
                  label="Operator Username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (validationErrors.username) {
                      setValidationErrors((prev) => ({ ...prev, username: undefined }));
                    }
                  }}
                  placeholder="e.g. admin"
                  autoComplete="username"
                  leftIcon={<UserIcon className="h-4 w-4 text-slate-400" />}
                  error={validationErrors.username}
                  className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                />
              </div>

              <div>
                <Input
                  id="password"
                  label="Security Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (validationErrors.password) {
                      setValidationErrors((prev) => ({ ...prev, password: undefined }));
                    }
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  leftIcon={<Lock className="h-4 w-4 text-slate-400" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-200 focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                  error={validationErrors.password}
                  className="bg-slate-900 border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className="w-full h-11 bg-blue-600 hover:bg-blue-500 text-white font-mono uppercase tracking-wider text-xs font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size="sm" />
                    Signing in...
                  </span>
                ) : (
                  'Sign In to Command Center'
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-slate-900 text-center">
              <p className="text-[11px] font-mono text-slate-500">
                Unauthorized access to municipal command networks is strictly audited and logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
