import { supabase } from "@/integrations/supabase/client";

export type EntityType = "prefeitura" | "camara" | "descentralizado";

export const ENTITY_LABELS: Record<EntityType, string> = {
  prefeitura: "PREFEITURA",
  camara: "CÂMARA",
  descentralizado: "DESCENTRALIZADA",
};

// Mapeia o valor escolhido (entidade do select) -> tipo da permissão.
export function entidadeToType(entidade: string): EntityType | null {
  const v = (entidade || "").toUpperCase();
  if (v.includes("PREFEITURA")) return "prefeitura";
  if (v.includes("CAMARA") || v.includes("CÂMARA")) return "camara";
  if (v.includes("DESCENTRALIZ")) return "descentralizado";
  return null;
}

export interface UserPermissions {
  entidades: EntityType[];
  municipiosPorEntidade: Record<EntityType, string[]>;
}

export const EMPTY_PERMISSIONS: UserPermissions = {
  entidades: [],
  municipiosPorEntidade: { prefeitura: [], camara: [], descentralizado: [] },
};

export async function loadPermissions(userId: string): Promise<UserPermissions> {
  const { data, error } = await supabase
    .from("user_permissions")
    .select("entidades, municipios_por_entidade")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return EMPTY_PERMISSIONS;
  const ents = (data.entidades as EntityType[]) ?? [];
  const mapRaw = (data.municipios_por_entidade as Record<string, string[]>) ?? {};
  return {
    entidades: ents,
    municipiosPorEntidade: {
      prefeitura: mapRaw.prefeitura ?? [],
      camara: mapRaw.camara ?? [],
      descentralizado: mapRaw.descentralizado ?? [],
    },
  };
}

export async function savePermissions(userId: string, perms: UserPermissions) {
  const { error } = await supabase
    .from("user_permissions")
    .upsert(
      {
        user_id: userId,
        entidades: perms.entidades,
        municipios_por_entidade: perms.municipiosPorEntidade as unknown as Record<string, string[]>,
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
}
