import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { municipiosBahia } from "@/data/municipiosBahia";
import {
  ENTITY_LABELS,
  loadPermissions,
  savePermissions,
  type EntityType,
  type UserPermissions,
} from "@/auth/permissions";

export const Route = createFileRoute("/_authenticated/permissoes")({
  head: () => ({ meta: [{ title: "Permissões — SCPC" }] }),
  component: PermissoesPage,
});

const ENTIDADES: EntityType[] = ["prefeitura", "camara", "descentralizado"];

interface UserRow {
  id: string;
  full_name: string;
  email: string | null;
  role: "admin" | "user" | null;
}

function PermissoesPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [perms, setPerms] = useState<UserPermissions>({
    entidades: [],
    municipiosPorEntidade: { prefeitura: [], camara: [], descentralizado: [] },
  });
  const [filtro, setFiltro] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Acesso restrito a administradores.");
      navigate({ to: "/" });
    }
  }, [authLoading, isAdmin, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const map = new Map<string, "admin" | "user">();
    for (const r of roles ?? []) {
      const cur = map.get(r.user_id);
      if (cur === "admin") continue;
      map.set(r.user_id, r.role as "admin" | "user");
    }
    setUsers(
      (profs ?? []).map((p) => ({
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        role: map.get(p.id) ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [isAdmin]);

  const handleSelectUser = async (uid: string) => {
    setSelectedUserId(uid);
    if (!uid) return;
    try {
      const p = await loadPermissions(uid);
      setPerms(p);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleEntidade = (ent: EntityType) => {
    setPerms((prev) => {
      const has = prev.entidades.includes(ent);
      const entidades = has ? prev.entidades.filter((e) => e !== ent) : [...prev.entidades, ent];
      return { ...prev, entidades };
    });
  };

  const toggleMunicipio = (ent: EntityType, mun: string) => {
    setPerms((prev) => {
      const list = prev.municipiosPorEntidade[ent] ?? [];
      const has = list.includes(mun);
      const updated = has ? list.filter((m) => m !== mun) : [...list, mun];
      return {
        ...prev,
        municipiosPorEntidade: { ...prev.municipiosPorEntidade, [ent]: updated },
      };
    });
  };

  const marcarTodos = (ent: EntityType) => {
    setPerms((prev) => ({
      ...prev,
      municipiosPorEntidade: { ...prev.municipiosPorEntidade, [ent]: [...municipiosBahia] },
    }));
  };

  const limparTodos = (ent: EntityType) => {
    setPerms((prev) => ({
      ...prev,
      municipiosPorEntidade: { ...prev.municipiosPorEntidade, [ent]: [] },
    }));
  };

  const handleSalvar = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    try {
      await savePermissions(selectedUserId, perms);
      toast.success("Permissões salvas com sucesso!");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const municipiosFiltrados = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    if (!f) return municipiosBahia;
    return municipiosBahia.filter((m) => m.toLowerCase().includes(f));
  }, [filtro]);

  const usuariosComuns = users.filter((u) => u.role !== "admin");

  if (authLoading || !isAdmin) return null;

  return (
    <div className="usuarios-wrap">
      <div className="topbar">
        <span className="topbar-logo">SCPC</span>
        <div className="topbar-sep" />
        <span className="topbar-title">Gerenciar Permissões</span>
        <div className="topbar-spacer" />
        <Link to="/usuarios" className="btn-logout-top" style={{ marginRight: 8 }}>
          👥 Usuários
        </Link>
        <Link to="/" className="btn-logout-top">
          ← Voltar
        </Link>
      </div>

      <div className="container">
        <div className="sec-header">🔧 Selecionar Usuário</div>
        <div className="card">
          {loading ? (
            <div style={{ color: "var(--text-muted)" }}>Carregando...</div>
          ) : (
            <div className="field">
              <label>Usuário</label>
              <select
                value={selectedUserId}
                onChange={(e) => handleSelectUser(e.target.value)}
              >
                <option value="">— Selecione um usuário —</option>
                {usuariosComuns.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || u.email} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {selectedUserId && (
          <>
            <div className="sec-header" style={{ marginTop: 20 }}>
              🏛️ Entidades Permitidas
            </div>
            <div className="card">
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {ENTIDADES.map((ent) => (
                  <label key={ent} className="perm-chk">
                    <input
                      type="checkbox"
                      checked={perms.entidades.includes(ent)}
                      onChange={() => toggleEntidade(ent)}
                    />
                    <span>{ENTITY_LABELS[ent]}</span>
                  </label>
                ))}
              </div>
            </div>

            {perms.entidades.length > 0 && (
              <>
                <div className="sec-header" style={{ marginTop: 20 }}>
                  📍 Municípios por Entidade
                </div>
                <div className="card">
                  <div className="field" style={{ marginBottom: 12 }}>
                    <label>Filtrar municípios</label>
                    <input
                      type="text"
                      placeholder="Digite parte do nome..."
                      value={filtro}
                      onChange={(e) => setFiltro(e.target.value)}
                    />
                  </div>

                  {perms.entidades.map((ent) => {
                    const selecionados = perms.municipiosPorEntidade[ent] ?? [];
                    return (
                      <div key={ent} className="perm-bloco">
                        <div className="perm-bloco-head">
                          <strong>{ENTITY_LABELS[ent]}</strong>
                          <span className="perm-count">
                            {selecionados.length} de {municipiosBahia.length}
                          </span>
                          <div style={{ flex: 1 }} />
                          <button className="btn btn-novo" onClick={() => marcarTodos(ent)}>
                            ✓ Todos
                          </button>{" "}
                          <button className="btn btn-cancelar" onClick={() => limparTodos(ent)}>
                            ✕ Nenhum
                          </button>
                        </div>
                        <div className="perm-mun-grid">
                          {municipiosFiltrados.map((m) => (
                            <label key={m} className="perm-mun-chk">
                              <input
                                type="checkbox"
                                checked={selecionados.includes(m)}
                                onChange={() => toggleMunicipio(ent, m)}
                              />
                              <span>{m}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div className="card" style={{ marginTop: 20, textAlign: "right" }}>
              <button className="btn btn-salvar" onClick={handleSalvar} disabled={saving}>
                {saving ? "Salvando..." : "💾 Salvar Permissões"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
