import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { ENTITY_LABELS, type EntityType } from "@/auth/permissions";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
// municipios usados via tela de seleção; aqui o município vem locked.
import { AltBlock, AdjustRow, CategoryChip, SistSigaDif, ValRow } from "@/components/scpc/Primitives";
import { recalcAll, formatOnBlur } from "@/components/scpc/calc";
import {
  collectForm,
  applyToForm,
  clearForm,
  saveConference,
  updateConference,
  deleteConference,
  fetchConference,
  listConferences,
} from "@/components/scpc/crud";
import { LocalizarDialog } from "@/components/scpc/LocalizarDialog";
import { useAuth } from "@/auth/AuthContext";

const NAV = [
  { id: "sec-cats", label: "◈ Categorias" },
  { id: "sec1", label: "1. Alt. Orç." },
  { id: "sec2", label: "2. Despesa" },
  { id: "sec3", label: "3. Razão" },
  { id: "sec31", label: "3.1 Sint." },
  { id: "sec4", label: "4. Concil." },
  { id: "sec5", label: "5. Mov. Banc." },
  { id: "sec6", label: "6. Dem. Ext." },
  { id: "sec7", label: "7. Receita" },
  { id: "sec-notas", label: "✎ Anotações" },
];

const CATEGORIAS = [
  ["cat_desp_pessoal", "Desp. Pessoal"],
  ["cat_rec_pessoal", "Rec. Pessoal"],
  ["cat_rcl", "RCL"],
  ["cat_duodecimo", "Duodécimo"],
  ["cat_licitacao", "Licitação"],
  ["cat_disp_inex", "Disp/Inex"],
  ["cat_contratos", "Contratos"],
  ["cat_ad_contratos", "Ad Contratos"],
  ["cat_pessoal", "Pessoal"],
  ["cat_combustivel", "Combustível"],
  ["cat_publicidade", "Publicidade"],
  ["cat_t_parceria", "T. de Parceria"],
] as const;

const RAZAO_CARDS = [
  ["raz_devedor", "Devedor"],
  ["raz_credor", "Credor"],
  ["raz_desp_mes", "Despesa Mês"],
  ["raz_desp_ano", "Despesa Ano"],
  ["raz_rec_mes", "Receita Mês"],
  ["raz_rec_ano", "Receita Ano"],
  ["raz_saldo_dev", "Saldo Atual Devedor"],
  ["raz_saldo_cred", "Saldo Atual Credor"],
] as const;

const CONTAS_SINT = [
  "1.0.0.0.0.00.00.00.00.00.00",
  "2.0.0.0.0.00.00.00.00.00.00",
  "3.0.0.0.0.00.00.00.00.00.00",
  "4.0.0.0.0.00.00.00.00.00.00",
  "5.0.0.0.0.00.00.00.00.00.00",
  "6.0.0.0.0.00.00.00.00.00.00",
  "7.0.0.0.0.00.00.00.00.00.00",
  "8.0.0.0.0.00.00.00.00.00.00",
];

