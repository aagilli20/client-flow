<p align="center">
  <img src="public/logo.png" alt="ClientFlow" width="72" height="72" style="border-radius: 50%;" />
</p>

# ClientFlow

Seguimiento de clientes y equipo: prospectos con embudo, anillos de actividad diaria con racha, árbol de equipo (nodos sombra), registro social, metas del mes y un resumen listo para enviarle a tu sponsor.

Stack: **Next.js 15 (App Router) · TypeScript · React 18 · Tailwind + shadcn/ui · Radix · Lucide · React Hook Form + Zod · Firebase Auth + Cloud Firestore · next-intl (es/en) · Vitest**.

> **Origen del diseño.** La estructura funcional (Inicio, Prospectos, Equipo, Social, Mes) se infirió del análisis público de civendi.app. La interfaz **no** copia su identidad visual: usa los estilos de la plantilla `landing-page` (Geist, neutros, primario oscuro, bordes/radios sutiles) con el naranja como acento y los anillos de actividad como elemento característico.

---

## 1. Requisitos

- Node.js ≥ 18.18 (probado con 22) y npm
- *Opcional, para Firebase real o emuladores:* una cuenta de Google/Firebase y **Java 11+** (lo exige el emulador de Firestore)

## 2. Puesta en marcha rápida (modo demo, sin Firebase)

```bash
npm install
cp .env.example .env
npm run dev
```

Abrí http://localhost:3000 → **Empezar gratis** → **Entrar con la cuenta demo** (`demo@clientflow.app` / `demo1234`).

Si `NEXT_PUBLIC_FIREBASE_API_KEY` está vacío, la app corre en **modo demo**: cuentas y datos viven en `localStorage` del navegador (la contraseña solo se guarda hasheada con SHA-256 + sal). Sirve para desarrollar y mostrar la UI; **no es seguridad real** y los datos no se comparten entre navegadores. Un cartel lo indica en el menú lateral.

## 3. Variables de entorno

Ver [.env.example](.env.example).

| Variable | Uso |
|---|---|
| `VERSION`, `DOMAIN`, `GA_ID` | Metadatos/SEO y analytics (opcional) |
| `NEXT_PUBLIC_FIREBASE_*` (6 variables) | Configuración del **cliente** Firebase. Vacías ⇒ modo demo |
| `NEXT_PUBLIC_USE_EMULATORS` | `true` ⇒ el cliente usa Auth `:9099` y Firestore `:8080` |
| `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_PROJECT_ID` | Solo para `npm run seed` (Admin SDK, **nunca** en el navegador) |

No hay secretos en el repositorio. La *service account* JSON no se versiona (`.gitignore`).

## 4. Crear el proyecto Firebase

