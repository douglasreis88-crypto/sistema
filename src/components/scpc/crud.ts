// Coleta e aplica os dados do formulário SCPC para persistência.
import { supabase } from "@/integrations/supabase/client";

// IDs de todos os campos monetários e auxiliares do formulário
const FIELD_IDS: string[] = [
  // 1. Alteração orçamentária - mês
  "alt_mes_qdd_sistema", "alt_mes_qdd_siga", "alt_mes_qdd_dif",
  "alt_mes_qdd2_sistema", "alt_mes_qdd2_siga", "alt_mes_qdd2_dif",
  "alt_mes_cred_sistema", "alt_mes_cred_siga", "alt_mes_cred_dif",
  "alt_mes_cred2_sistema", "alt_mes_cred2_siga", "alt_mes_cred2_dif",
  // 1. Alteração orçamentária - ano
  "alt_ano_qdd_sistema", "alt_ano_qdd_siga", "alt_ano_qdd_dif",
  "alt_ano_qdd2_sistema", "alt_ano_qdd2_siga", "alt_ano_qdd2_dif",
  "alt_ano_cred_sistema", "alt_ano_cred_siga", "alt_ano_cred_dif",
  "alt_ano_cred2_sistema", "alt_ano_cred2_siga", "alt_ano_cred2_dif",
  // Fixado / Dotação
  "fix_sistema", "fix_siga", "fix_dif",
  "dot_sistema", "dot_siga", "dot_dif",
  // 2. Despesa - emp/liq/pag (mês e ano com ajuste)
  "emp_mes_ajuste", "emp_mes_sistema", "emp_mes_siga", "emp_mes_dif",
  "emp_ano_ajuste", "emp_ano_sistema", "emp_ano_siga", "emp_ano_dif",
  "liq_mes_ajuste", "liq_mes_sistema", "liq_mes_siga", "liq_mes_dif",
  "liq_ano_ajuste", "liq_ano_sistema", "liq_ano_siga", "liq_ano_dif",
  "pag_mes_ajuste", "pag_mes_sistema", "pag_mes_siga", "pag_mes_dif",
  "pag_ano_ajuste", "pag_ano_sistema", "pag_ano_siga", "pag_ano_dif",
  // Restos a pagar
  "proc_sistema", "proc_siga", "proc_dif",
  "naoproc_sistema", "naoproc_siga", "naoproc_dif",
  // Saldo
  "saldo_disp_sistema", "saldo_disp_siga", "saldo_disp_dif",
  // 3. Razão
  "raz_devedor_sistema", "raz_devedor_siga", "raz_devedor_dif",
  "raz_credor_sistema", "raz_credor_siga", "raz_credor_dif",
  "raz_desp_mes_sistema", "raz_desp_mes_siga", "raz_desp_mes_dif",
  "raz_desp_ano_sistema", "raz_desp_ano_siga", "raz_desp_ano_dif",
  "raz_rec_mes_sistema", "raz_rec_mes_siga", "raz_rec_mes_dif",
  "raz_rec_ano_sistema", "raz_rec_ano_siga", "raz_rec_ano_dif",
  "raz_saldo_dev_sistema", "raz_saldo_dev_siga", "raz_saldo_dev_dif",
  "raz_saldo_cred_sistema", "raz_saldo_cred_siga", "raz_saldo_cred_dif",
  // 4. Conciliação
  "conc_sistema", "conc_siga", "conc_dif",
  // 5. Movimentação bancária
  "mov_cred_sistema", "mov_cred_siga", "mov_cred_dif",
  "mov_deb_sistema", "mov_deb_siga", "mov_deb_dif",
  // 6. Demonstrativos extras
  "ing_mes_sistema", "ing_mes_siga", "ing_mes_dif",
  "ing_ano_sistema", "ing_ano_siga", "ing_ano_dif",
  "des_mes_sistema", "des_mes_siga", "des_mes_dif",
  "des_ano_sistema", "des_ano_siga", "des_ano_dif",
  // 7. Receita
  "rec_fix_sistema", "rec_fix_siga", "rec_fix_dif",
  "rec_mes_ajuste", "rec_mes_sistema", "rec_mes_siga", "rec_mes_dif",
  "rec_ano_ajuste", "rec_ano_sistema", "rec_ano_siga", "rec_ano_dif",
  "rec_mais_sist", "rec_menos_sist",
  "rec_mais_siga", "rec_menos_siga",
  "rec_mais_dif", "rec_menos_dif",
  "rec_total_amarelo",
];

