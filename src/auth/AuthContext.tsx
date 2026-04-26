import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { loadPermissions, EMPTY_PERMISSIONS, type UserPermissions } from "@/auth/permissions";
import { municipiosBahia } from "@/data/municipiosBahia";

export type Role = "admin" | "user";

export interface AuthState {
  loading: boolean;
  session: Session | null;
  user: User | null;
  fullName: string;
  role: Role | null;
  isAdmin: boolean;
  permissions: UserPermissions;
  permissionsLoading: boolean;
  refresh: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

// Permissões "implícitas" para admin: todas as entidades + todos os municípios (Bahia).
const ADMIN_PERMS: UserPermissions = {
  entidades: ["prefeitura", "camara", "descentralizado"],
  municipiosPorEntidade: {
    prefeitura: municipiosBahia,
    camara: municipiosBahia,
    descentralizado: municipiosBahia,
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions>(EMPTY_PERMISSIONS);
  const [permissionsLoading, setPermissionsLoading] = useState(false);

  const loadProfileAndRole = async (uid: string, currentUser: User | null) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", uid)
      .maybeSingle();
    
    // Fallback para o nome vindo do Google/Metadata se o profile ainda não existir
    const metaName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || "";
    setFullName(prof?.full_name || metaName || "");

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const rolesArr = (roles ?? []).map((r) => r.role as Role);
    let finalRole = rolesArr.includes("admin") ? "admin" : rolesArr.includes("user") ? "user" : null;
    
    // Fallback para o administrador principal
    if (currentUser?.email?.toLowerCase() === "douglasreis88@gmail.com") {
      finalRole = "admin";
    }

    setRole(finalRole);

    setPermissionsLoading(true);
    try {
      if (finalRole === "admin") {
        setPermissions(ADMIN_PERMS);
      } else {
        const p = await loadPermissions(uid);
        setPermissions(p);
      }
    } catch {
      setPermissions(EMPTY_PERMISSIONS);
    } finally {
      setPermissionsLoading(false);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => {
          loadProfileAndRole(sess.user.id, sess.user);
        }, 0);
      } else {
        setFullName("");
        setRole(null);
        setPermissions(EMPTY_PERMISSIONS);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) await loadProfileAndRole(s.user.id, s.user);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (user) await loadProfileAndRole(user.id, user);
  };

  const refreshPermissions = async () => {
    if (!user) return;
    setPermissionsLoading(true);
    try {
      if (role === "admin") {
        setPermissions(ADMIN_PERMS);
      } else {
        const p = await loadPermissions(user.id);
        setPermissions(p);
      }
    } finally {
      setPermissionsLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthCtx.Provider
      value={{
        loading,
        session,
        user,
        fullName,
        role,
        isAdmin: role === "admin",
        permissions,
        permissionsLoading,
        refresh,
        refreshPermissions,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
