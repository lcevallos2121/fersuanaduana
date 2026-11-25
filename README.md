# FERSUANADUANA

Consola arancelaria estilo HUD para agentes de aduana en **Ecuador**.
Clasifica subpartidas NANDINA, liquida tributos de importación y consulta normativa con IA.
Hecho con **Next.js + Supabase**, listo para **Vercel**. (Versión de escritorio; móvil en una fase posterior.)

> Datos del arancel: **Resolución COMEX 002-2023** (6.536 subpartidas). Las tarifas y clasificaciones son
> de referencia; verifica siempre en el SENAE / ECUAPASS antes de una declaración.

---

## 1. Qué necesitas

- **Node.js 18+** (tienes 24, perfecto).
- Una cuenta **gratuita de Supabase** → https://supabase.com (esta base es TUYA, independiente).
- Una cuenta **gratuita de Vercel** → https://vercel.com (para publicar).
- (Opcional) Una API key de IA **gratis** para el modo Consulta (Groq o Gemini).

---

## 2. Crear la base de datos en TU Supabase

1. Entra a https://supabase.com → **New project** (elige región, pon una contraseña y guárdala).
2. Cuando el proyecto esté listo, ve a **SQL Editor** (icono `</>` en el menú izquierdo) → **New query**.
3. Abre el archivo [`supabase/schema.sql`](supabase/schema.sql) de este proyecto, copia **todo** su contenido,
   pégalo en el editor y pulsa **Run**. Esto crea la tabla `aranceles`, los índices y la función de búsqueda.
4. Carga los 6.536 registros:
   - Ve a **Table Editor** → tabla **`aranceles`** → botón **Insert** → **Import data from CSV**.
   - Sube el archivo [`data/aranceles.csv`](data/aranceles.csv) de este proyecto.
   - Deja que mapee las columnas por nombre (coinciden) y confirma la importación.
5. Prueba en **SQL Editor**:
   ```sql
   select * from search_arancel('zapatos', 10);
   select * from search_arancel('8471', 10);
   ```
6. Copia tus credenciales en **Project Settings → API**:
   - **Project URL** → será `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → será `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 3. Probar en tu PC (local)

```bash
# 1. copia el ejemplo de variables y complétalo con tus datos de Supabase
cp .env.local.example .env.local
# edita .env.local y pega tu URL y tu anon key

# 2. instala y arranca
npm install
npm run dev
```

Abre http://localhost:3000. Prueba escribir "laptop" o "8471" en el buscador.

---

## 4. Publicar en Vercel

1. Sube este proyecto a un repositorio de **GitHub** (privado o público).
2. En Vercel: **Add New → Project → Import** tu repo. Framework: **Next.js** (lo detecta solo).
3. En **Environment Variables** agrega:

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | tu Project URL de Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | tu anon public key |
   | `AI_API_KEY` | *(opcional)* tu key de IA |
   | `AI_BASE_URL` | *(opcional)* ver sección 5 |
   | `AI_MODEL` | *(opcional)* ver sección 5 |

4. **Deploy**. Vercel te da la URL pública.

---

## 5. IA del modo Consulta (opcional y GRATIS)

La key vive solo en el servidor (nunca se expone al navegador). Elige una opción:

**Groq (gratis, recomendado):**
```
AI_BASE_URL=https://api.groq.com/openai/v1
AI_MODEL=llama-3.1-8b-instant
AI_API_KEY=gsk_...   (crea la key en https://console.groq.com)
```

**Google Gemini (gratis):**
```
AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
AI_MODEL=gemini-2.0-flash
AI_API_KEY=...        (https://aistudio.google.com/apikey)
```

**OpenAI mini (de pago, muy barato):**
```
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
AI_API_KEY=sk-...
```

Sin `AI_API_KEY`, el buscador y la calculadora funcionan igual; solo el modo Consulta queda inactivo.

---

## 6. Actualizar el arancel (reformas del COMEX)

El COMEX reforma el arancel periódicamente (013-2024, 006-2025, etc.). Para actualizar:
regenera `data/aranceles.csv` desde el nuevo PDF y vuelve a importarlo (o actualiza las filas afectadas en
Supabase). La estructura de la tabla no cambia.

---

## Estructura

```
app/            Next.js (App Router)
  api/consulta/ endpoint de IA (servidor)
  page.tsx      carga la consola
components/
  Console.tsx       UI principal (3 modos)
  HudBackground.tsx fondo HUD animado
lib/
  supabase.ts   cliente + búsqueda (RPC)
  tributos.ts   liquidación de tributos (CIF, ad-valorem, FODINFA, ICE, salvaguardia, IVA)
  types.ts
supabase/schema.sql   crea tabla + índices + función de búsqueda
data/aranceles.csv    6.536 subpartidas (Res. 002-2023)
```