// 3.1 sintéticas
for (let i = 1; i <= 8; i++) {
  FIELD_IDS.push(
    `raz${i}_dev_sist_30`, `raz${i}_cred_sist_30`,
    `raz${i}_dev_siga_31`, `raz${i}_cred_siga_31`,
    `raz${i}_dev_dif_32`, `raz${i}_cred_dif_32`,
    `raz${i}_total_amarelo`,
  );
}

const CATEGORIA_IDS = [
  "cat_desp_pessoal", "cat_rec_pessoal", "cat_rcl", "cat_duodecimo",
  "cat_licitacao", "cat_disp_inex", "cat_contratos", "cat_ad_contratos",
  "cat_pessoal", "cat_combustivel", "cat_publicidade", "cat_t_parceria",
];

export interface ConferencePayload {
  tipo: "mensal" | "consolidado";
  municipio: string;
  entidade: string;
  competencia: string;
  consolidado: string;
  categorias: Record<string, boolean>;
  dados: Record<string, string>;
  anotacoes: string;
}

export function collectForm(
  tipo: "mensal" | "consolidado",
  municipio: string,
  entidade: string,
  competencia: string,
  consolidado: string,
): ConferencePayload {
  const dados: Record<string, string> = {};
  for (const id of FIELD_IDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) dados[id] = el.value || "";
  }
  const categorias: Record<string, boolean> = {};
  for (const id of CATEGORIA_IDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    categorias[id] = !!el?.checked;
  }
  const notasEl = document.querySelector(".notas-area") as HTMLTextAreaElement | null;
  return {
    tipo,
    municipio,
    entidade,
    competencia,
    consolidado,
    categorias,
    dados,
    anotacoes: notasEl?.value || "",
  };
}

export function applyToForm(payload: ConferencePayload) {
  for (const [id, val] of Object.entries(payload.dados || {})) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.value = val;
  }
  for (const id of CATEGORIA_IDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.checked = !!payload.categorias?.[id];
    // toggle visual da label .cat-chip
    const label = el?.closest(".cat-chip");
    if (label) label.classList.toggle("checked", !!payload.categorias?.[id]);
  }
  const notasEl = document.querySelector(".notas-area") as HTMLTextAreaElement | null;
  if (notasEl) notasEl.value = payload.anotacoes || "";
}

export function clearForm() {
  for (const id of FIELD_IDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) continue;
    if (el.readOnly) {
      el.value = "0,00";
      el.classList.remove("dif-bad", "dif-bad-amarelo");
      el.classList.add("dif-ok");
    } else {
      el.value = "";
    }
  }
  for (const id of CATEGORIA_IDS) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el) el.checked = false;
    const label = el?.closest(".cat-chip");
    if (label) label.classList.remove("checked");
  }
  const notasEl = document.querySelector(".notas-area") as HTMLTextAreaElement | null;
  if (notasEl) notasEl.value = "";
}

