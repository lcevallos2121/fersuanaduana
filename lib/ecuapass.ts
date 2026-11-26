import * as XLSX from "xlsx-js-style";

export type ItemClasificado = {
  descripcion: string;
  modelo?: string;
  marca?: string;
  cantidad?: number;
  precio_unitario?: number;
  precio_total?: number;
  subpartida: string; // 10 dígitos (puede llevar puntos; se normaliza)
  regla?: string;
  justificacion?: string;
  arancel_oficial?: string | null; // descripción oficial si existe en la base
  ad_valorem?: number | null;
};

export type Cabecera = {
  numero_factura?: string;
  fecha?: string;
  proveedor?: string;
  comprador?: string;
  pais_origen?: string;
  pais_embarque?: string;
  incoterm?: string;
  moneda?: string;
  lugar_entrega?: string;
};

// Columnas exactas de la plantilla de ítems de ECUAPASS
export const HEADERS = [
  "H01. Numero de item", "H02. Subpartida", "H03. Codigo complementario", "H04. Codigo suplementario",
  "H05. Subpartida (naladisa)", "H06. Descripcion comercial (L)", "H21. Pais de origen", "H07. Estado",
  "H08. Tipo de tratamiento", "H09. Tipo de mercancia (L)", "H10. Peso neto", "H11. Ubicacion geografica",
  "H12. Clase (L)", "H13. Modelo (L)", "H42. Marca comer. (L)", "H14. Ano de fabricacion",
  "H15. Otras caracteristicas (L)", "H16. Codigo de producto (Régimen 21)", "H44. Bien de capital",
  "H17. Tipo de unidades fisicas", "H18. Cantidad de unidades fisicas", "H19. Tipo de unidad comercial",
  "H20. Cantidad de unidades comerciales", "H22. Pais de Embarque", "H37. Precio neto",
  "H24. Adiciones o deducciones", "H25. FOB", "H27 Pagos indirectos", "H28. Descuentos retroactivos",
  "H29. Otros pagos", "H38. Precio total pagado", "H23. Gastos de transporte", "H30. Gastos de seguro",
  "J03. Adiciones", "J05. Deducciones", "H31. Valor en aduana", "H26. Fob unitario", "H33. Método de valor",
  "H34. Número de factura", "N03. Fecha de factura", "H35. Código de proveedor", "H39 TPCI", "H40. TPNG",
  "H41. TPNE", "H43. Tipo de margen", "H45. Número de chasis", "H46. Número de motor", "H47. Tipo de carrocería",
  "H48. Color", "H49. Combustible", "H50. Cilindraje", "H51. Capacidad maxima", "H52. Tipo de transmisión",
  "H53. Tracción", "Clase", "H54. Subcategoría", "H55. Descripción comercial", "H56. Tonelaje", "H57. Incoterm",
  "H58. Moneda", "P01. Naturaleza transacción", "P03. Lugar de entrega del incoterm", "P06. Forma de envío",
  "P07. Forma de pago", "P08. Medio de pago", "R01. Vinculacion con el proveedor", "Peso bruto", "Codigo sap",
  "Código maestro", "Refrendo del Item precedente", "Secuencial del item PRECEDENTE", "N19 Pais de compra",
];

const ISO: Record<string, string> = {
  china: "CN", ecuador: "EC", "estados unidos": "US", usa: "US", colombia: "CO", peru: "PE", "perú": "PE",
  brasil: "BR", chile: "CL", mexico: "MX", "méxico": "MX", españa: "ES", espana: "ES", alemania: "DE",
  italia: "IT", japon: "JP", "japón": "JP", "corea del sur": "KR", india: "IN", taiwan: "TW", "taiwán": "TW",
};
function iso(pais?: string): string {
  if (!pais) return "";
  const p = pais.trim();
  if (/^[A-Za-z]{2}$/.test(p)) return p.toUpperCase();
  return ISO[p.toLowerCase()] || p;
}
function toISODate(f?: string): string {
  if (!f) return "";
  const m = f.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const m2 = f.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m2) return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
  return f;
}
function anio(f?: string): string {
  const m = (f || "").match(/(\d{4})/);
  return m ? m[1] : new Date().getFullYear().toString();
}
const soloDigitos = (s: string) => (s || "").replace(/\D/g, "");

