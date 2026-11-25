export type Arancel = {
  subpartida: string;
  descripcion: string;
  unidad: string | null;
  ad_valorem: number | null;
  especifico: string | null;
  tarifa_texto: string | null;
  capitulo: string | null;
  partida: string | null;
  score?: number;
};