export async function findDuplicate(
  payload: ConferencePayload,
  excludeId?: string,
): Promise<boolean> {
  // Regra: bloqueia apenas duplicatas EXATAS
  // (mesmo tipo + mesmo município + mesma entidade + mesma competência/ano)
  //
  // Para Prefeitura: mensal 2026/01 + consolidado 2026 são tipos diferentes →
  // já são permitidos naturalmente por esta verificação.
  let q = supabase
    .from("conferences")
    .select("id")
    .eq("tipo", payload.tipo)
    .ilike("municipio", payload.municipio || "")
    .ilike("entidade", payload.entidade || "");

  if (payload.tipo === "mensal") {
    // Mensal: chave única = competencia exata (AAAA/MM)
    q = q.eq("competencia", payload.competencia || "");
  } else {
    // Consolidado: há dois subtipos —
    //   • Consolidado Mensal  → tem competencia (AAAA/MM) preenchida → chave = competencia
    //   • Consolidado Anual   → só tem consolidado (AAAA) → chave = consolidado
    if (payload.competencia) {
      q = q.eq("competencia", payload.competencia);
    } else {
      q = q.eq("consolidado", payload.consolidado || "");
    }
  }

  if (excludeId) q = q.neq("id", excludeId);
  const { data, error } = await q.limit(1);
  if (error) throw error;
  return !!(data && data.length > 0);
}


export async function saveConference(payload: ConferencePayload, userId: string) {
  if (await findDuplicate(payload)) {
    const isPrefeitura = payload.entidade?.toLowerCase().includes("prefeitura");
    const ano = payload.tipo === "mensal"
      ? (payload.competencia || "").split("/")[0]
      : payload.consolidado || "";
    throw new Error(
      isPrefeitura
        ? `Já existe registro ${payload.tipo} para ${payload.entidade} / ${payload.municipio} na competência ${payload.tipo === "mensal" ? payload.competencia : payload.consolidado}.`
        : `Já existe um registro para ${payload.entidade} / ${payload.municipio} no ano ${ano}. Câmara e Descentralizado permitem apenas um registro por ano.`,
    );
  }
  const { data, error } = await supabase
    .from("conferences")
    .insert({
      tipo: payload.tipo,
      municipio: payload.municipio || null,
      entidade: payload.entidade?.toUpperCase() || null,
      competencia: payload.competencia || null,
      consolidado: payload.consolidado || null,
      categorias: payload.categorias,
      dados: payload.dados,
      anotacoes: payload.anotacoes,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateConference(id: string, payload: ConferencePayload) {
  if (await findDuplicate(payload, id)) {
    const isPrefeitura = payload.entidade?.toLowerCase().includes("prefeitura");
    const ano = payload.tipo === "mensal"
      ? (payload.competencia || "").split("/")[0]
      : payload.consolidado || "";
    throw new Error(
      isPrefeitura
        ? `Já existe outro registro ${payload.tipo} para ${payload.entidade} / ${payload.municipio} na competência ${payload.tipo === "mensal" ? payload.competencia : payload.consolidado}.`
        : `Já existe outro registro para ${payload.entidade} / ${payload.municipio} no ano ${ano}.`,
    );
  }
  const { data, error } = await supabase
    .from("conferences")
    .update({
      tipo: payload.tipo,
      municipio: payload.municipio || null,
      entidade: payload.entidade || null,
      competencia: payload.competencia || null,
      consolidado: payload.consolidado || null,
      categorias: payload.categorias,
      dados: payload.dados,
      anotacoes: payload.anotacoes,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteConference(id: string) {
  const { error } = await supabase.from("conferences").delete().eq("id", id);
  if (error) throw error;
}

export async function listConferences(filters: {
  municipio?: string;
  entidade?: string;
  competencia?: string;
  tipo?: string;
}) {
  let q = supabase
    .from("conferences")
    .select("id, tipo, municipio, entidade, competencia, consolidado, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  
  if (filters.municipio) q = q.ilike("municipio", filters.municipio);
  if (filters.entidade) q = q.ilike("entidade", filters.entidade);
  if (filters.tipo) q = q.eq("tipo", filters.tipo);
  if (filters.competencia) q = q.ilike("competencia", `%${filters.competencia}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function fetchConference(id: string) {
  const { data, error } = await supabase
    .from("conferences")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}