1. [Consola Firebase](https://console.firebase.google.com) → **Agregar proyecto**.
2. **Compilación → Authentication → Comenzar → Método de acceso → Correo electrónico/contraseña → Habilitar**. (Activá también "Protección contra enumeración de correos" si está disponible.)
3. **Compilación → Firestore Database → Crear base de datos** (modo producción; las reglas se despliegan desde este repo).
4. **Configuración del proyecto → Tus apps → Web (`</>`)** y copiá los valores a `.env` (`NEXT_PUBLIC_FIREBASE_*`).
5. Firebase Storage **no se usa** en este MVP.
6. Desplegá reglas e índices:

```bash
npx firebase-tools login
npx firebase-tools use <tu-project-id>
npx firebase-tools deploy --only firestore:rules,firestore:indexes
```

## 5. Modelo de datos (Firestore)

Colecciones raíz; **cada documento lleva `userId`** (uid del dueño) y las reglas garantizan el aislamiento. Fechas de calendario = string `YYYY-MM-DD`; instantes (`createdAt`, `updatedAt`, `lastActionDate`) = `Timestamp` (los de servidor usan `serverTimestamp()`).

| Colección | ID | Campos principales |
|---|---|---|
| `users` | `{uid}` | `displayName`, `sponsorName?`, `goals{conversations,followUps,posts}`, timestamps |
| `contacts` | auto | `name`, `contactMethod?`, `category` (negocio/cliente), `temperature` (frio/tibio/caliente), `stage` (conversacion/seguimiento/presentacion/propuesta), `result` (abierto/cliente/recurrente/equipo/despues/no), `notes?`, `nextAction?`, `nextActionDate?`, `followUpsCount`, `lastActionDate?` |
| `team_members` | auto | `name`, `status` (shadow/registered), `sponsorId` (id de otro miembro o `null` = directo), `monthlyVolume`, `startDate`, `checklist[]` |
| `social_posts` | auto | `date`, `category` (negocio/producto/estilo_vida), `note?` |
| `focus_metrics` | auto | `name`, `monthlyTarget`, `currentValue`, `weight` (1-5), `month` (`YYYY-MM`) |
| `daily_activities` | `{uid}_{YYYY-MM-DD}` | `date`, `conversations`, `followUps`, `posts` |

Decisiones: el id determinista de `daily_activities` permite `set(merge)` + `increment()` atómico **sin lectura previa**; el árbol de equipo se guarda plano (`sponsorId`) y se arma en cliente, así mover/borrar un nodo es una escritura; el cliente nunca decide `userId` ni timestamps (los fija el repositorio).

### Índices compuestos
Definidos en [firestore.indexes.json](firestore.indexes.json): `userId + createdAt desc` (contacts, team_members), `userId + date desc` (social_posts, daily_activities), `userId + month desc` (focus_metrics). Si falta uno, la UI muestra un error explícito.

### Reglas de seguridad
[firestore.rules](firestore.rules): todo denegado por defecto; lectura/borrado solo del dueño; `create` exige `userId == auth.uid` y valida enums/longitudes/rangos; `update` no permite cambiar `userId` ni `createdAt`; `users/{uid}` solo accesible por su uid y con lista cerrada de campos; no hay `allow ... if true`. No hay organizaciones/multi-tenant porque el producto observado es individual (cada usuario es su propio "tenant").

## 6. Emuladores, seed y desarrollo con Firebase

```bash
# Terminal 1 — emuladores (Auth :9099, Firestore :8080, UI :4000)
npm run emulators

# Terminal 2 — datos demo (usuario demo@clientflow.app / demo1234 + dataset ficticio)
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_PROJECT_ID=demo-clientflow npm run seed

# Terminal 3 — app apuntando a los emuladores (.env)
#   NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
#   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-clientflow.firebaseapp.com
#   NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-clientflow
#   NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
#   NEXT_PUBLIC_USE_EMULATORS=true
npm run dev
```

Para sembrar un proyecto real: `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json FIREBASE_PROJECT_ID=<id> npm run seed` (idempotente). En PowerShell definí las variables con `$env:NOMBRE="valor"`.

### Costos y rendimiento de Firestore
Lecturas puntuales (`getDocs`) con `where(userId)` + `orderBy` + `limit(500)`; **sin listeners en tiempo real** (no aportan valor en una app de un solo usuario y multiplican lecturas). Las mutaciones actualizan el estado local sin releer, los contadores diarios usan `increment()` sin leer, y el dashboard hace 3 consultas acotadas (90 días de actividad, contactos, equipo). Pendiente si el volumen crece: paginación por cursores en Prospectos (hoy el filtrado/orden es en cliente sobre ≤500 documentos).

## 7. Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` / `build` / `start` | Desarrollo / build / servidor de producción |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | Tests unitarios (Vitest) |
| `npm run test:rules` | Tests de reglas contra el emulador de Firestore (**requiere Java**) |
| `npm run emulators` / `npm run seed` | Emuladores / seed Admin SDK |

## 8. Producción

`npm run build && npm start` (o Vercel/Firebase Hosting con Node). Configurá las `NEXT_PUBLIC_FIREBASE_*` en el entorno **de build** y agregá el dominio en *Authentication → Configuración → Dominios autorizados*. Desplegá reglas e índices antes del primer uso.

## 9. Arquitectura

```
src/
  app/[locale]/
    (marketing)/   landing + precios (públicas, con SEO/OpenGraph)
    (auth)/auth    login · registro · recuperar contraseña
    (app)/         dashboard · prospects · onboarding (Equipo) · social · month · settings  (protegidas)
  components/      app/ (shell, nav, toasts, shared) · dashboard/ · prospects/ · team/ · social/ · month/ · settings/ · ui/ (shadcn)
  contexts/        AuthContext (sesión) · DataContext (repositorio + useCollection)
  lib/
    types.ts       dominio + esquemas Zod (validación de formularios)
    metrics.ts     lógica de negocio pura: anillos, racha, parados, árbol, reporte
    data/          Repository (contrato) · firebase-repository · local-repository (demo)
    auth/          AuthBackend (contrato) · firebase-auth · demo-auth
    firebase/      inicialización perezosa + emuladores
    seed-data.ts   dataset ficticio (compartido por demo y script Admin)
scripts/seed.ts    seed con Firebase Admin SDK
tests/             unit (Vitest) · rules/ (emulador)
```

UI → hooks (`useCollection`) → `Repository` → Firestore **o** localStorage. Auth está desacoplada tras `AuthBackend`; reemplazar el proveedor no toca la UI. La protección de rutas es un guard de cliente (`AppShell`); la seguridad real son las reglas de Firestore.

## 10. Rutas

`/{es|en}` · `/pricing` · `/auth` · `/dashboard` · `/prospects` (`?filter=stalled`) · `/onboarding` (Equipo) · `/social` · `/month` · `/settings` · `/robots.txt` · `/sitemap.xml`

## 11. Funcionalidades implementadas

- **Auth**: registro, login, logout, recuperación de contraseña, sesión persistente, guard de rutas, errores traducidos (Firebase o demo).
- **Inicio**: frase del día, racha, 3 anillos con +/− (metas configurables), alerta de prospectos parados, agenda de hoy/mañana, resumen del mes, calendario mensual con estado de consistencia, rendición de cuentas (copiar / WhatsApp).
- **Prospectos**: CRUD, búsqueda, filtros (estado, categoría, temperatura, etapa), orden, paginación, selección y acciones masivas (cambiar temperatura / eliminar), "registrar seguimiento", tabla en desktop y cards en mobile.
- **Equipo**: árbol por sponsor, nodos sombra, checklist de avance, volumen, alta/edición/baja (los hijos pasan al sponsor del eliminado).
- **Social**: registro por mes y categoría, contadores, alta/baja; suma al anillo de publicaciones si es de hoy.
- **Mes**: métricas de foco con peso, progreso ponderado, +/−, navegación por mes.
- **Estados**: loading (skeletons), empty, error (con reintento y "permiso denegado"), éxito/error por toast, diálogos de confirmación.
- **Responsive**: sidebar (≥ md) / barra de pestañas inferior; sin overflow horizontal verificado a 320 px en todas las rutas.
- **i18n**: landing en es/en; la app privada está solo en español.

## 12. Pendiente / no incluido (decisiones conscientes)

- IA de objeciones e ideas de contenido, eventos/webinars, exportación a PDF del resumen, niveles de rango por empresa, notificaciones y estados de volumen por empresa: **no implementados** (los sugiere el análisis previo de Civendi pero no pudieron verificarse en la parte pública).
- La paginación de Prospectos es en cliente (≤500 docs). Sin listeners en tiempo real.
- Tests E2E con Playwright y tests de reglas **no ejecutados en esta máquina** (sin Java ni navegador de prueba instalado): los de reglas están escritos en `tests/rules` y deben correrse con `npm run test:rules`.
- Los textos de los testimonios y de los planes de la landing son de ejemplo.
