import { jsPDF } from "jspdf";

const getVal = (id: string): string => {
  const el = document.getElementById(id) as HTMLInputElement | null;
  return el?.value || "0,00";
};

const n = (id: string) => getVal(id);

interface Section {
  title: string;
  rows: Row[];
}

interface Row {
  label: string;
  sist?: string;
  siga?: string;
  dif?: string;
  isSubheader?: boolean;
  isMesAno?: boolean;
  mesLabel?: string;
  anoLabel?: string;
  sistMes?: string; sistAno?: string;
  sigaMes?: string; sigaAno?: string;
  difMes?: string; difAno?: string;
}

export const gerarPdfRelatorio = (
  municipio: string,
  entidade: string,
  competencia: string,
  consolidado: string,
  tipo: string
) => {
  const pdf = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
  const PW = pdf.internal.pageSize.getWidth();   // 297
  const PH = pdf.internal.pageSize.getHeight();  // 210
  const M = 10; // margem

  // ── Cores ──
  const AZUL     = [30,  80, 160] as const;
  const AZUL_CLR = [210, 225, 250] as const;
  const VERDE    = [60, 140,  60] as const;
  const VERDE_CLR= [220, 245, 220] as const;
  const VERM     = [180,  30,  30] as const;
  const VERM_CLR = [250, 220, 220] as const;
  const CINZA    = [100, 100, 100] as const;
  const CINZA_CLR= [240, 240, 240] as const;
  const AMAR     = [200, 160,   0] as const;
  const AMAR_CLR = [255, 248, 200] as const;
  const BRANCO   = [255, 255, 255] as const;
  const PRETO    = [20,  20,  20] as const;

  let y = M;
  let pageNum = 1;

  // Constantes de layout de grade
  const GH = 5.5;
  const GLABEL = 28;
  const GW = (PW - M * 2 - GLABEL) / 6;
  const gx = M;

  const addPage = () => {
    pdf.addPage();
    pageNum++;
    y = M;
    drawPageHeader();
  };

  const checkY = (needed: number) => {
    if (y + needed > PH - M) addPage();
  };

  const drawPageHeader = () => {
    // Faixa azul título
    pdf.setFillColor(...AZUL);
    pdf.rect(M, y, PW - M * 2, 8, "F");
    pdf.setTextColor(...BRANCO);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("DEMONSTRATIVO DE CONFERÊNCIA CONTÁBIL", PW / 2, y + 5.5, { align: "center" });
    y += 9;

    // Linha de info
    pdf.setFillColor(...AZUL_CLR);
    pdf.rect(M, y, PW - M * 2, 6, "F");
    pdf.setTextColor(...PRETO);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    const comp = tipo === "mensal" ? competencia : `Consolidado ${consolidado}`;
    pdf.text(`Município: ${municipio.toUpperCase()}`, M + 2, y + 4);
    pdf.text(`Entidade: ${entidade.toUpperCase()}`, PW / 2, y + 4, { align: "center" });
    pdf.text(`Competência: ${comp}`, PW - M - 2, y + 4, { align: "right" });
    y += 7;
  };

  // ── Cabeçalho inicial ──
  drawPageHeader();

  // ── Função para desenhar uma seção ──
  const COL_LABEL = 70;
  const COL_W = (PW - M * 2 - COL_LABEL) / 3;
  const ROW_H = 5.5;

  const drawSectionHeader = (title: string) => {
    checkY(8);
    y += 2;
    pdf.setFillColor(...CINZA);
    pdf.rect(M, y, PW - M * 2, 6, "F");
    pdf.setTextColor(...BRANCO);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.text(title.toUpperCase(), M + 3, y + 4);
    y += 7;
  };

  const drawColHeaders = () => {
    checkY(6);
    const x0 = M + COL_LABEL;
    pdf.setFillColor(...CINZA_CLR);
    pdf.rect(M, y, PW - M * 2, 5, "F");
    pdf.setTextColor(...CINZA);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text("SISTEMA", x0 + COL_W * 0.5, y + 3.5, { align: "center" });
    pdf.text("SIGA",    x0 + COL_W * 1.5, y + 3.5, { align: "center" });
    pdf.text("DIFERENÇA", x0 + COL_W * 2.5, y + 3.5, { align: "center" });
    y += 5;
  };

  const drawRow = (label: string, sist: string, siga: string, dif: string, shade = false) => {
    checkY(ROW_H);
    const x0 = M + COL_LABEL;
    if (shade) {
      pdf.setFillColor(...AZUL_CLR);
      pdf.rect(M, y, PW - M * 2, ROW_H, "F");
    }
    pdf.setDrawColor(200, 200, 200);
    pdf.line(M, y + ROW_H, M + PW - M * 2, y + ROW_H);

    pdf.setTextColor(...PRETO);
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.text(label, M + 2, y + 3.8);

    // SIST
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...AZUL);
    pdf.text(sist, x0 + COL_W * 0.95, y + 3.8, { align: "right" });

    // SIGA
    pdf.setTextColor(...VERDE);
    pdf.text(siga, x0 + COL_W * 1.95, y + 3.8, { align: "right" });

    // DIF
    const difNum = parseFloat(dif.replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, ""));
    if (Math.abs(difNum) < 0.01) pdf.setTextColor(...VERDE);
    else pdf.setTextColor(...VERM);
    pdf.text(dif, x0 + COL_W * 2.95, y + 3.8, { align: "right" });

    y += ROW_H;
  };

  const drawMesAnoRow = (label: string, pMes: string, pAno: string) => {
    // Subheader
    checkY(ROW_H * 3 + 5);
    const x0 = M + COL_LABEL;
    pdf.setFillColor(...CINZA_CLR);
    pdf.rect(M, y, PW - M * 2, ROW_H, "F");
    pdf.setTextColor(...CINZA);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "bold");
    pdf.text(label.toUpperCase(), M + 2, y + 3.8);
    pdf.text("SIST. MÊS", x0 + COL_W * 0.25, y + 3.8, { align: "center" });
    pdf.text("SIST. ANO", x0 + COL_W * 0.75, y + 3.8, { align: "center" });
    pdf.text("SIGA MÊS", x0 + COL_W * 1.25, y + 3.8, { align: "center" });
    pdf.text("SIGA ANO", x0 + COL_W * 1.75, y + 3.8, { align: "center" });
    pdf.text("DIF MÊS",  x0 + COL_W * 2.25, y + 3.8, { align: "center" });
    pdf.text("DIF ANO",  x0 + COL_W * 2.75, y + 3.8, { align: "center" });
    y += ROW_H;

    const vals = [
      n(`${pMes}_sistema`), n(`${pAno}_sistema`),
      n(`${pMes}_siga`),    n(`${pAno}_siga`),
      n(`${pMes}_dif`),     n(`${pAno}_dif`),
    ];

    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...AZUL);
    pdf.text(vals[0], x0 + COL_W * 0.48, y + 3.8, { align: "right" });
    pdf.text(vals[1], x0 + COL_W * 0.98, y + 3.8, { align: "right" });
    pdf.setTextColor(...VERDE);
    pdf.text(vals[2], x0 + COL_W * 1.48, y + 3.8, { align: "right" });
    pdf.text(vals[3], x0 + COL_W * 1.98, y + 3.8, { align: "right" });

    const d1 = parseFloat(vals[4].replace(/\./g, "").replace(",", "."));
    const d2 = parseFloat(vals[5].replace(/\./g, "").replace(",", "."));
    pdf.setTextColor(Math.abs(d1) < 0.01 ? 60 : 180, Math.abs(d1) < 0.01 ? 140 : 30, Math.abs(d1) < 0.01 ? 60 : 30);
    pdf.text(vals[4], x0 + COL_W * 2.48, y + 3.8, { align: "right" });
    pdf.setTextColor(Math.abs(d2) < 0.01 ? 60 : 180, Math.abs(d2) < 0.01 ? 140 : 30, Math.abs(d2) < 0.01 ? 60 : 30);
    pdf.text(vals[5], x0 + COL_W * 2.98, y + 3.8, { align: "right" });

    pdf.setDrawColor(200, 200, 200);
    pdf.line(M, y + ROW_H, M + PW - M * 2, y + ROW_H);
    y += ROW_H + 1;
  };

  // Helper: desenha grade genérica
  const drawGrade = (
    grupos: string[],
    subCols: string[],
    rows: { label: string; vals: string[]; bg?: readonly [number,number,number]; color?: readonly [number,number,number] }[],
    labelW = 28,
    showSubCols = true
  ) => {
    const ncols = subCols.length;
    const GW2 = (PW - M * 2 - labelW) / ncols;
    const colsPerGrupo = Math.floor(ncols / grupos.length);
    const totalRows = showSubCols ? 2 + rows.length : 1 + rows.length;
    checkY(GH * totalRows + 4);

    // Nível 1: grupos
    pdf.setFontSize(7.5); pdf.setFont("helvetica","bold");
    grupos.forEach((g, gi) => {
      pdf.setFillColor(...AZUL);
      pdf.rect(M + labelW + gi * colsPerGrupo * GW2, y, colsPerGrupo * GW2, GH, "F");
      pdf.setTextColor(...BRANCO);
      pdf.text(g, M + labelW + gi * colsPerGrupo * GW2 + colsPerGrupo * GW2 / 2, y + 3.8, { align: "center" });
    });
    pdf.setFillColor(...CINZA_CLR);
    pdf.rect(M, y, labelW, GH, "F");
    y += GH;

    // Nível 2: subCols (opcional)
    if (showSubCols) {
      pdf.setFillColor(...AZUL_CLR);
      pdf.rect(M, y, PW - M * 2, GH, "F");
      pdf.setTextColor(...AZUL); pdf.setFontSize(7); pdf.setFont("helvetica","bold");
      subCols.forEach((c, i) => {
        pdf.text(c, M + labelW + i * GW2 + GW2 / 2, y + 3.8, { align: "center" });
      });
      pdf.setDrawColor(180,200,240);
      for (let i = 1; i <= ncols; i++) pdf.line(M + labelW + i * GW2, y, M + labelW + i * GW2, y + GH);
      y += GH;
    }

    // Linhas
    rows.forEach(row => {
      checkY(GH);
      const bg = row.bg ?? BRANCO;
      pdf.setFillColor(...bg);
      pdf.rect(M, y, PW - M * 2, GH, "F");
      pdf.setTextColor(...CINZA); pdf.setFontSize(7.5); pdf.setFont("helvetica","bold");
      pdf.text(row.label, M + 2, y + 3.8);
      row.vals.forEach((val, i) => {
        const num = parseFloat(val.replace(/\./g,"").replace(",","."));
        const isDif = row.label === "DIF";
        if (isDif) {
          pdf.setTextColor(Math.abs(num) < 0.01 ? 60 : 180, Math.abs(num) < 0.01 ? 140 : 30, Math.abs(num) < 0.01 ? 60 : 30);
        } else {
          pdf.setTextColor(...(row.color ?? PRETO));
        }
        pdf.text(val, M + labelW + i * GW2 + GW2 - 1, y + 3.8, { align: "right" });
      });
      pdf.setDrawColor(200,200,200);
      pdf.line(M, y + GH, M + PW - M * 2, y + GH);
      for (let i = 1; i <= ncols; i++) pdf.line(M + labelW + i * GW2, y, M + labelW + i * GW2, y + GH);
      y += GH;
    });
    y += 2;
  };


  // ══════════════════════════════
  // SEÇÃO 1 — ORÇAMENTO (grade)
  // ══════════════════════════════
  drawSectionHeader("1. Orçamento");

  // Grade Orçamento: FIXADO | Alt.QDD Mês | Anulação QDD Mês | Créd.Adic. Mês | Anu.Créd. Mês | DOTAÇÃO
  // Linha MÊS
  drawGrade(
    ["ALTERAÇÃO DE QDD","CRÉDITOS ADICIONAIS"],
    ["Acréscimo Mês","Redução Mês","Acréscimo Mês","Redução Mês"],
    [
      { label: "SISTEMA", color: AZUL, vals: [n("alt_mes_qdd_sistema"), n("alt_mes_qdd2_sistema"), n("alt_mes_cred_sistema"), n("alt_mes_cred2_sistema")] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: [n("alt_mes_qdd_siga"), n("alt_mes_qdd2_siga"), n("alt_mes_cred_siga"), n("alt_mes_cred2_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals: [n("alt_mes_qdd_dif"), n("alt_mes_qdd2_dif"), n("alt_mes_cred_dif"), n("alt_mes_cred2_dif")] },
    ]
  );

  // Linha ANO
  drawGrade(
    ["ALTERAÇÃO DE QDD","CRÉDITOS ADICIONAIS"],
    ["Acréscimo Ano","Redução Ano","Acréscimo Ano","Redução Ano"],
    [
      { label: "SISTEMA", color: AZUL, vals: [n("alt_ano_qdd_sistema"), n("alt_ano_qdd2_sistema"), n("alt_ano_cred_sistema"), n("alt_ano_cred2_sistema")] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: [n("alt_ano_qdd_siga"), n("alt_ano_qdd2_siga"), n("alt_ano_cred_siga"), n("alt_ano_cred2_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals: [n("alt_ano_qdd_dif"), n("alt_ano_qdd2_dif"), n("alt_ano_cred_dif"), n("alt_ano_cred2_dif")] },
    ]
  );

  // Fixado e Dotação — grade SISTEMA/SIGA/DIF
  drawGrade(
    ["FIXADO","DOTAÇÃO"],
    ["VALOR","VALOR"],
    [
      { label: "SISTEMA", color: AZUL,  bg: BRANCO,    vals: [n("fix_sistema"), n("dot_sistema")] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: [n("fix_siga"),    n("dot_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals:          [n("fix_dif"),    n("dot_dif")] },
    ], 28, false
  );

  // ══════════════════════════════
  // SEÇÃO 2 — DESPESA (grade)
  // ══════════════════════════════
  drawSectionHeader("2. Despesa Orçamentária");

  // Layout da grade:
  // Colunas: Label(30) | Emp.Mês | Emp.Ano | Liq.Mês | Liq.Ano | Pag.Mês | Pag.Ano


  checkY(GH * 4 + 4);

  // Cabeçalho nível 1: grupos
  pdf.setFillColor(...AZUL);
  pdf.rect(gx + GLABEL, y, GW * 2, GH, "F");
  pdf.rect(gx + GLABEL + GW * 2, y, GW * 2, GH, "F");
  pdf.rect(gx + GLABEL + GW * 4, y, GW * 2, GH, "F");
  pdf.setTextColor(...BRANCO);
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("EMPENHADO", gx + GLABEL + GW * 1, y + 3.8, { align: "center" });
  pdf.text("LIQUIDADO",  gx + GLABEL + GW * 3, y + 3.8, { align: "center" });
  pdf.text("PAGAMENTO",  gx + GLABEL + GW * 5, y + 3.8, { align: "center" });
  // bordas verticais entre grupos
  pdf.setDrawColor(255,255,255);
  pdf.line(gx + GLABEL + GW * 2, y, gx + GLABEL + GW * 2, y + GH);
  pdf.line(gx + GLABEL + GW * 4, y, gx + GLABEL + GW * 4, y + GH);
  y += GH;

  // Cabeçalho nível 2: Mês / Ano
  pdf.setFillColor(...AZUL_CLR);
  pdf.rect(gx, y, PW - M * 2, GH, "F");
  pdf.setTextColor(...AZUL);
  pdf.setFontSize(7);
  pdf.setFont("helvetica", "bold");
  // label vazio
  const cols2 = ["Mês","Ano","Mês","Ano","Mês","Ano"];
  cols2.forEach((c, i) => {
    pdf.text(c, gx + GLABEL + GW * i + GW / 2, y + 3.8, { align: "center" });
  });
  pdf.setDrawColor(180, 200, 240);
  for (let i = 1; i <= 6; i++) pdf.line(gx + GLABEL + GW * i, y, gx + GLABEL + GW * i, y + GH);
  y += GH;

  // Linhas: SISTEMA, SIGA, DIF
  const gRows = [
    { label: "SISTEMA", vals: [
      n("emp_mes_sistema"), n("emp_ano_sistema"),
      n("liq_mes_sistema"), n("liq_ano_sistema"),
      n("pag_mes_sistema"), n("pag_ano_sistema"),
    ], color: AZUL, bg: BRANCO },
    { label: "SIGA", vals: [
      n("emp_mes_siga"), n("emp_ano_siga"),
      n("liq_mes_siga"), n("liq_ano_siga"),
      n("pag_mes_siga"), n("pag_ano_siga"),
    ], color: VERDE, bg: VERDE_CLR },
    { label: "DIF", vals: [
      n("emp_mes_dif"), n("emp_ano_dif"),
      n("liq_mes_dif"), n("liq_ano_dif"),
      n("pag_mes_dif"), n("pag_ano_dif"),
    ], color: AMAR, bg: AMAR_CLR },
  ];

  gRows.forEach(row => {
    checkY(GH);
    pdf.setFillColor(...row.bg);
    pdf.rect(gx, y, PW - M * 2, GH, "F");
    pdf.setTextColor(...CINZA);
    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "bold");
    pdf.text(row.label, gx + 2, y + 3.8);
    row.vals.forEach((val, i) => {
      const num = parseFloat(val.replace(/\./g, "").replace(",", "."));
      if (row.label === "DIF") {
        pdf.setTextColor(Math.abs(num) < 0.01 ? 60 : 180, Math.abs(num) < 0.01 ? 140 : 30, Math.abs(num) < 0.01 ? 60 : 30);
      } else {
        pdf.setTextColor(...row.color);
      }
      pdf.text(val, gx + GLABEL + GW * i + GW - 1, y + 3.8, { align: "right" });
    });
    pdf.setDrawColor(200, 200, 200);
    pdf.line(gx, y + GH, gx + PW - M * 2, y + GH);
    for (let i = 1; i <= 6; i++) pdf.line(gx + GLABEL + GW * i, y, gx + GLABEL + GW * i, y + GH);
    y += GH;
  });

  y += 3;

  // Restos a Pagar — DIF abaixo do SIGA
  drawGrade(
    ["PROCESSADO","NÃO PROCESSADO","SIGA"],
    ["VALOR","VALOR","VALOR"],
    [
      { label: "SISTEMA", color: AZUL,  bg: BRANCO,    vals: [n("proc_sistema"), n("naoproc_sistema"), ""] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: ["", "", n("proc_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals: ["", "", n("proc_dif")] },
    ], 28, false
  );

  // Saldo Disponível — grade SISTEMA/SIGA/DIF
  drawSectionHeader("Saldo Disponível");
  drawGrade(
    ["SALDO DISPONÍVEL"],
    ["VALOR"],
    [
      { label: "SISTEMA", color: AZUL,  bg: BRANCO,    vals: [n("saldo_disp_sistema")] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: [n("saldo_disp_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals: [n("saldo_disp_dif")] },
    ], 28, false
  );

  // ══════════════════════════════
  // SEÇÃO 3 — RAZÃO (grade)
  // ══════════════════════════════
  drawSectionHeader("3. Razão");
  drawGrade(
    ["SALDO ANTERIOR","DESPESA","RECEITA","SALDO ATUAL"],
    ["Devedor","Credor","Mês","Ano","Mês","Ano","Devedor","Credor"],
    [
      { label: "SISTEMA", color: AZUL, vals: [
        n("raz_saldo_dev_sistema"), n("raz_saldo_cred_sistema"),
        n("raz_desp_mes_sistema"),  n("raz_desp_ano_sistema"),
        n("raz_rec_mes_sistema"),   n("raz_rec_ano_sistema"),
        n("raz_devedor_sistema"),   n("raz_credor_sistema"),
      ]},
      { label: "SIGA", color: VERDE, bg: VERDE_CLR, vals: [
        n("raz_saldo_dev_siga"), n("raz_saldo_cred_siga"),
        n("raz_desp_mes_siga"),  n("raz_desp_ano_siga"),
        n("raz_rec_mes_siga"),   n("raz_rec_ano_siga"),
        n("raz_devedor_siga"),   n("raz_credor_siga"),
      ]},
      { label: "DIF", bg: AMAR_CLR, vals: [
        n("raz_saldo_dev_dif"), n("raz_saldo_cred_dif"),
        n("raz_desp_mes_dif"),  n("raz_desp_ano_dif"),
        n("raz_rec_mes_dif"),   n("raz_rec_ano_dif"),
        n("raz_devedor_dif"),   n("raz_credor_dif"),
      ]},
    ]
  );

  // ══════════════════════════════
  // SEÇÃO 4 — CONCILIAÇÃO BANCÁRIA (1 coluna)
  // ══════════════════════════════
  drawSectionHeader("4. Conciliação Bancária");
  drawGrade(
    ["CONCILIAÇÃO"],
    ["VALOR"],
    [
      { label: "SISTEMA", color: AZUL,  bg: BRANCO,    vals: [n("conc_sistema")] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: [n("conc_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals: [n("conc_dif")] },
    ], 28, false
  );

  // ══════════════════════════════
  // SEÇÃO 5 — MOVIMENTAÇÃO BANCÁRIA (2 colunas)
  // ══════════════════════════════
  drawSectionHeader("5. Movimentação Bancária");
  drawGrade(
    ["CRÉDITO","DÉBITO"],
    ["VALOR","VALOR"],
    [
      { label: "SISTEMA", color: AZUL,  bg: BRANCO,    vals: [n("mov_cred_sistema"), n("mov_deb_sistema")] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: [n("mov_cred_siga"),    n("mov_deb_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals: [n("mov_cred_dif"),    n("mov_deb_dif")] },
    ], 28, false
  );

  // ══════════════════════════════
  // SEÇÃO 6 — DEMONSTRATIVOS EXTRAS
  // ══════════════════════════════
  drawSectionHeader("6. Demonstrativos Extras");
  drawGrade(
    ["INGRESSO","DESEMBOLSO"],
    ["Mês","Ano","Mês","Ano"],
    [
      { label: "SISTEMA", color: AZUL,  bg: BRANCO,    vals: [n("ing_mes_sistema"), n("ing_ano_sistema"), n("des_mes_sistema"), n("des_ano_sistema")] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: [n("ing_mes_siga"),    n("ing_ano_siga"),    n("des_mes_siga"),    n("des_ano_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals: [n("ing_mes_dif"),    n("ing_ano_dif"),    n("des_mes_dif"),    n("des_ano_dif")] },
    ]
  );

  // ══════════════════════════════
  // SEÇÃO 7 — RECEITA (Mês | Ano | Para Mais | Para Menos)
  // ══════════════════════════════
  drawSectionHeader("7. Receita");
  drawColHeaders();
  drawGrade(
    ["RECEITA FIXADA"],
    ["SISTEMA","SIGA","DIFERENÇA"],
    [
      { label: "SISTEMA", color: AZUL,  bg: BRANCO,    vals: [n("rec_fix_sistema"), "", ""] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: ["", n("rec_fix_siga"), ""] },
      { label: "DIF",     bg: AMAR_CLR, vals: ["", "", n("rec_fix_dif")] },
    ], 28, false
  );
  drawGrade(
    ["MÊS","ANO","PARA MAIS","PARA MENOS"],
    ["VALOR","VALOR","VALOR","VALOR"],
    [
      { label: "SISTEMA", color: AZUL,  bg: BRANCO,    vals: [n("rec_mes_sistema"), n("rec_ano_sistema"), n("rec_mais_sist"),  n("rec_menos_sist")] },
      { label: "SIGA",    color: VERDE, bg: VERDE_CLR, vals: [n("rec_mes_siga"),    n("rec_ano_siga"),    n("rec_mais_siga"),  n("rec_menos_siga")] },
      { label: "DIF",     bg: AMAR_CLR, vals: [n("rec_mes_dif"),    n("rec_ano_dif"),    n("rec_mais_dif"),   n("rec_menos_dif")] },
    ]
  );

  // ── Rodapé em todas as páginas ──
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFillColor(...AZUL);
    pdf.rect(M, PH - 8, PW - M * 2, 6, "F");
    pdf.setTextColor(...BRANCO);
    pdf.setFontSize(7);
    pdf.setFont("helvetica", "normal");
    pdf.text("SCPC — Sistema de Conferência de Prestação de Contas", M + 2, PH - 4);
    pdf.text(`Página ${p} de ${totalPages}`, PW - M - 2, PH - 4, { align: "right" });
  }

  // Nome do arquivo
  const comp = tipo === "mensal" ? competencia.replace("/", "-") : consolidado;
  const fileName = `SCPC — ${municipio} — ${entidade} — ${comp}.pdf`;
  pdf.save(fileName);
};
