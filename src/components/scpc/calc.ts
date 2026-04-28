// Lógica de cálculos automáticos do SCPC
// - Converte texto BR (1.234,56) <-> número
// - Recalcula DIFs (Sist - SIGA) aplicando ajustes quando existirem
// - Calcula totais amarelos (sec 3.1 e Receita Para Mais/Menos)
// - Aplica cores de alerta: zero -> verde; diferente de zero -> vermelho

export const fmtBR = (n: number): string => {
  if (!isFinite(n)) return "0,00";
  // Arredonda para 2 casas para evitar -0,00 por erro de ponto flutuante
  const rounded = Math.round(n * 100) / 100;
  if (rounded === 0) return "0,00";
  const abs = Math.abs(rounded);
  const s = abs.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return rounded < 0 ? `-${s}` : s;
};

export const parseBR = (raw: string | null | undefined): number => {
  if (!raw) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  // remove pontos de milhar, troca vírgula por ponto
  const norm = s.replace(/\./g, "").replace(/,/g, ".").replace(/[^\d.\-]/g, "");
  const n = parseFloat(norm);
  return isFinite(n) ? n : 0;
};

const v = (id: string): number => {
  const el = document.getElementById(id) as HTMLInputElement | null;
  return el ? parseBR(el.value || el.defaultValue) : 0;
};

const setCalc = (id: string, value: number) => {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.value = fmtBR(value);
  // cor de alerta para campos DIF
  if (el.classList.contains("calc") || el.dataset.role === "dif") {
    if (Math.abs(value) < 0.005) {
      el.classList.add("dif-ok");
      el.classList.remove("dif-bad");
    } else {
      el.classList.add("dif-bad");
      el.classList.remove("dif-ok");
    }
  }
};

const setRaw = (id: string, value: number, klass?: string) => {
  const el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) return;
  el.value = fmtBR(value);
  if (klass === "amarelo") {
    if (Math.abs(value) < 0.005) {
      el.classList.add("dif-ok-amarelo");
      el.classList.remove("dif-bad-amarelo");
    } else {
      el.classList.add("dif-bad-amarelo");
      el.classList.remove("dif-ok-amarelo");
    }
  }
};

// Calcula DIF padrão Sist - SIGA para um prefixo (id_<sistema>, id_<siga>, id_<dif>)
const calcDif = (prefix: string) => {
  setCalc(`${prefix}_dif`, v(`${prefix}_sistema`) - v(`${prefix}_siga`));
};

// DIF com ajuste: (Sist + ajuste) - SIGA
const calcDifAjuste = (prefix: string) => {
  const ajuste = v(`${prefix}_ajuste`);
  setCalc(`${prefix}_dif`, v(`${prefix}_sistema`) + ajuste - v(`${prefix}_siga`));
};

// Lista de prefixos com SistSigaDif simples (sem ajuste)
const PREFIXES_SIMPLE = [
  // 1. Alteração orçamentária - mês
  "alt_mes_qdd", "alt_mes_qdd2", "alt_mes_cred", "alt_mes_cred2",
  // 1. Alteração orçamentária - ano
  "alt_ano_qdd", "alt_ano_qdd2", "alt_ano_cred", "alt_ano_cred2",
  // 2. Despesa - Restos a Pagar
  "proc", "naoproc",
  // 2. Saldo disponível
  "saldo_disp",
  // 3. Razão
  "raz_devedor", "raz_credor", "raz_desp_mes", "raz_desp_ano",
  "raz_rec_mes", "raz_rec_ano", "raz_saldo_dev", "raz_saldo_cred",
  // 4. Conciliação
  "conc",
  // 5. Movimentação bancária
  "mov_cred", "mov_deb",
  // 6. Demonstrativos extras
  "ing_mes", "ing_ano", "des_mes", "des_ano",
];

// Prefixos com ajuste (Despesa - Empenhado/Liquidado/Pagamento - mês e ano)
const PREFIXES_AJUSTE = [
  "emp_mes", "emp_ano",
  "liq_mes", "liq_ano",
  "pag_mes", "pag_ano",
];

