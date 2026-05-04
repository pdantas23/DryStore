import { Route, Switch } from "wouter";
import ProtectedRoute from "@/features/auth/ProtectedRoute";
import { useAuth } from "@/features/auth/useAuth";
import SplashScreen from "@/components/SplashScreen";

import Home     from "@/pages/Home";
import Login    from "@/pages/Login";
import NotFound from "@/pages/NotFound";

import Comercial from "@/features/comercial/pages/Comercial";
import Catalog   from "@/features/catalog/pages/Catalog";

export default function App() {
  const { loading } = useAuth();

  if (loading) return <SplashScreen />;

  return (
    <Switch>
      {/* ── Rotas públicas ─────────────────────────────────────────────── */}
      <Route path="/"         component={Home}    />
      <Route path="/login"    component={Login}   />
      <Route path="/catalogo" component={Catalog} />

      {/* ── Área comercial ─────────────────────────────────────────────── */}
      <Route path="/comercial">
        <ProtectedRoute allowedRoles={["admin", "comercial"]}>
          <Comercial />
        </ProtectedRoute>
      </Route>

      {/* ── Fallback 404 ───────────────────────────────────────────────── */}
      <Route component={NotFound} />
    </Switch>
  );
}
