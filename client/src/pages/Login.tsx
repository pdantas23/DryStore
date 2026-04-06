import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { LogIn, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/useAuth";
import { getDefaultRouteByRole } from "@/lib/roleRoutes";
import { APP_NAME } from "../../../shared/const";

export default function Login() {
  const { login, isAuthenticated, profile, loading } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const redirectedRef                   = useRef(false);

  // Redireciona automaticamente se já estiver autenticado
  useEffect(() => {
    if (redirectedRef.current || loading || !isAuthenticated || !profile?.role) return;
    redirectedRef.current = true;
    setLocation(getDefaultRouteByRole(profile.role));
  }, [loading, isAuthenticated, profile, setLocation]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email e senha são obrigatórios");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Email inválido");
      return;
    }
    if (password.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(email, password);

      if (result?.error) {
        setError("Email ou senha incorretos");
        return;
      }

      const route = getDefaultRouteByRole(result?.profile?.role);

      if (route !== "/") {
        redirectedRef.current = true;
        setLocation(route);
        return;
      }

      setError("Seu perfil não está configurado. Contate o administrador.");
    } catch {
      setError("Erro ao fazer login. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isInitialLoading = loading && !isAuthenticated && !isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-blue-600">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{APP_NAME}</h1>
            <p className="mt-2 text-sm text-slate-600">
              Acesse sua conta para continuar
            </p>
          </div>

          {error && (
            <div className="mb-6 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {isInitialLoading && (
            <div className="mb-6 flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <p className="text-sm text-blue-700">Verificando sessão...</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                disabled={isSubmitting || isInitialLoading}
                className="w-full"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Senha
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting || isInitialLoading}
                  className="w-full pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  disabled={isSubmitting || isInitialLoading}
                >
                  {showPassword
                    ? <EyeOff className="h-4 w-4" />
                    : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isInitialLoading}
              className="w-full bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
              size="lg"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </span>
              ) : (
                "Fazer Login"
              )}
            </Button>
          </form>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <p className="text-center text-xs text-slate-500">
              Contate o administrador se você não tiver acesso
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