// Restos a Pagar e Saldo Disponível (sec 2) - campos automáticos
const recalcRestosSaldo = () => {
  // SIGA de Restos a Pagar = Empenhado ANO SIGA - Pagamento ANO SIGA
  const sigaEmpAno = v("emp_ano_siga");
  const sigaPagAno = v("pag_ano_siga");
  const sigaRestos = sigaEmpAno - sigaPagAno;

  // SIGA único exibido em proc_siga
  const elProcSiga = document.getElementById("proc_siga") as HTMLInputElement | null;
  if (elProcSiga) elProcSiga.value = fmtBR(sigaRestos);

  // DIF = (Processado SIST + Não Processado SIST) - SIGA
  const sistTotal = v("proc_sistema") + v("naoproc_sistema");
  const difVal = sistTotal - sigaRestos;
  const elDif = document.getElementById("proc_dif") as HTMLInputElement | null;
  if (elDif) {
    elDif.value = fmtBR(difVal);
    if (Math.abs(difVal) < 0.005) {
      elDif.classList.add("dif-ok"); elDif.classList.remove("dif-bad");
    } else {
      elDif.classList.add("dif-bad"); elDif.classList.remove("dif-ok");
    }
  }

  // SALDO DISPONÍVEL
  // SIST = Dotação SIST - Empenhado ANO SIST
  const saldoSist = v("dot_sistema") - v("emp_ano_sistema");
  // SIGA = Dotação SIGA - Empenhado ANO SIGA
  const saldoSiga = v("dot_siga") - sigaEmpAno;

  const elSaldoSist = document.getElementById("saldo_disp_sistema") as HTMLInputElement | null;
  if (elSaldoSist) elSaldoSist.value = fmtBR(saldoSist);

  const elSaldoSiga = document.getElementById("saldo_disp_siga") as HTMLInputElement | null;
  if (elSaldoSiga) elSaldoSiga.value = fmtBR(saldoSiga);

  setCalc("saldo_disp_dif", saldoSist - saldoSiga);
};

// Fixado e Dotação (sec 1)
// Dotação SIST = Fixado SIST + Alt.QDD SIST - Anulação QDD SIST + Créd.Adicionais SIST - Anulação Créd. SIST
// Dotação SIGA = Fixado SIGA + Alt.QDD SIGA - Anulação QDD SIGA + Créd.Adicionais SIGA - Anulação Créd. SIGA
const recalcFixDot = () => {
  setCalc("fix_dif", v("fix_sistema") - v("fix_siga"));

  // Calcula dotação sistema automaticamente
  const dotSist =
    v("fix_sistema")
    + v("alt_ano_qdd_sistema")  - v("alt_ano_qdd2_sistema")
    + v("alt_ano_cred_sistema") - v("alt_ano_cred2_sistema");

  // Calcula dotação siga automaticamente
  const dotSiga =
    v("fix_siga")
    + v("alt_ano_qdd_siga")  - v("alt_ano_qdd2_siga")
    + v("alt_ano_cred_siga") - v("alt_ano_cred2_siga");

  // Aplica nos campos (somente leitura)
  const elSist = document.getElementById("dot_sistema") as HTMLInputElement | null;
  if (elSist) elSist.value = fmtBR(dotSist);

  const elSiga = document.getElementById("dot_siga") as HTMLInputElement | null;
  if (elSiga) elSiga.value = fmtBR(dotSiga);

  setCalc("dot_dif", dotSist - dotSiga);
};

// 3.1 Sintéticas: para cada conta i (1..8), DIF dev/cred = SIST - SIGA, total amarelo = |dif_dev| + |dif_cred|
const recalcSinteticas = () => {
  for (let i = 1; i <= 8; i++) {
    const devDif = v(`raz${i}_dev_sist_30`) - v(`raz${i}_dev_siga_31`);
    const credDif = v(`raz${i}_cred_sist_30`) - v(`raz${i}_cred_siga_31`);
    setCalc(`raz${i}_dev_dif_32`, devDif);
    setCalc(`raz${i}_cred_dif_32`, credDif);
    setRaw(`raz${i}_total_amarelo`, Math.abs(devDif) + Math.abs(credDif), "amarelo");
  }
};

// 7. Receita
const recalcReceita = () => {
  // Receita Fixada
  setCalc("rec_fix_dif", v("rec_fix_sistema") - v("rec_fix_siga"));
  // Mês e Ano (com ajuste)
  for (const p of ["mes", "ano"] as const) {
    const aj = v(`rec_${p}_ajuste`);
    setCalc(`rec_${p}_dif`, v(`rec_${p}_sistema`) + aj - v(`rec_${p}_siga`));
  }
  // Para Mais / Para Menos
  const maisDif = v("rec_mais_sist") - v("rec_mais_siga");
  const menosDif = v("rec_menos_sist") - v("rec_menos_siga");
  setCalc("rec_mais_dif", maisDif);
  setCalc("rec_menos_dif", menosDif);
  setRaw("rec_total_amarelo", Math.abs(maisDif) + Math.abs(menosDif), "amarelo");
};

export const recalcAll = () => {
  PREFIXES_SIMPLE.forEach(calcDif);
  PREFIXES_AJUSTE.forEach(calcDifAjuste);
  recalcFixDot();
  recalcRestosSaldo();
  recalcSinteticas();
  recalcReceita();
};

// Formata o input ao perder foco (vírgula brasileira)
export const formatOnBlur = (el: HTMLInputElement) => {
  if (!el.value.trim()) return;
  el.value = fmtBR(parseBR(el.value));
};
