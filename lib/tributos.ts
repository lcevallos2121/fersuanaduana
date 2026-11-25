export type Entrada = {
  fob: number;
  flete: number;
  seguro: number;
  adValorem: number; // %
  iva: number; // % (Ecuador: 15)
  ice: number; // %
  salvaguardia: number; // %
};

export type Liquidacion = {
  cif: number;
  adValorem: number;
  fodinfa: number;
  ice: number;
  salvaguardia: number;
  baseIva: number;
  iva: number;
  totalTributos: number;
  costoNacionalizado: number;
};

const FODINFA = 0.005; // 0,5% del CIF

/** Liquidación de tributos de importación a consumo (Ecuador / SENAE). */
export function liquidar(e: Entrada): Liquidacion {
  const n = (x: number) => (Number.isFinite(x) && x > 0 ? x : 0);
  const cif = n(e.fob) + n(e.flete) + n(e.seguro);
  const adValorem = (cif * n(e.adValorem)) / 100;
  const fodinfa = cif * FODINFA;
  const ice = (cif * n(e.ice)) / 100;
  const salvaguardia = (cif * n(e.salvaguardia)) / 100;
  const baseIva = cif + adValorem + fodinfa + ice + salvaguardia;
  const iva = (baseIva * n(e.iva)) / 100;
  const totalTributos = adValorem + fodinfa + ice + salvaguardia + iva;
  const costoNacionalizado = cif + totalTributos;
  return { cif, adValorem, fodinfa, ice, salvaguardia, baseIva, iva, totalTributos, costoNacionalizado };
}

export const usd = (x: number) =>
  new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(
    Number.isFinite(x) ? x : 0,
  );
