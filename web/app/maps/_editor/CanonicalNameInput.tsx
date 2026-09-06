"use client";

import { useState } from "react";
import { suggestCanonical } from "@/lib/graph/canonical";
import { CANONICAL_POS_LIST_ID } from "./CanonicalPositionsDatalist";

/**
 * Aviso suave: si `value` se parece a una posición del vocabulario canónico
 * (traducción, abreviatura, otro orden, errata), ofrece cambiarla por el nombre
 * estándar. No bloquea nada — el usuario puede ignorarlo y guardar su nombre.
 */
export function CanonicalHint({
  value,
  onUse,
}: {
  value: string;
  onUse: (name: string) => void;
}) {
  const suggestion = suggestCanonical(value);
  if (!suggestion) return null;
  return (
    <p className="text-[11px] leading-snug text-amber-700 dark:text-amber-500">
      Nombre estándar:{" "}
      <button
        type="button"
        onClick={() => onUse(suggestion)}
        className="font-semibold underline underline-offset-2"
      >
        {suggestion}
      </button>
      ?
    </p>
  );
}

/**
 * Input (controlado) para el nombre de una posición: datalist canónico para
 * autocompletar + `CanonicalHint` debajo. Reemplaza a un `<input name="name">`
 * suelto en los formularios de crear/editar posición.
 */
export default function CanonicalNameInput({
  name = "name",
  defaultValue = "",
  placeholder,
  required,
  autoFocus,
  className,
}: {
  name?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string;
}) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div className="flex flex-col gap-1">
      <input
        name={name}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        list={CANONICAL_POS_LIST_ID}
        className={className}
      />
      <CanonicalHint value={val} onUse={setVal} />
    </div>
  );
}