export function ScpcApp() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [municipio, setMunicipio] = useState(
    () => sessionStorage.getItem("scpc_sel_municipio") || "",
  );
  const [entidade, setEntidade] = useState(
    () => sessionStorage.getItem("scpc_sel_entidade") || "",
  );
  
  const { fullName, isAdmin, signOut, user, permissions } = useAuth();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<"mensal" | "consolidado">("mensal");
  const [activeTab, setActiveTab] = useState("sec-ctrl");

  // ---- TEMA CLARO/ESCURO ----
  const [isLightTheme, setIsLightTheme] = useState(() => {
    const saved = localStorage.getItem("scpc_theme");
    if (saved) return saved === "light";
    return window.matchMedia("(prefers-color-scheme: light)").matches;
  });

  useEffect(() => {
    if (isLightTheme) {
      document.documentElement.classList.add("light-theme");
      localStorage.setItem("scpc_theme", "light");
    } else {
      document.documentElement.classList.remove("light-theme");
      localStorage.setItem("scpc_theme", "dark");
    }
  }, [isLightTheme]);

  const irPara = (id: string) => {
    setActiveTab(id);
    const el = document.getElementById(id);
    if (el) {
      const offset = 120; // Altura combinada das barras + margem
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  const [competencia, setCompetencia] = useState("");
  const [consolidado, setConsolidado] = useState("");

  const isDouglas = user?.email?.toLowerCase() === "douglasreis88@gmail.com";

  // Sincroniza escolha do Douglas com o sessionStorage
  useEffect(() => {
    if (isDouglas) {
      sessionStorage.setItem("scpc_sel_municipio", municipio);
      // Salva sempre em MAIÚSCULAS para bater com o banco de dados
      sessionStorage.setItem("scpc_sel_entidade", entidade.toUpperCase());
      // Busca a chave (EntityType) baseada no label
      const tipoKey = Object.entries(ENTITY_LABELS).find(([_, label]) => label === entidade)?.[0];
      if (tipoKey) sessionStorage.setItem("scpc_sel_tipo", tipoKey);
    }
  }, [municipio, entidade, isDouglas]);

  const [currentId, setCurrentId] = useState<string | null>(null);
  const [locOpen, setLocOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // Lista de IDs carregados no último Localizar (para navegação ◀ ▶)
  const [navList, setNavList] = useState<string[]>([]);
  const [navIndex, setNavIndex] = useState<number>(-1);
  // Modos: 'idle'     (planilha limpa, bloqueada)
  //        'creating' (após Novo — preenchendo novo registro)
  //        'viewing'  (registro carregado, bloqueado para visualização)
  //        'editing'  (registro carregado sendo alterado)
  const [editMode, setEditMode] = useState<"idle" | "creating" | "viewing" | "editing">("idle");
  const isPrefeitura = entidade.toLowerCase().includes("prefeitura");
  
  const isEditing = editMode === "creating" || editMode === "editing";
  const formLocked = !isEditing;

  const handleLogout = async () => {
    sessionStorage.removeItem("scpc_sel_tipo");
    sessionStorage.removeItem("scpc_sel_entidade");
    sessionStorage.removeItem("scpc_sel_municipio");
    await signOut();
    navigate({ to: "/login" });
  };

  const handleTrocarEntidade = () => {
    sessionStorage.removeItem("scpc_sel_tipo");
    sessionStorage.removeItem("scpc_sel_entidade");
    sessionStorage.removeItem("scpc_sel_municipio");
    navigate({ to: "/selecao" });
  };

  const displayName = (fullName || user?.email || "USUÁRIO").toUpperCase();

  const onCompChange = (v: string) => {
    let x = v.replace(/\D/g, "");
    if (x.length >= 4) x = x.slice(0, 4) + "/" + x.slice(4, 6);
    setCompetencia(x);
  };

  const onMesChange = (mes: string) => {
    const ano_atual = competencia ? competencia.split("/")[0] : new Date().getFullYear().toString();
    setCompetencia(`${ano_atual}/${mes}`);
  };

  const onAnoChange = (ano: string) => {
    const mes_atual = competencia ? competencia.split("/")[1] || "01" : "01";
    setCompetencia(`${ano}/${mes_atual}`);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2013 }, (_, i) => currentYear - i);
  const meses = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

  const competenciaAno = competencia ? competencia.split("/")[0] : "";
  const competenciaMes = competencia ? competencia.split("/")[1] : "";

  const resetAll = () => {
    clearForm();
    setCurrentId(null);
    // Mantém município e entidade (vêm da seleção pós-login)
    setCompetencia("");
    setConsolidado("");
    setTipo("mensal");
    recalcAll();
  };

  const handleNovo = () => {
    if (isEditing && !confirm("Iniciar um novo registro? Dados não salvos serão perdidos.")) return;
    resetAll();
    setEditMode("creating");
  };

  const handleCancelar = () => {
    if (editMode === "creating") {
      if (confirm("Cancelar novo lançamento? Os dados serão limpos.")) {
        resetAll();
        setEditMode("idle");
      }
    } else if (editMode === "editing") {
      // No modo edição, apenas voltamos para visualização sem limpar
      setEditMode("viewing");
      toast.info("Edição cancelada. Os campos foram bloqueados.");
    }
  };

  const handleSalvar = async () => {
    if (!user) return;
    if (busy) return;
    if (!municipio || !entidade) {
      toast.error("Selecione Município e Entidade.");
      return;
    }
    if (tipo === "mensal" && !competencia) {
      toast.error("Informe a Competência (AAAA/MM).");
      return;
    }
    if (tipo === "consolidado" && !consolidado) {
      toast.error("Informe o ano consolidado (AAAA).");
      return;
    }
    setBusy(true);
    try {
      const payload = collectForm(tipo, municipio, entidade, competencia, consolidado);
      
      if (editMode === "creating") {
        const rec = await saveConference(payload, user.id);
        setCurrentId(rec.id);
        toast.success("Registro salvo!");
      } else if (editMode === "editing" && currentId) {
        await updateConference(currentId, payload);
        toast.success("Registro atualizado!");
      }
      
      setEditMode("viewing");
    } catch (e: any) {
      toast.error(e.message || "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  };

  const handleLiberarEdicao = () => {
    if (!currentId) {
      toast.error("Nenhum registro carregado. Use Localizar primeiro.");
      return;
    }
    setEditMode("editing");
    toast.info("Campos liberados para edição.");
  };

  const handleExcluir = async () => {
    if (!currentId) {
      toast.error("Nenhum registro carregado.");
      return;
    }
    if (!confirm("Confirma a exclusão deste registro? Esta ação não pode ser desfeita.")) return;
    setBusy(true);
    try {
      await deleteConference(currentId);
      toast.success("Registro excluído.");
      resetAll();
      setEditMode("idle");
    } catch (e: any) {
      toast.error(e.message || "Erro ao excluir.");
    } finally {
      setBusy(false);
    }
  };

  const handleAbrirRegistro = async (id: string, externalList?: string[], externalIdx?: number) => {
    setBusy(true);
    try {
      const rec = await fetchConference(id);

      // Carrega o registro nos campos do formulário
      setCurrentId(rec.id);
      setTipo((rec.tipo as "mensal" | "consolidado") || "mensal");
      setCompetencia(rec.competencia || "");
      setConsolidado(rec.consolidado || "");
      setEditMode("viewing");
      setTimeout(() => {
        applyToForm({
          tipo: rec.tipo as any,
          municipio: rec.municipio || "",
          entidade: rec.entidade || "",
          competencia: rec.competencia || "",
          consolidado: rec.consolidado || "",
          categorias: (rec.categorias as any) || {},
          dados: (rec.dados as any) || {},
          anotacoes: rec.anotacoes || "",
        });
        recalcAll();
      }, 0);

      // Atualiza lista de navegação:
      // Prioridade 1 → lista vinda do Localizar (mais precisa)
      // Prioridade 2 → busca todos os registros do mesmo município/entidade
      if (externalList && externalList.length > 0) {
        setNavList(externalList);
        setNavIndex(externalIdx ?? externalList.indexOf(id));
      } else if (rec.municipio) {
        // Auto-popula a lista com todos os registros do mesmo município/entidade
        const allRecs = await listConferences({
          municipio: rec.municipio,
          entidade: rec.entidade || undefined,
        }) as { id: string }[];
        const ids = allRecs.map((r) => r.id);
        setNavList(ids);
        setNavIndex(ids.indexOf(id));
      }

      toast.success("Registro carregado.");
    } catch (e: any) {
      toast.error(e.message || "Erro ao carregar.");
    } finally {
      setBusy(false);
    }
  };


  const handleNavPrimeiro = () => {
    if (navList.length === 0) return;
    setNavIndex(0);
    handleAbrirRegistro(navList[0]);
  };
  const handleNavAnterior = () => {
    if (navIndex <= 0) return;
    const ni = navIndex - 1;
    setNavIndex(ni);
    handleAbrirRegistro(navList[ni]);
  };
  const handleNavProximo = () => {
    if (navIndex >= navList.length - 1) return;
    const ni = navIndex + 1;
    setNavIndex(ni);
    handleAbrirRegistro(navList[ni]);
  };
  const handleNavUltimo = () => {
    if (navList.length === 0) return;
    const ni = navList.length - 1;
    setNavIndex(ni);
    handleAbrirRegistro(navList[ni]);
  };

  const handleExcel = () => {
    try {
      const payload = collectForm(tipo, municipio, entidade, competencia, consolidado);
      
      // Criar dados para o Excel
      const data = [
        ["SISTEMA DE CONFERÊNCIA DE PRESTAÇÃO DE CONTAS - SCPC"],
        [""],
        ["INFORMAÇÕES GERAIS"],
        ["Município", municipio],
        ["Entidade", entidade],
        ["Tipo de Registro", tipo === "mensal" ? "Mensal" : "Consolidado"],
        ["Competência/Ano", tipo === "mensal" ? competencia : consolidado],
        ["Data da Exportação", new Date().toLocaleString()],
        [""],
        ["CATEGORIAS SELECIONADAS"],
      ];

      // Adicionar categorias
      CATEGORIAS.forEach(([id, label]) => {
        if (payload.categorias[id]) {
          data.push([label, "Sim"]);
        }
      });

      data.push([""]);
      data.push(["DADOS DA CONFERÊNCIA"]);
      data.push(["Campo", "Sistema", "SIGA", "Diferença"]);

      // Mapeamento de campos para exportação organizada
      const sections = [
        { name: "1. Alteração Orçamentária - Mês", prefix: "alt_mes" },
        { name: "1. Alteração Orçamentária - Ano", prefix: "alt_ano" },
        { name: "Fixado/Dotação", fields: ["fix", "dot"] },
        { name: "2. Despesa - Empenhado", prefix: "emp" },
        { name: "2. Despesa - Liquidado", prefix: "liq" },
        { name: "2. Despesa - Pagamento", prefix: "pag" },
        { name: "Restos a Pagar", fields: ["proc", "naoproc"] },
        { name: "Saldo Disponível", fields: ["saldo_disp"] },
        { name: "3. Razão", prefix: "raz" },
        { name: "4. Conciliação", prefix: "conc" },
        { name: "5. Movimentação Bancária", prefix: "mov" },
        { name: "6. Demonstrativos Extras", fields: ["ing_mes", "ing_ano", "des_mes", "des_ano"] },
        { name: "7. Receita", prefix: "rec" }
      ];

      // Função auxiliar para pegar valor formatado ou numérico
      const getVal = (id: string) => payload.dados[id] || "0,00";

      sections.forEach(sec => {
        data.push([sec.name.toUpperCase()]);
        
        if (sec.prefix) {
          // Lógica simplificada para prefixos comuns
          if (sec.prefix === "alt_mes" || sec.prefix === "alt_ano") {
             ["qdd", "qdd2", "cred", "cred2"].forEach(s => {
               const p = `${sec.prefix}_${s}`;
               data.push([s.toUpperCase(), getVal(`${p}_sistema`), getVal(`${p}_siga`), getVal(`${p}_dif`)]);
             });
          } else if (sec.prefix === "emp" || sec.prefix === "liq" || sec.prefix === "pag") {
             data.push(["Mês", getVal(`${sec.prefix}_mes_sistema`), getVal(`${sec.prefix}_mes_siga`), getVal(`${sec.prefix}_mes_dif`)]);
             data.push(["Ano", getVal(`${sec.prefix}_ano_sistema`), getVal(`${sec.prefix}_ano_siga`), getVal(`${sec.prefix}_ano_dif`)]);
          } else if (sec.prefix === "raz") {
             RAZAO_CARDS.forEach(([p, title]) => {
               data.push([title, getVal(`${p}_sistema`), getVal(`${p}_siga`), getVal(`${p}_dif`)]);
             });
          } else if (sec.prefix === "rec") {
             data.push(["Receita Fixada", getVal("rec_fix_sistema"), getVal("rec_fix_siga"), getVal("rec_fix_dif")]);
             data.push(["Mês", getVal("rec_mes_sistema"), getVal("rec_mes_siga"), getVal("rec_mes_dif")]);
             data.push(["Ano", getVal("rec_ano_sistema"), getVal("rec_ano_siga"), getVal("rec_ano_dif")]);
          } else if (sec.prefix === "conc" || sec.prefix === "mov") {
             // Tratamento genérico
             Object.keys(payload.dados).forEach(id => {
               if (id.startsWith(sec.prefix + "_") && id.endsWith("_sistema")) {
                 const base = id.replace("_sistema", "");
                 data.push([base.replace(sec.prefix + "_", "").toUpperCase(), getVal(id), getVal(base + "_siga"), getVal(base + "_dif")]);
               }
             });
          }
        } else if (sec.fields) {
          sec.fields.forEach(f => {
            data.push([f.toUpperCase(), getVal(`${f}_sistema`), getVal(`${f}_siga`), getVal(`${f}_dif`)]);
          });
        }
        data.push([""]);
      });

      if (payload.anotacoes) {
        data.push(["ANOTAÇÕES"]);
        data.push([payload.anotacoes]);
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SCPC");
      
      const fileName = `SCPC_${municipio}_${tipo === "mensal" ? competencia.replace("/", "-") : consolidado}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success("Excel gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar Excel.");
    }
  };

  const handlePdf = async () => {
    if (!containerRef.current) return;
    setBusy(true);
    const toastId = toast.info("Gerando PDF com html2canvas-pro... Aguarde.");
    
    try {
      // 1. Entrar em modo de exportação (força branco/preto no CSS real)
      document.body.classList.add("export-pdf-mode");
      
      // 2. Determinar o nome do arquivo
      let prefixoEntidade = "Descentralizado do Municipal de";
      const entLow = entidade.toLowerCase();
      if (entLow.includes("câmara") || entLow.includes("camara")) {
        prefixoEntidade = "Câmara Municipal de";
      } else if (entLow.includes("prefeitura")) {
        prefixoEntidade = "Prefeitura Municipal de";
      }
      const nomeBase = `SCPC — ${prefixoEntidade} ${municipio}`;
      const fileName = `${nomeBase} — ${tipo === "mensal" ? competencia.replace("/", "-") : consolidado}.pdf`;

      const pdf = new jsPDF({
        orientation: "l",
        unit: "mm",
        format: "a4"
      });

      const sectionIds = [
        "sec-ctrl",
        "sec-cats",
        "sec1",
        "sec2",
        "sec3",
        "sec31",
        "sec4",
        "sec5",
        "sec6",
        "sec7",
        "sec-notas"
      ];

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const margin = 10;

      // Iterar e capturar cada seção (Garante uma seção por página sem cortes)
      for (let i = 0; i < sectionIds.length; i++) {
        const id = sectionIds[i];
        const element = document.getElementById(id);
        if (!element) continue;

        if (i > 0) pdf.addPage();

        // Usando html2canvas-pro para suportar cores modernas do Tailwind 4
        const canvas = await html2canvas(element, {
          scale: 2, // Melhor qualidade para impressão
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          width: element.scrollWidth,
          height: element.scrollHeight,
          onclone: (clonedDoc) => {
            // Pequenos ajustes no clone se necessário
            const clonedEl = clonedDoc.getElementById(id);
            if (clonedEl) {
              clonedEl.style.padding = "10px";
              clonedEl.style.width = element.scrollWidth + "px";
            }
          }
        });

        const imgData = canvas.toDataURL("image/png");
        const imgProps = pdf.getImageProperties(imgData);
        const availableWidth = pdfWidth - (margin * 2);
        const displayWidth = availableWidth;
        const displayHeight = (imgProps.height * displayWidth) / imgProps.width;

        pdf.addImage(imgData, "PNG", margin, margin, displayWidth, displayHeight);
      }

      // Abrir o PDF em nova aba
      const blobUrl = pdf.output('bloburl');
      window.open(blobUrl, '_blank');
      
      toast.dismiss(toastId);
      toast.success("PDF gerado com sucesso!");
    } catch (e: any) {
      console.error("Erro no PDF:", e);
      toast.error(`Erro ao gerar PDF: ${e.message}`);
    } finally {
      document.body.classList.remove("export-pdf-mode");
      setBusy(false);
    }
  };


  const sintIdx = useMemo(() => [1, 2, 3, 4, 5, 6, 7, 8], []);

  // Cálculos automáticos: escuta input/blur globalmente e recalcula DIFs e totais.
  useEffect(() => {
    recalcAll();

    const isMoney = (el: EventTarget | null): el is HTMLInputElement => {
      if (!(el instanceof HTMLInputElement)) return false;
      if (el.readOnly) return false;
      return (
        el.classList.contains("val-input") ||
        el.classList.contains("razao-sint-input") ||
        el.classList.contains("receita-input") ||
        el.classList.contains("receita-input-ajuste") ||
        el.classList.contains("receita-input-mais-menos")
      );
    };

    const onInput = (e: Event) => {
      if (!isMoney(e.target)) return;
      recalcAll();
    };
    const onBlur = (e: Event) => {
      if (!isMoney(e.target)) return;
      formatOnBlur(e.target);
      recalcAll();
    };

    document.addEventListener("input", onInput);
    document.addEventListener("blur", onBlur, true);

    return () => {
      document.removeEventListener("input", onInput);
      document.removeEventListener("blur", onBlur, true);
    };
  }, []);

  return (
    <>
      <div className="header-auto-hide">
        <div className="topbar">
          <div className="topbar-logo">SCPC</div>
          <div className="topbar-divider" />
          <span className="topbar-title">Sistema de Conferência de Prestação de Contas</span>
          <div className="topbar-spacer" />
          <span className="topbar-user-name">{displayName}</span>
          <span className={`topbar-badge ${isAdmin ? "" : "topbar-badge-user"}`}>
            {isAdmin ? "ADMIN" : "USUÁRIO"}
          </span>
          {isAdmin && (
            <>
              <button className="btn-cadastro-usuario" onClick={() => navigate({ to: "/usuarios" })}>
                👤 Usuários
              </button>
              <button className="btn-gerenciar-usuarios" onClick={() => navigate({ to: "/permissoes" })}>
                🔧 Permissões
              </button>
            </>
          )}
          <button className="btn-logout-top" onClick={handleTrocarEntidade} title="Trocar entidade/município">
            🔄 Trocar
          </button>
          <button
            className="btn-theme-toggle"
            onClick={() => setIsLightTheme(prev => !prev)}
            title={isLightTheme ? "Mudar para tema escuro" : "Mudar para tema claro"}
          >
            {isLightTheme ? "🌙 Escuro" : "☀️ Claro"}
          </button>
          <button className="btn-logout-top" onClick={handleLogout}>Sair</button>
        </div>

        <nav className="navbar">
          <button 
            className={`nbtn ${activeTab === "sec-ctrl" ? "nbtn-active" : ""}`}
            onClick={() => {
              setActiveTab("sec-ctrl");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            🌐 Início
          </button>
          {NAV.map((n) => (
            <button 
              key={n.id} 
              className={`nbtn ${activeTab === n.id ? "nbtn-active" : ""}`} 
              onClick={() => irPara(n.id)}
            >
              {n.label}
            </button>
          ))}
          <div style={{ flex: 1, minWidth: 8 }} />
          <button
            className="nbtn nbtn-end"
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })}
          >
            ↓ Final
          </button>
          <button
            className="nbtn nbtn-top"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            ↑ Topo
          </button>
        </nav>
      </div>

      <div className="container" ref={containerRef} data-form-locked={formLocked ? "true" : undefined}>
        {/* CONTROL PANEL */}
        <div className="ctrl-panel" id="sec-ctrl">
          <div className="tipo-registro-wrapper">
            <span className="tipo-registro-label">Tipo de Registro:</span>
            <div className="tipo-registro-opcoes">
              <label className="tipo-registro-radio">
                <input
                  type="radio"
                  name="tipo_registro"
                  value="mensal"
                  checked={tipo === "mensal"}
                  onChange={() => setTipo("mensal")}
                  disabled={formLocked}
                />
                <span className="radio-texto">📅 MENSAL</span>
              </label>
              <label className="tipo-registro-radio">
                <input
                  type="radio"
                  name="tipo_registro"
                  value="consolidado"
                  checked={tipo === "consolidado"}
                  onChange={() => setTipo("consolidado")}
                  disabled={formLocked}
                />
                <span className="radio-texto">📊 CONSOLIDADO</span>
              </label>
            </div>
          </div>

          <div className="ctrl-top">
            <div className="field">
              <label>Município</label>
              {isDouglas ? (
                <select 
                  className="auth-input" 
                  style={{ height: 38, padding: '0 10px', fontSize: 14 }}
                  value={municipio} 
                  onChange={(e) => setMunicipio(e.target.value)}
                  disabled={formLocked}
                >
                  <option value="">— Selecione o município —</option>
                  {permissions.municipiosPorEntidade.prefeitura?.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input id="municipio" type="text" value={municipio} readOnly className="locked-input" />
              )}
            </div>
            <div className="field">
              <label>Entidade</label>
              {isDouglas ? (
                <select 
                  className="auth-input" 
                  style={{ height: 38, padding: '0 10px', fontSize: 14 }}
                  value={entidade} 
                  onChange={(e) => setEntidade(e.target.value)}
                  disabled={formLocked}
                >
                  <option value="">— Selecione a entidade —</option>
                  {permissions.entidades.map(ent => (
                    <option key={ent} value={ENTITY_LABELS[ent]}>{ENTITY_LABELS[ent]}</option>
                  ))}
                </select>
              ) : (
                <input id="entidade" type="text" value={entidade} readOnly className="locked-input" />
              )}
            </div>
            <div className="field">
              <label>Competência</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <select
                  value={competenciaMes}
                  onChange={(e) => onMesChange(e.target.value)}
                  disabled={formLocked}
                  style={{ width: '70px' }}
                >
                  <option value="">Mês</option>
                  {meses.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <select
                  value={competenciaAno}
                  onChange={(e) => onAnoChange(e.target.value)}
                  disabled={formLocked}
                  style={{ width: '80px' }}
                >
                  <option value="">Ano</option>
                  {years.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label>Consolidado (AAAA)</label>
              <input
                type="text"
                value={consolidado}
                onChange={(e) => setConsolidado(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="2026"
                maxLength={4}
                disabled={formLocked || tipo === "mensal"}
              />
            </div>
          </div>

          <div className="ctrl-top" style={{ gridTemplateColumns: "1fr", marginBottom: 0, marginTop: 6 }}>
            <div className="field">
              <label>ID do Registro</label>
              <input
                type="text"
                readOnly
                placeholder="Novo"
                className="registro_id_input"
                value={currentId || ""}
              />
            </div>
          </div>

          <div className="ctrl-actions">
            <button className="btn btn-novo" onClick={handleNovo} disabled={busy || isEditing}>⊕ Novo</button>
            <button className="btn btn-cancelar" onClick={handleCancelar} disabled={busy || !isEditing}>↺ Cancela</button>
            <button className="btn btn-salvar" onClick={handleSalvar} disabled={busy || !isEditing}>↓ Salvar</button>
            <button className="btn btn-alterar" onClick={handleLiberarEdicao} disabled={busy || editMode !== "viewing"}>✎ Alterar</button>
            <button className="btn btn-excluir" onClick={handleExcluir} disabled={busy || editMode !== "viewing"}>✕ Excluir</button>
            <button className="btn btn-localizar" onClick={() => setLocOpen(true)} disabled={busy || isEditing}>⌕ Localizar</button>
            <button className="btn btn-excel" onClick={handleExcel} disabled={busy}>⊞ Excel</button>
            <button className="btn btn-pdf" onClick={handlePdf} disabled={busy}>⊟ PDF</button>
            {/* Navegação entre registros */}
            <div className="nav-sep" />
            <button
              className="btn btn-nav"
              title="Primeiro registro"
              onClick={handleNavPrimeiro}
              disabled={busy || isEditing || navList.length === 0 || navIndex <= 0}
            >⏮</button>
            <button
              className="btn btn-nav"
              title="Registro anterior"
              onClick={handleNavAnterior}
              disabled={busy || isEditing || navIndex <= 0}
            >◀</button>
            <span className="nav-counter">
              {navList.length > 0 ? `${navIndex + 1}/${navList.length}` : "—"}
            </span>
            <button
              className="btn btn-nav"
              title="Próximo registro"
              onClick={handleNavProximo}
              disabled={busy || isEditing || navIndex >= navList.length - 1}
            >▶</button>
            <button
              className="btn btn-nav"
              title="Último registro"
              onClick={handleNavUltimo}
              disabled={busy || isEditing || navList.length === 0 || navIndex >= navList.length - 1}
            >⏭</button>
          </div>


        </div>

        {/* CATEGORIAS */}
        <div className="sec-header" id="sec-cats">Categorias</div>
        <div className="card">
          <div className="cat-grid">
            {CATEGORIAS.map(([id, label]) => (
              <CategoryChip key={id} id={id} label={label} />
            ))}
          </div>
        </div>

        {/* 1. ALTERAÇÃO ORÇAMENTÁRIA */}
        <div className="sec-header" id="sec1">1. Alteração Orçamentária</div>
        <div className="card">
          <div className="sub-heading">Mês</div>
          <div className="alt-grid-4">
            <AltBlock title="Alt. QDD" prefix="alt_mes_qdd" />
            <AltBlock title="Anulação QDD" prefix="alt_mes_qdd2" />
            <AltBlock title="Créd. Adicionais" prefix="alt_mes_cred" />
            <AltBlock title="Anulação Créd." prefix="alt_mes_cred2" />
          </div>
          <hr className="inner-divider" />
          <div className="sub-heading">Ano</div>
          <div className="alt-grid-4">
            <AltBlock title="Alt. QDD" prefix="alt_ano_qdd" />
            <AltBlock title="Anulação QDD" prefix="alt_ano_qdd2" />
            <AltBlock title="Créd. Adicionais" prefix="alt_ano_cred" />
            <AltBlock title="Anulação Créd." prefix="alt_ano_cred2" />
          </div>
          <hr className="inner-divider" />
          <div className="fix-dot-grid">
            <div>
              <div className="sub-heading">Fixado</div>
              <ValRow badge="fix" id="fix_sistema" />
              <ValRow badge="fix" label="SIGA" id="fix_siga" />
              <ValRow badge="dif" id="fix_dif" readOnly />
            </div>
            <div>
              <div className="sub-heading">Dotação</div>
              <ValRow badge="dot" id="dot_sistema" />
              <ValRow badge="dot" label="SIGA" id="dot_siga" />
              <ValRow badge="dif" id="dot_dif" readOnly />
            </div>
          </div>
        </div>

        {/* 2. DESPESA */}
        <div className="sec-header" id="sec2">2. Despesa Orçamentária</div>
        <div className="card">
          {([
            ["Empenhado", "emp"],
            ["Liquidado", "liq"],
            ["Pagamento", "pag"],
          ] as const).map(([titulo, p], i) => (
            <div key={p}>
              {i > 0 && <hr className="inner-divider" />}
              <div className="sub-heading">{titulo}</div>
              <div className="mes-ano-grid" style={{ marginBottom: 20 }}>
                <div>
                  <div className="period-label">Mês</div>
                  <AdjustRow id={`${p}_mes_ajuste`} />
                  <SistSigaDif prefix={`${p}_mes`} />
                </div>
                <div>
                  <div className="period-label">Ano</div>
                  <AdjustRow id={`${p}_ano_ajuste`} />
                  <SistSigaDif prefix={`${p}_ano`} />
                </div>
              </div>
            </div>
          ))}

          <hr className="inner-divider" />
          <div className="sub-heading">Restos a Pagar</div>
          <div className="mes-ano-grid">
            <div>
              <div className="period-label">Processado</div>
              <SistSigaDif prefix="proc" />
            </div>
            <div>
              <div className="period-label">Não Processado</div>
              <SistSigaDif prefix="naoproc" />
            </div>
          </div>

          <div className="saldo-box">
            <div className="saldo-title">◆ Saldo Disponível</div>
            <SistSigaDif prefix="saldo_disp" />
          </div>
        </div>

        {/* 3. RAZÃO */}
        <div className="sec-header" id="sec3">3. Razão</div>
        <div className="card">
          <div className="razao-grid">
            {RAZAO_CARDS.map(([prefix, title]) => (
              <div key={prefix} className="razao-card">
                <div className="razao-card-title">{title}</div>
                <div className="razao-card-body">
                  <SistSigaDif prefix={prefix} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3.1 SINTÉTICAS */}
        <div className="sec-header" id="sec31">
          3.1. Razão - Contas Sintéticas - Sistema Contábil X SIGA
        </div>
        <div className="card" style={{ padding: "12px 14px" }}>
          <div className="razao-sint-wrap">
            <table className="razao-sint-table">
              <thead>
                <tr>
                  {CONTAS_SINT.map((c) => (
                    <th key={c} className="razao-sint-th-conta" colSpan={2}>{c}</th>
                  ))}
                </tr>
                <tr className="razao-sint-sub-header">
                  {sintIdx.flatMap((i) => [
                    <th key={`d${i}`}>Devedor</th>,
                    <th key={`c${i}`}>Credor</th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                <tr className="razao-sint-label-row">
                  <td colSpan={16}><span className="razao-sint-label razao-sint-label-sist">SISTEMA</span></td>
                </tr>
                <tr>
                  {sintIdx.flatMap((i) => [
                    <td key={`s-d-${i}`}><input type="text" className="razao-sint-input" id={`raz${i}_dev_sist_30`} placeholder="0,00" /></td>,
                    <td key={`s-c-${i}`}><input type="text" className="razao-sint-input" id={`raz${i}_cred_sist_30`} placeholder="0,00" /></td>,
                  ])}
                </tr>
                <tr className="razao-sint-label-row">
                  <td colSpan={16}><span className="razao-sint-label razao-sint-label-siga">SIGA</span></td>
                </tr>
                <tr>
                  {sintIdx.flatMap((i) => [
                    <td key={`g-d-${i}`}><input type="text" className="razao-sint-input" id={`raz${i}_dev_siga_31`} placeholder="0,00" /></td>,
                    <td key={`g-c-${i}`}><input type="text" className="razao-sint-input" id={`raz${i}_cred_siga_31`} placeholder="0,00" /></td>,
                  ])}
                </tr>
                <tr className="razao-sint-label-row">
                  <td colSpan={16}><span className="razao-sint-label razao-sint-label-dif">DIF</span></td>
                </tr>
                <tr>
                  {sintIdx.flatMap((i) => [
                    <td key={`f-d-${i}`}><input type="text" className="razao-sint-input razao-sint-cinza" id={`raz${i}_dev_dif_32`} readOnly defaultValue="0,00" /></td>,
                    <td key={`f-c-${i}`}><input type="text" className="razao-sint-input razao-sint-cinza" id={`raz${i}_cred_dif_32`} readOnly defaultValue="0,00" /></td>,
                  ])}
                </tr>
                <tr>
                  {sintIdx.map((i) => (
                    <td key={`t-${i}`} colSpan={2}>
                      <input type="text" className="razao-sint-input razao-sint-amarelo" id={`raz${i}_total_amarelo`} readOnly defaultValue="0,00" />
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. CONCILIAÇÃO */}
        <div className="sec-header" id="sec4">4. Conciliação</div>
        <div className="card">
          <div className="conciliacao-grid">
            <div style={{ maxWidth: 360 }}>
              <SistSigaDif prefix="conc" />
            </div>
            <div className="siga-reports-list">
              <div className="siga-reports-header">RELATÓRIOS DO SIGA</div>
              <div className="siga-reports-content">
                <div>01 – Remuneração dos Agentes Políticos – SIGA</div>
                <div>02 – Licitações Homologadas – SIGA</div>
                <div>03 – Dispensas e Inexigibilidades – SIGA</div>
                <div>04 – Pagamentos de Empenhos – SIGA</div>
                <div>05 – Pagamentos de Retenções – SIGA</div>
                <div>06 – Contratos – SIGA</div>
                <div>07 – Conciliação Bancárias – SIGA</div>
                <div>08 – Receita Orçamentária – SIGA</div>
                <div>09 – Razão Analítico – SIGA</div>
                <div>10 – Razão Sintético – SIGA (CONFERÊNCIA DOS DEMONSTRATIVOS)</div>
                <div>11 – Despesas Orçamentária – SIGA</div>
                <div>12 – Consumo de Combustível – SIGA</div>
                <div>13 – Despesa com Publicidade – SIGA</div>
                <div>14 – Ingresso – SIGA</div>
                <div>15 – Desembolso – SIGA</div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. MOV BANCÁRIA */}
        <div className="sec-header" id="sec5">5. Movimentação Bancária</div>
        <div className="card">
          <div className="mes-ano-grid">
            <div>
              <div className="period-label">Crédito</div>
              <SistSigaDif prefix="mov_cred" />
            </div>
            <div>
              <div className="period-label">Débito</div>
              <SistSigaDif prefix="mov_deb" />
            </div>
          </div>
        </div>

        {/* 6. DEM EXTRAS */}
        <div className="sec-header" id="sec6">6. Demonstrativos Extras</div>
        <div className="card">
          <div className="mes-ano-grid" style={{ marginBottom: 20 }}>
            <div>
              <div className="period-label">Ingresso — Mês</div>
              <SistSigaDif prefix="ing_mes" />
            </div>
            <div>
              <div className="period-label">Ingresso — Ano</div>
              <SistSigaDif prefix="ing_ano" />
            </div>
          </div>
          <hr className="inner-divider" />
          <div className="mes-ano-grid">
            <div>
              <div className="period-label">Desembolso — Mês</div>
              <SistSigaDif prefix="des_mes" />
            </div>
            <div>
              <div className="period-label">Desembolso — Ano</div>
              <SistSigaDif prefix="des_ano" />
            </div>
          </div>
        </div>

        {/* 7. RECEITA */}
        <div className="sec-header" id="sec7">7. Receita Orçamentária</div>
        <div className="card">
          <div className="receita-grid">
            <div className="receita-coluna">
              <div className="receita-periodo-titulo receita-titulo-fixado">Receita Fixada</div>
              <div className="receita-linha-dado">
                <span className="receita-badge receita-badge-fixado">SIST.</span>
                <input type="text" className="receita-input" id="rec_fix_sistema" placeholder="0,00" />
              </div>
              <div className="receita-linha-dado">
                <span className="receita-badge receita-badge-siga">SIGA</span>
                <input type="text" className="receita-input" id="rec_fix_siga" placeholder="0,00" />
              </div>
              <div className="receita-linha-dado">
                <span className="receita-badge receita-badge-dif">DIF</span>
                <input type="text" className="receita-input receita-input-calculado" id="rec_fix_dif" readOnly defaultValue="0,00" />
              </div>
            </div>

            {(["mes", "ano"] as const).map((p) => (
              <div className="receita-coluna" key={p}>
                <div className="receita-periodo-titulo">{p === "mes" ? "Mês" : "Ano"}</div>
                <div className="receita-ajuste-box">
                  <span className="receita-ajuste-label">AJUSTE (+/-)</span>
                  <input type="text" className="receita-input-ajuste" id={`rec_${p}_ajuste`} placeholder="0,00" />
                </div>
                <div className="receita-linha-dado">
                  <span className="receita-badge receita-badge-sist">SIST.</span>
                  <input type="text" className="receita-input" id={`rec_${p}_sistema`} placeholder="0,00" />
                </div>
                <div className="receita-linha-dado">
                  <span className="receita-badge receita-badge-siga">SIGA</span>
                  <input type="text" className="receita-input" id={`rec_${p}_siga`} placeholder="0,00" />
                </div>
                <div className="receita-linha-dado">
                  <span className="receita-badge receita-badge-dif">DIF</span>
                  <input type="text" className="receita-input receita-input-calculado" id={`rec_${p}_dif`} readOnly defaultValue="0,00" />
                </div>
              </div>
            ))}

            <div className="receita-coluna-mais-menos">
              <div className="receita-periodo-titulo">Para Mais / Para Menos</div>
              <table className="receita-tabela-mais-menos">
                <thead>
                  <tr>
                    <th className="receita-th-para-mais">Para Mais</th>
                    <th className="receita-th-para-menos">Para Menos</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td colSpan={2} className="receita-linha-sist-label">SISTEMA</td></tr>
                  <tr>
                    <td><input type="text" className="receita-input-mais-menos" id="rec_mais_sist" placeholder="0,00" /></td>
                    <td><input type="text" className="receita-input-mais-menos" id="rec_menos_sist" placeholder="0,00" /></td>
                  </tr>
                  <tr><td colSpan={2} className="receita-linha-siga-label">SIGA</td></tr>
                  <tr>
                    <td><input type="text" className="receita-input-mais-menos" id="rec_mais_siga" placeholder="0,00" /></td>
                    <td><input type="text" className="receita-input-mais-menos" id="rec_menos_siga" placeholder="0,00" /></td>
                  </tr>
                  <tr><td colSpan={2} className="receita-linha-dif-label">DIF</td></tr>
                  <tr>
                    <td><input type="text" className="receita-input-cinza" id="rec_mais_dif" readOnly defaultValue="0,00" /></td>
                    <td><input type="text" className="receita-input-cinza" id="rec_menos_dif" readOnly defaultValue="0,00" /></td>
                  </tr>
                  <tr>
                    <td colSpan={2}><input type="text" className="receita-input-amarelo" id="rec_total_amarelo" readOnly defaultValue="0,00" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ANOTAÇÕES */}
        <div className="notas-wrap" id="sec-notas">
          <div className="notas-title">// Anotações</div>
          <textarea className="notas-area" placeholder="Digite suas observações aqui..." />
        </div>
      </div>
      <LocalizarDialog
        open={locOpen}
        onClose={() => setLocOpen(false)}
        onSelect={(id, list, idx) => handleAbrirRegistro(id, list, idx)}
      />
    </>
  );
}


