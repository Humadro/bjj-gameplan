# BJJ Game Plan — web

Next.js 16 + Supabase + React Flow. Ver [../PROYECTO.md](../PROYECTO.md) y [../CLAUDE.md](../CLAUDE.md).

## Puesta en marcha

```bash
npm install
cp .env.example .env.local   # rellena URL y anon key de Supabase (Settings -> API)
npm run dev                  # http://localhost:3000
```

Mientras `.env.local` esté vacío la app arranca igual y muestra un aviso de configuración
en vez de fallar.

### Base de datos

Aplica `supabase/migrations/0001_init.sql` en el SQL Editor de Supabase (o `supabase db push`
si usas la CLI). Crea las tablas `positions` y `techniques` con RLS por usuario.

## Scripts

- `npm run dev` — servidor de desarrollo (Turbopack)
- `npm run build` — build de producción (incluye `tsc`)
- `npm run start` — sirve el build
- `npm run lint` — ESLint

## Estructura

- `proxy.ts` + `lib/supabase/proxy.ts` — refresco de sesión y redirects de auth (Next 16: "proxy" = el antiguo "middleware")
- `lib/supabase/{client,server}.ts` — clientes de Supabase
- `lib/dal.ts` — `requireUser()`, única puerta de auth en el servidor
- `app/login/` — login / registro (email + contraseña)
- `app/map/` — página del mapa: `page.tsx` (server, carga datos), `actions.ts` (Server Actions CRUD), paneles y `GraphCanvas.tsx`
- `lib/graph/layout.ts` — `buildGraph()`: datos → nodos/aristas → layout dagre (el usuario nunca coloca nodos)

## Deploy

Push a GitHub → importar en Vercel → definir `NEXT_PUBLIC_SUPABASE_URL` y
`NEXT_PUBLIC_SUPABASE_ANON_KEY` en el proyecto de Vercel → añadir la URL pública en
Supabase → Authentication → URL Configuration.
