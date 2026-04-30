import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAuth } from "@/auth/AuthContext";
import { ENTITY_LABELS, type EntityType } from "@/auth/permissions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/selecao")({
  head: () => ({ meta: [{ title: "Selecionar Entidade — SCPC" }] }),
  component: SelecaoPage,
});

function SelecaoPage() {
  const { permissions, permissionsLoading, fullName, user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<EntityType | "">("");
  const [municipio, setMunicipio] = useState("");

  const municipiosDisponiveis = useMemo(() => {
    if (!tipo) return [];
    return permissions.municipiosPorEntidade[tipo] ?? [];
  }, [tipo, permissions]);

  const handleAcessar = () => {
    if (!tipo || !municipio) {
      toast.error("Selecione a entidade e o município.");
      return;
    }
    sessionStorage.setItem("scpc_sel_tipo", tipo);
    sessionStorage.setItem("scpc_sel_entidade", ENTITY_LABELS[tipo]);
    sessionStorage.setItem("scpc_sel_municipio", municipio);
    navigate({ to: "/" });
  };

  const handleSair = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const handleVoltar = () => {
    navigate({ to: "/" });
  };

  const isDouglas = user?.email?.toLowerCase() === "douglasreis88@gmail.com";
  const semAcesso = !permissionsLoading && permissions.entidades.length === 0 && !isAdmin && !isDouglas;
  const displayName = (fullName || user?.email || "USUÁRIO").toUpperCase();

  return (
    <div className="auth-screen">
      <div className="auth-card sel-card">
        <div className="auth-logo">SCPC</div>
        <div className="auth-title">Selecionar Entidade e Município</div>
        <div className="auth-sub">
          {displayName} · {isAdmin ? "ADMIN" : "USUÁRIO"}
        </div>

        {permissionsLoading ? (
          <div className="auth-foot" style={{ marginTop: 24 }}>
            Carregando permissões...
          </div>
        ) : semAcesso ? (
          <div className="sel-warning">
            ⚠️ Você não tem acesso a nenhuma entidade.
            <br />
            Solicite ao administrador a liberação de permissões.
          </div>
        ) : (
          <>
            <div className="auth-form" style={{ marginTop: 18 }}>
              <label className="auth-label">Entidade</label>
              <select
                className="auth-input"
                value={tipo}
                onChange={(e) => {
                  setTipo(e.target.value as EntityType);
                  setMunicipio("");
                }}
              >
                <option value="">— Selecione a entidade —</option>
                {permissions.entidades.map((ent) => (
                  <option key={ent} value={ent}>
                    {ENTITY_LABELS[ent]}
                  </option>
                ))}
              </select>

              <label className="auth-label">Município</label>
              <select
                className="auth-input"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                disabled={!tipo || municipiosDisponiveis.length === 0}
              >
                <option value="">
                  {!tipo
                    ? "— Selecione a entidade primeiro —"
                    : municipiosDisponiveis.length === 0
                      ? "Nenhum município liberado para esta entidade"
                      : "— Selecione o município —"}
                </option>
                {municipiosDisponiveis.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <button
                type="button"
                className="auth-btn auth-btn-primary"
                onClick={handleAcessar}
                disabled={!tipo || !municipio}
              >
                ✓ Acessar Sistema
              </button>
            </div>
          </>
        )}

        <div className="auth-foot">
          <button
            type="button"
            className="auth-link"
            onClick={handleSair}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            ← Sair
          </button>
          <button
            type="button"
            className="auth-link"
            onClick={handleVoltar}
            style={{ background: "none", border: "none", cursor: "pointer", marginTop: 8 }}
          >
            ↩ Voltar
          </button>
        </div>
      </div>
    </div>
  );
}
