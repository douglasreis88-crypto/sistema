import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar — SCPC" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [identifier, setIdentifier] = useState(""); // E-mail ou Usuário
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState(""); // Novo campo de Usuário
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/" });
  }, [loading, session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);

    if (mode === "login") {
      let finalEmail = identifier;

      // Se não tiver @, assumimos que é um Nome de Usuário
      if (!identifier.includes("@")) {
        const { data, error: lookupError } = await supabase
          .from("profiles")
          .select("email")
          .eq("username", identifier)
          .single();

        if (lookupError || !data) {
          toast.error("Usuário não encontrado.");
          setBusy(false);
          return;
        }
        finalEmail = data.email;
      }

      const { error } = await supabase.auth.signInWithPassword({ email: finalEmail, password });
      setBusy(false);
      if (error) {
        toast.error(error.message === "Invalid login credentials"
          ? "E-mail/Usuário ou senha incorretos."
          : error.message);
        return;
      }
      toast.success("Bem-vindo!");
      navigate({ to: "/" });
    } else {
      // MODO CADASTRO
      if (!name || !username) {
        toast.error("Por favor, preencha nome e nome de usuário.");
        setBusy(false);
        return;
      }
      
      const { error } = await supabase.auth.signUp({
        email: identifier, // No cadastro usamos o e-mail no campo principal
        password,
        options: {
          data: {
            full_name: name,
            username: username,
          },
        },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Cadastro realizado! Verifique seu e-mail para confirmar a conta ou tente fazer login com seu usuário.");
        setMode("login");
      }
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    const redirectTo = window.location.origin;
    console.log("Iniciando login com Google. Redirecionando para:", redirectTo);
    toast.info(`Redirecionando para login... (Volta para: ${redirectTo})`);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectTo,
      },
    });
    
    if (error) {
      setBusy(false);
      toast.error("Falha no login com Google.");
      return;
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-logo">SCPC</div>
        <div className="auth-title">Sistema de Conferência de Prestação de Contas</div>
        <div className="auth-sub">
          {mode === "login" ? "Entre com suas credenciais" : "Crie sua conta no sistema"}
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <>
              <label className="auth-label">Nome Completo</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Seu Nome"
                className="auth-input"
              />
              <label className="auth-label">Nome de Usuário (Ex: douglas)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="usuário"
                className="auth-input"
              />
            </>
          )}

          <label className="auth-label">{mode === "login" ? "E-mail ou Usuário" : "E-mail"}</label>
          <input
            type={mode === "login" ? "text" : "email"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            placeholder={mode === "login" ? "seu@email.com ou usuário" : "seu@email.com"}
            className="auth-input"
          />

          <label className="auth-label">Senha</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="auth-input"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />

          <button type="submit" className="auth-btn auth-btn-primary w-full" disabled={busy}>
            {busy ? "Processando..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <div className="auth-divider"><span>ou</span></div>

        <button type="button" className="auth-btn auth-btn-google" onClick={handleGoogle} disabled={busy}>
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.6 6.3 29 4.5 24 4.5 16.3 4.5 9.7 8.7 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.7 13-4.7l-6-5.1c-1.9 1.3-4.3 2.1-7 2.1-5.3 0-9.8-3.4-11.4-8.1l-6.5 5C9.6 39.2 16.3 43.5 24 43.5z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6 5.1C40.7 35.8 43.5 30.4 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
          </svg>
          Continuar com Google
        </button>

        <div className="auth-foot">
          {mode === "login" ? (
            <>
              Não tem conta? <a href="#" className="auth-link" onClick={() => setMode("register")}>Cadastre-se</a>
            </>
          ) : (
            <>
              Já possui uma conta? <a href="#" className="auth-link" onClick={() => setMode("login")}>Faça Login</a>
            </>
          )}
          <br />
          <Link to="/" className="auth-link" style={{ marginTop: "12px", display: "inline-block" }}>← Voltar</Link>
        </div>
      </div>
    </div>
  );
}
