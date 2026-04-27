import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({ meta: [{ title: "Gerenciar Usuários — SCPC" }] }),
  component: UsuariosPage,
});

interface Row {
  id: string;
  full_name: string;
  email: string | null;
  role: "admin" | "user" | null;
}

function UsuariosPage() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  // Form novo usuário
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast.error("Acesso restrito a administradores.");
      navigate({ to: "/" });
    }
  }, [authLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    const { data: profs, error: e1 } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true });
    if (e1) {
      toast.error(e1.message);
      setLoading(false);
      return;
    }
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    const map = new Map<string, "admin" | "user">();
    for (const r of roles ?? []) {
      const cur = map.get(r.user_id);
      // admin tem prioridade
      if (cur === "admin") continue;
      map.set(r.user_id, r.role as "admin" | "user");
    }
    setRows(
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
    if (isAdmin) load();
  }, [isAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newPwd || !newName) {
      toast.error("Preencha nome, e-mail e senha.");
      return;
    }
    setCreating(true);
    // Cria usuário via signUp com auto-confirm (configurado no projeto).
    // Importante: signUp inicia uma nova sessão. Salvamos a sessão atual e restauramos.
    const { data: oldSession } = await supabase.auth.getSession();

    const { data, error } = await supabase.auth.signUp({
      email: newEmail.trim(),
      password: newPwd,
      options: {
        data: { full_name: newName.trim() },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setCreating(false);
      toast.error(error.message);
      return;
    }

    // Restaura sessão do admin antes de qualquer operação no banco
    if (oldSession.session) {
      await supabase.auth.setSession({
        access_token: oldSession.session.access_token,
        refresh_token: oldSession.session.refresh_token,
      });
    }

    if (!data.user) {
      toast.error("Não foi possível obter os dados do usuário criado.");
      setCreating(false);
      return;
    }

    // Cria o perfil manualmente (não depende de trigger nem de confirmação de e-mail)
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      full_name: newName.trim(),
      email: newEmail.trim(),
    });

    if (profileError) {
      toast.error("Usuário criado mas erro ao salvar perfil: " + profileError.message);
    }

    // Define o papel do usuário
    await supabase.from("user_roles").delete().eq("user_id", data.user.id);
    await supabase.from("user_roles").insert({ user_id: data.user.id, role: newRole });

    toast.success(`Usuário ${newName} criado com sucesso!`);
    setNewName("");
    setNewEmail("");
    setNewPwd("");
    setNewRole("user");
    setCreating(false);
    await load();
  };

  const toggleRole = async (row: Row) => {
    if (row.id === user?.id) {
      toast.error("Você não pode alterar seu próprio papel.");
      return;
    }
    const newR = row.role === "admin" ? "user" : "admin";
    await supabase.from("user_roles").delete().eq("user_id", row.id);
    const { error } = await supabase.from("user_roles").insert({ user_id: row.id, role: newR });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Papel alterado para ${newR.toUpperCase()}.`);
    load();
  };

  const remove = async (row: Row) => {
    if (row.id === user?.id) {
      toast.error("Você não pode excluir a si mesmo.");
      return;
    }
    if (!confirm(`Excluir usuário ${row.full_name || row.email}?`)) return;
    // Remove apenas o profile (cascade no FK); usuário em auth.users só pode ser apagado via service role.
    const { error } = await supabase.from("profiles").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Perfil removido. (O acesso fica bloqueado pois não há perfil/papel.)");
    load();
  };

  if (authLoading || !isAdmin) return null;

  return (
    <div className="usuarios-wrap">
      <div className="topbar">
        <span className="topbar-logo">SCPC</span>
        <div className="topbar-sep" />
        <span className="topbar-title">Gerenciar Usuários</span>
        <div className="topbar-spacer" />
        <Link to="/" className="btn-logout-top">← Voltar ao Sistema</Link>
      </div>

      <div className="container">
        <div className="sec-header">⊕ Cadastrar Novo Usuário</div>
        <div className="card">
          <form onSubmit={handleCreate} className="user-form-grid">
            <div className="field">
              <label>Nome Completo</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} required />
            </div>
            <div className="field">
              <label>E-mail</label>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Senha (mín. 8)</label>
              <input
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="field">
              <label>Papel</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as "admin" | "user")}>
                <option value="user">USUÁRIO</option>
                <option value="admin">ADMIN</option>
              </select>
            </div>
            <div className="field" style={{ alignSelf: "end" }}>
              <button type="submit" className="btn btn-salvar" disabled={creating}>
                {creating ? "Criando..." : "↓ Cadastrar"}
              </button>
            </div>
          </form>
        </div>

        <div className="sec-header" style={{ marginTop: 20 }}>📋 Usuários Cadastrados</div>
        <div className="card">
          {loading ? (
            <div style={{ color: "var(--text-muted)" }}>Carregando...</div>
          ) : rows.length === 0 ? (
            <div style={{ color: "var(--text-muted)" }}>Nenhum usuário.</div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Papel</th>
                  <th style={{ textAlign: "right" }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.full_name || <span style={{ color: "var(--text-dim)" }}>—</span>}</td>
                    <td>{r.email}</td>
                    <td>
                      <span className={`role-pill role-${r.role ?? "none"}`}>
                        {r.role?.toUpperCase() ?? "—"}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        className="btn btn-alterar"
                        style={{ padding: "5px 10px" }}
                        onClick={() => toggleRole(r)}
                        disabled={r.id === user?.id}
                        title={r.id === user?.id ? "Não é permitido alterar seu próprio papel" : ""}
                      >
                        {r.role === "admin" ? "↓ Tornar USER" : "↑ Tornar ADMIN"}
                      </button>{" "}
                      <button
                        className="btn btn-excluir"
                        style={{ padding: "5px 10px" }}
                        onClick={() => remove(r)}
                        disabled={r.id === user?.id}
                      >
                        ✕ Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
