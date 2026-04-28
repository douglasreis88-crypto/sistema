import { useState } from "react";

interface RowProps {
  badge: "sist" | "siga" | "dif" | "fix" | "dot" | "ajuste";
  label?: string;
  id: string;
  readOnly?: boolean;
  defaultValue?: string;
}

const badgeLabels: Record<string, string> = {
  sist: "Sist.",
  siga: "SIGA",
  dif: "DIF",
  fix: "Sist.",
  dot: "Sist.",
  ajuste: "Ajuste (+/-)",
};

export function ValRow({ badge, label, id, readOnly, defaultValue = "" }: RowProps) {
  return (
    <div className="input-row">
      <span className={`badge badge-${badge}`}>{label ?? badgeLabels[badge]}</span>
      <input
        type="text"
        className={`val-input${readOnly ? " calc" : ""}`}
        id={id}
        placeholder="0,00"
        readOnly={readOnly}
        defaultValue={readOnly ? defaultValue || "0,00" : undefined}
      />
    </div>
  );
}

export function SistSigaDif({ prefix, badges = ["sist", "siga", "dif"] as const, readOnlySist, readOnlySiga, readOnlyDif }: {
  prefix: string;
  badges?: ReadonlyArray<"sist" | "siga" | "dif" | "fix" | "dot">;
  readOnlySist?: boolean;
  readOnlySiga?: boolean;
  readOnlyDif?: boolean;
}) {
  const isReadOnly = (b: string) => {
    if (b === "sist") return readOnlySist ?? false;
    if (b === "siga") return readOnlySiga ?? false;
    if (b === "dif") return readOnlyDif ?? true;
    return false;
  };
  return (
    <>
      {badges.map((b) => (
        <ValRow
          key={b}
          badge={b}
          id={`${prefix}_${b === "sist" ? "sistema" : b === "siga" ? "siga" : "dif"}`}
          readOnly={isReadOnly(b)}
          title={
            b === "siga" && readOnlySiga
              ? "Calculado automaticamente"
              : b === "sist" && readOnlySist
              ? "Calculado automaticamente"
              : undefined
          }
        />
      ))}
    </>
  );
}

export function AdjustRow({ id }: { id: string }) {
  return (
    <div className="adjust-row">
      <div className="input-row">
        <span className="badge badge-ajuste">Ajuste (+/-)</span>
        <input type="text" className="val-input" id={id} placeholder="0,00" />
      </div>
    </div>
  );
}

export function AltBlock({ title, prefix }: { title: string; prefix: string }) {
  return (
    <div className="alt-block">
      <div className="alt-block-title">{title}</div>
      <div className="alt-block-body">
        <SistSigaDif prefix={prefix} />
      </div>
    </div>
  );
}

export function CategoryChip({ id, label }: { id: string; label: string }) {
  const [checked, setChecked] = useState(false);
  return (
    <label className={`cat-chip${checked ? " checked" : ""}`} data-cat-id={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(event) => setChecked(event.target.checked)}
      />
      <span className="cat-dot" />
      {label}
    </label>
  );
}
