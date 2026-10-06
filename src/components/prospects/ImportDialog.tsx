'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Spinner } from '@/components/app/shared';
import { CSV_TEMPLATE, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, parseContactsCsv, type ImportParse } from '@/lib/csv-import';
import type { Contact, ContactInput } from '@/lib/types';

/** UTF-8; si el archivo viene de Excel en Windows-1252 se detecta por los caracteres de reemplazo. */
async function readText(file: File) {
  const buf = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buf);
  return utf8.includes('�') ? new TextDecoder('windows-1252').decode(buf) : utf8;
}

const key = (name: string) => name.trim().toLowerCase();

export default function ImportDialog({
  open,
  onOpenChange,
  existing,
  onImport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  existing: Contact[];
  onImport: (rows: ContactInput[], onProgress: (done: number) => void) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsed, setParsed] = useState<ImportParse | null>(null);
  const [readError, setReadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setFileName(''); setParsed(null); setReadError(''); setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const { valid, invalid, duplicates } = useMemo(() => {
    const names = new Set(existing.map((c) => key(c.name)));
    const seen = new Set<string>();
    const valid: ContactInput[] = [];
    let duplicates = 0;
    for (const r of parsed?.rows ?? []) {
      if (!r.input) continue;
      const k = key(r.input.name);
      if (names.has(k) || seen.has(k)) { duplicates++; continue; }
      seen.add(k);
      valid.push(r.input);
    }
    return { valid, invalid: (parsed?.rows ?? []).filter((r) => !r.input), duplicates };
  }, [parsed, existing]);

  const onFile = async (file?: File) => {
    reset();
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) { setReadError('El archivo supera 1 MB.'); return; }
    try {
      setFileName(file.name);
      setParsed(parseContactsCsv(await readText(file)));
    } catch {
      setReadError('No se pudo leer el archivo.');
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'plantilla-prospectos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const run = async () => {
    setBusy(true);
    setProgress(0);
    try {
      await onImport(valid, setProgress);
      reset();
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) { onOpenChange(o); if (!o) reset(); } }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogTitle>Importar prospectos</DialogTitle>
        <DialogDescription className="mt-1">
          Subí un archivo CSV (hasta {MAX_IMPORT_ROWS} filas). La primera fila debe tener los nombres de columna; solo <strong>nombre</strong> es obligatorio.
        </DialogDescription>

        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <label className="btn-ghost cursor-pointer">
              <FileUp className="h-4 w-4" /> {fileName ? 'Elegir otro archivo' : 'Elegir archivo CSV'}
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={(e) => void onFile(e.target.files?.[0])} />
            </label>
            <button type="button" onClick={downloadTemplate} className="btn-ghost">
              <Download className="h-4 w-4" /> Descargar plantilla
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            Columnas reconocidas: nombre, medio_de_contacto, categoria (negocio/producto), temperatura (frio/tibio/caliente), etapa, resultado, proxima_accion,
            fecha_proximo_seguimiento (AAAA-MM-DD o DD/MM/AAAA) y notas. Lo que falte toma un valor por defecto. Los nombres que ya existen se omiten.
          </p>

          {readError && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{readError}</p>}
          {parsed?.fatal && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{parsed.fatal}</p>}

          {parsed && !parsed.fatal && (
            <div className="space-y-3" aria-live="polite">
              <p className="text-sm font-medium">{fileName}</p>
              <ul className="grid grid-cols-3 gap-2 text-center text-xs">
                <li className="rounded-lg bg-green-50 p-2 text-green-800"><strong className="block text-lg">{valid.length}</strong>para importar</li>
                <li className="rounded-lg bg-gray-100 p-2 text-gray-700"><strong className="block text-lg">{duplicates}</strong>ya existen</li>
                <li className="rounded-lg bg-red-50 p-2 text-red-800"><strong className="block text-lg">{invalid.length}</strong>con errores</li>
              </ul>
              {parsed.ignoredColumns.length > 0 && (
                <p className="text-xs text-muted-foreground">Columnas ignoradas: {parsed.ignoredColumns.join(', ')}.</p>
              )}
              {invalid.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border p-3 text-xs">
                  <p className="mb-1 font-medium">Filas con errores (no se importan):</p>
                  <ul className="space-y-1 text-red-700">
                    {invalid.slice(0, 50).map((r) => <li key={r.line}>Línea {r.line}: {r.errors.join('; ')}</li>)}
                    {invalid.length > 50 && <li>… y {invalid.length - 50} más.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button className="btn-ghost" disabled={busy} onClick={() => { onOpenChange(false); reset(); }}>Cancelar</button>
          <button className="btn-primary" disabled={busy || valid.length === 0} onClick={() => void run()}>
            {busy && <Spinner />} {busy ? `Importando ${progress}/${valid.length}…` : `Importar ${valid.length} ${valid.length === 1 ? 'prospecto' : 'prospectos'}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
