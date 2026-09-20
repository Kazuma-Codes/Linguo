"use client";

export interface CulturalFootnotesData {
  humor_explanation?: string;
  idiom_breakdown?: string;
  etiquette_warning?: string;
}

interface CulturalFootnotesProps {
  footnotes?: CulturalFootnotesData | null;
}

export function CulturalFootnotes({ footnotes }: CulturalFootnotesProps) {
  if (!footnotes) return null;
  const { humor_explanation, idiom_breakdown, etiquette_warning } = footnotes;
  if (!humor_explanation && !idiom_breakdown && !etiquette_warning) return null;

  return (
    <div className="mt-2.5 text-xs bg-black/25 dark:bg-black/40 p-2.5 rounded-xl border border-white/10 space-y-1 text-white">
      <p className="font-bold text-amber-300 flex items-center gap-1">🧠 Cultural Context</p>
      {humor_explanation && <p className="opacity-95">😄 Humor: {humor_explanation}</p>}
      {idiom_breakdown && <p className="opacity-95">📖 Idiom: {idiom_breakdown}</p>}
      {etiquette_warning && <p className="text-red-300 font-medium">⚠️ Etiquette: {etiquette_warning}</p>}
    </div>
  );
}