function buildRow(it: ItemClasificado, i: number, cab: Cabecera): (string | number)[] {
  const sub = soloDigitos(it.subpartida);
  const cant = Number(it.cantidad) || 1;
  const total = Number(it.precio_total) || (Number(it.precio_unitario) || 0) * cant;
  const paisO = iso(cab.pais_origen);
  const desc = it.descripcion || "";
  // mapeo por nombre de columna: alineación garantizada contra HEADERS
  const v: Record<string, string | number> = {
    "H01. Numero de item": i + 1,
    "H02. Subpartida": sub,
    "H03. Codigo complementario": 0,
    "H04. Codigo suplementario": 0,
    "H06. Descripcion comercial (L)": desc,
    "H21. Pais de origen": paisO,
    "H07. Estado": 1,
    "H08. Tipo de tratamiento": 1,
    "H09. Tipo de mercancia (L)": desc,
    "H11. Ubicacion geografica": "9001",
    "H12. Clase (L)": "SIN CLASE",
    "H13. Modelo (L)": it.modelo || "",
    "H42. Marca comer. (L)": it.marca || "",
    "H14. Ano de fabricacion": anio(cab.fecha),
    "H15. Otras caracteristicas (L)": desc,
    "H44. Bien de capital": "NO",
    "H18. Cantidad de unidades fisicas": cant,
    "H19. Tipo de unidad comercial": "SET",
    "H20. Cantidad de unidades comerciales": cant,
    "H22. Pais de Embarque": iso(cab.pais_embarque || cab.pais_origen),
    "H37. Precio neto": total,
    "H38. Precio total pagado": total,
    "H34. Número de factura": cab.numero_factura || "",
    "N03. Fecha de factura": toISODate(cab.fecha),
    "H35. Código de proveedor": cab.proveedor || "",
    "H57. Incoterm": cab.incoterm || "FOB",
    "H58. Moneda": cab.moneda || "USD",
    "P01. Naturaleza transacción": "11",
    "P03. Lugar de entrega del incoterm": cab.lugar_entrega || "",
    "P06. Forma de envío": "2",
    "P07. Forma de pago": "1",
    "R01. Vinculacion con el proveedor": "0",
    "N19 Pais de compra": paisO,
  };
  // ECUAPASS lee los datos por POSICIÓN y la primera columna de datos es la Subpartida
  // (la columna "H01. Numero de item" no se llena: el número es implícito por la fila).
  // Por eso los datos van desplazados una columna a la izquierda respecto al encabezado.
  return HEADERS.slice(1).map((h) => (h in v ? v[h] : ""));
}

export function descargarExcel(items: ItemClasificado[], cab: Cabecera) {
  // ECUAPASS lee los datos por posición empezando en la Subpartida, así que el
  // encabezado también arranca en la Subpartida (sin "H01. Numero de item") para
  // que cada rótulo quede justo encima de su dato. Al final, la nota explicativa.
  const header = [...HEADERS.slice(1), "NOTA EXPLICATIVA (borrar antes de subir)"];
  const data = items.map((it, i) => [...buildRow(it, i, cab), it.justificacion || ""]);
  const aoa: (string | number)[][] = [header, ...data];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const noteCol = header.length - 1;

  // anchos de columna (por posición de dato: 0=subpartida, 4=descripción, 34=proveedor, última=nota)
  ws["!cols"] = header.map((_, i) => ({
    wch: i === 0 ? 14 : i === 4 ? 34 : i === 8 ? 28 : i === 14 ? 28 : i === 34 ? 26 : i === noteCol ? 55 : 14,
  }));
  ws["!rows"] = [{ hpt: 30 }];
  ws["!freeze"] = { xSplit: 0, ySplit: 1 } as any;

  const borde = {
    top: { style: "thin", color: { rgb: "DCE6EC" } },
    bottom: { style: "thin", color: { rgb: "DCE6EC" } },
    left: { style: "thin", color: { rgb: "DCE6EC" } },
    right: { style: "thin", color: { rgb: "DCE6EC" } },
  };
  const range = XLSX.utils.decode_range(ws["!ref"] as string);
  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      const wrap = c === 4 || c === 8 || c === 14 || c === noteCol;
      if (r === 0) {
        cell.s = {
          font: { bold: true, sz: 9, color: { rgb: "FFFFFF" } },
          fill: { patternType: "solid", fgColor: { rgb: c === noteCol ? "B8860F" : "0E7C86" } },
          alignment: { horizontal: "center", vertical: "center", wrapText: true },
          border: borde,
        };
      } else {
        cell.s = {
          font: { sz: 9, color: { rgb: "22303A" } },
          fill: { patternType: "solid", fgColor: { rgb: r % 2 === 0 ? "F3F8FA" : "FFFFFF" } },
          alignment: { vertical: "center", wrapText: wrap },
          border: borde,
        };
        if (c === 0) cell.s.font = { sz: 10, bold: true, color: { rgb: "0A5A63" } };
        if (c === noteCol) cell.s.font = { sz: 9, italic: true, color: { rgb: "7A6A3A" } };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Hoja1");
  const nombre = `declaracion_${(cab.numero_factura || "ecuapass").replace(/\W+/g, "")}.xlsx`;
  XLSX.writeFile(wb, nombre);
}
