/**
 * Kleiner Browser-Helfer, um erzeugten Text (JSON/CSV/ICS) als Datei
 * herunterzuladen. Bewusst ohne Abhaengigkeit: ein kurzlebiger <a>-Klick auf
 * eine Object-URL. Optional wird ein UTF-8-BOM vorangestellt – Excel erkennt
 * CSV-Dateien sonst haeufig nicht als UTF-8 und zeigt Umlaute kaputt an.
 */
export function downloadText(
  text: string,
  dateiname: string,
  mime = 'text/plain;charset=utf-8',
  bom = false,
) {
  const teile = bom ? ['﻿', text] : [text];
  const blob = new Blob(teile, { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = dateiname;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
