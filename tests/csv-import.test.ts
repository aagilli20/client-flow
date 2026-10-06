import { describe, expect, it } from 'vitest';
import { CSV_TEMPLATE, MAX_IMPORT_ROWS, parseContactsCsv, parseCsv } from '@/lib/csv-import';

describe('parseCsv', () => {
  it('campos con comillas, comas, comillas escapadas y saltos de línea', () => {
    const t = 'a,b\n"Pérez, Ana","dijo ""hola""\nchau"\n';
    expect(parseCsv(t)).toEqual([['a', 'b'], ['Pérez, Ana', 'dijo "hola"\nchau']]);
  });
  it('detecta ; (Excel es-AR), quita BOM y CRLF, ignora líneas vacías', () => {
    expect(parseCsv('﻿nombre;medio\r\nAna;123\r\n\r\n')).toEqual([['nombre', 'medio'], ['Ana', '123']]);
  });
});

describe('parseContactsCsv', () => {
  it('la plantilla descargable es válida', () => {
    const r = parseContactsCsv(CSV_TEMPLATE);
    expect(r.fatal).toBeUndefined();
    expect(r.rows).toHaveLength(2);
    expect(r.rows.every((x) => x.input)).toBe(true);
    expect(r.rows[1]!.input!.category).toBe('cliente'); // "producto" → cliente
  });

  it('solo nombre es obligatorio y el resto toma valores por defecto', () => {
    const r = parseContactsCsv('Nombre\nAna Pérez');
    expect(r.rows[0]!.input).toMatchObject({ name: 'Ana Pérez', category: 'negocio', temperature: 'tibio', stage: 'conversacion', result: 'abierto', nextActionDate: '' });
  });

  it('encabezados con tildes/mayúsculas y valores con etiquetas visibles', () => {
    const r = parseContactsCsv('Nombre,Categoría,Temperatura,Etapa,Resultado\nAna,Producto,Fría,En seguimiento,Ahora no');
    expect(r.rows[0]!.input).toMatchObject({ category: 'cliente', temperature: 'frio', stage: 'seguimiento', result: 'despues' });
  });

  it('fechas DD/MM/AAAA se normalizan y las inválidas se reportan', () => {
    const r = parseContactsCsv('nombre,fecha_proximo_seguimiento\nAna,05/11/2026\nBeto,31/02/2026\nCata,mañana');
    expect(r.rows[0]!.input!.nextActionDate).toBe('2026-11-05');
    expect(r.rows[1]!.errors[0]).toContain('fecha');
    expect(r.rows[2]!.input).toBeUndefined();
  });

  it('filas inválidas llevan su número de línea y no frenan a las válidas', () => {
    const r = parseContactsCsv('nombre,temperatura\nAna,caliente\nB,tibio\nCarla,hirviendo');
    expect(r.rows.map((x) => !!x.input)).toEqual([true, false, false]);
    expect(r.rows[1]!.line).toBe(3);
    expect(r.rows[2]!.errors[0]).toContain('hirviendo');
  });

  it('errores fatales: vacío, sin columna nombre, sin filas, demasiadas filas', () => {
    expect(parseContactsCsv('').fatal).toBeTruthy();
    expect(parseContactsCsv('telefono\n123').fatal).toContain('nombre');
    expect(parseContactsCsv('nombre').fatal).toBeTruthy();
    expect(parseContactsCsv('nombre\n' + Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `P${i}`).join('\n')).fatal).toContain(String(MAX_IMPORT_ROWS));
  });

  it('informa columnas ignoradas', () => {
    expect(parseContactsCsv('nombre,color_favorito\nAna,rojo').ignoredColumns).toEqual(['color_favorito']);
  });
});
