import { useEffect, useState } from "react";
import { listConferences } from "./crud";

interface Row {
  id: string;
  tipo: string;
  municipio: string | null;
  entidade: string | null;
  competencia: string | null;
  consolidado: string | null;
  created_at: string;
}

export function LocalizarDialog({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (id: string, list: string[], idx: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Busca somente por município — sem filtro de entidade para evitar
      // problemas de acentuação e maiúsculas/minúsculas.
      const munic = sessionStorage.getItem("scpc_sel_municipio") || undefined;

      const data = await listConferences({
        municipio: munic,
        competencia: search || undefined,
      });
      setRows(data as Row[]);
    } finally {
      setLoading(false);
    }
  };

  // Carrega ao abrir o modal
  useEffect(() => {
    if (open) {
      setSearch("");
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const municipioSel = sessionStorage.getItem("scpc_sel_municipio") || "";
  const entidadeSel = sessionStorage.getItem("scpc_sel_entidade") || "";

  if (!open) return null;

  return (
    <div className="loc-overlay" onClick={onClose}>
      <div className="loc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="loc-header">
          <span>⌕ Localizar Registros · {entidadeSel || municipioSel}</span>
          <button className="loc-close" onClick={onClose}>✕</button>
        </div>
        <div className="loc-filters">
          <input
            type="text"
            placeholder="Competência (ex: 2026/01) — deixe vazio para ver todos"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
          <button className="btn btn-localizar" onClick={load} disabled={loading}>
            {loading ? "..." : "Buscar"}
          </button>
        </div>
        <div className="loc-table-wrap">
          <table className="loc-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Município</th>
                <th>Entidade</th>
                <th>Competência / Ano</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: 18, opacity: 0.6 }}>
                    {loading ? "Carregando..." : "Nenhum registro encontrado"}
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.tipo}</td>
                  <td>{r.municipio || "-"}</td>
                  <td>{r.entidade || "-"}</td>
                  <td>{r.competencia || r.consolidado || "-"}</td>
                  <td>{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                  <td>
                    <button
                      className="btn btn-novo"
                      style={{ padding: "4px 10px", fontSize: 12 }}
                      onClick={() => {
                        const list = rows.map((row) => row.id);
                        const idx = rows.indexOf(r);
                        onSelect(r.id, list, idx);
                        onClose();
                      }}
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
