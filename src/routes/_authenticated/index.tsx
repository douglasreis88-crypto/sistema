import { createFileRoute } from "@tanstack/react-router";
import { ScpcApp } from "@/components/scpc/ScpcApp";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "SCPC — Sistema de Conferência de Prestação de Contas" },
      {
        name: "description",
        content:
          "Sistema de Conferência de Prestação de Contas — comparação entre Sistema Contábil e SIGA para municípios da Bahia.",
      },
    ],
  }),
  component: () => <ScpcApp />,
});
