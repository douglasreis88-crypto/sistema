import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SISTEMA DE CONFERÊNCIA DE PRESTAÇÃO DE CONTAS" },
      { name: "description", content: "Your Coding Journey is a React application for managing financial data and user access." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "SISTEMA DE CONFERÊNCIA DE PRESTAÇÃO DE CONTAS" },
      { property: "og:description", content: "Your Coding Journey is a React application for managing financial data and user access." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "SISTEMA DE CONFERÊNCIA DE PRESTAÇÃO DE CONTAS" },
      { name: "twitter:description", content: "Your Coding Journey is a React application for managing financial data and user access." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/M9sE6Mkq3lSedXPDQS82MwjFGqo1/social-images/social-1776895271612-2.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/M9sE6Mkq3lSedXPDQS82MwjFGqo1/social-images/social-1776895271612-2.webp" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  );
}
