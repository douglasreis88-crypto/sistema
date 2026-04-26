import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/auth/AuthContext";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

// Rotas que NÃO exigem ter selecionado entidade/município.
const SEM_SELECAO = ["/selecao", "/usuarios", "/permissoes"];

function AuthenticatedLayout() {
  const { loading, session, permissionsLoading, permissions, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/login" });
    }
  }, [loading, session, navigate]);

  // Após login, exige escolher entidade+município (exceto rotas administrativas).
  useEffect(() => {
    if (loading || !session || permissionsLoading) return;
    const isManagementRoute = SEM_SELECAO.some((p) => location.pathname.startsWith(p));
    if (isManagementRoute) return;

    const isDouglas = session.user.email?.toLowerCase() === "douglasreis88@gmail.com";
    const tipoSel = sessionStorage.getItem("scpc_sel_tipo");
    const munSel = sessionStorage.getItem("scpc_sel_municipio");
    
    if (!tipoSel || !munSel) {
      if (isDouglas) return; // Douglas pode entrar sem seleção prévia
      
      if (!isAdmin && permissions.entidades.length === 0) {
        navigate({ to: "/selecao" });
        return;
      }
      navigate({ to: "/selecao" });
    }
  }, [loading, session, permissionsLoading, permissions, isAdmin, location.pathname, navigate]);

  if (loading) {
    return (
      <div className="auth-screen">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div className="auth-logo">SCPC</div>
          <div className="auth-sub">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return <Outlet />;
}
