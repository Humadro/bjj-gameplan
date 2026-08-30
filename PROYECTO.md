# BJJ Game Plan — Web App

## Idea
Web donde cada usuario crea su propio mapa de juego de BJJ: parte de posiciones,
añade sus técnicas desde cada posición, las rankea por confianza (alta/media/baja)
y declara a qué posición lleva cada técnica. El layout del árbol se calcula
automáticamente (como hace `dot` con el `.dot` actual), el usuario nunca coloca
nodos a mano.

Inspirado directamente en `Mapa_Juego_BJJ.dot` (carpeta `Peso/`): mismo esquema de
colores por confianza (verde=alta `#2E7D32`, ámbar=media `#F9A825`, rojo=baja
`#C62828`), mismos tipos de nodo (posición = círculo relleno gris, técnica =
texto plano coloreado, sumisión = caja) y mismo tipo de flechas (sólida negra =
posición→técnica propia, discontinua gris = técnica→posición buena a la que
desemboca, discontinua roja = técnica→posición mala tipo bottom).

## Por qué
El `.dot` actual funciona pero se edita a mano en texto plano y solo vale para
una persona. La web debe dar la misma claridad visual y el mismo auto-layout,
pero con una interfaz para editar y sin tener que tocar código, y que cada
usuario (él, su chica, compañeros de equipo...) tenga el suyo con su propia cuenta.

## Modelo de datos (por usuario)
- **Posición**: nombre (ej. "Side Control Top", "Front Headlock Bottom").
- **Técnica**: nombre, pertenece a una posición de origen, nivel de confianza
  (alta/media/baja), posición de destino (opcional — puede ser sumisión, en
  cuyo caso no lleva a ninguna posición).
- Las posiciones "hub" (a las que llegan varias técnicas desde sitios distintos,
  ej. Side Control Top) deben quedar como el mismo nodo aunque se llegue desde
  varias técnicas — no duplicar.

## MVP
1. Auth simple (Supabase Auth — email/Google).
2. CRUD de posiciones y técnicas (formulario simple, no hace falta drag & drop).
3. Render automático del grafo con **React Flow + dagre** para el layout
   jerárquico (equivalente en JS a lo que hace Graphviz `dot`).
4. Colores de nodo/edge según las mismas reglas que el `.dot` actual.
5. Un usuario ve solo su propio mapa.

## Fuera del MVP (ideas para después)
- Exportar el mapa a PNG/PDF (como ahora con `dot -Tpdf`).
- Comparar/ver el mapa de un compañero de equipo (compartir en modo lectura).
- Historial de cambios de confianza en una técnica a lo largo del tiempo.
- Sugerencias de huecos en el árbol (posiciones sin ninguna técnica de salida).

## Stack propuesto
- Frontend: React (Next.js) + React Flow (editor/render del grafo) + dagre
  (layout automático).
- Backend/datos: Supabase (Postgres + Auth), evita montar backend propio.
- Sin canvas libre tipo Miro — el usuario nunca arrastra nodos, solo declara
  datos y el layout se recalcula solo. Esto es la decisión de diseño central
  del proyecto, no un detalle: es lo que lo diferencia de un editor de
  diagramas genérico.

## Referencia
Carpeta original con el mapa manual: `C:\Users\mdrhu\all\Peso\Mapa_Juego_BJJ.dot`
(y su render en `Mapa_Juego_BJJ_dot.png` / `Mapa_Juego_BJJ.pdf`).
