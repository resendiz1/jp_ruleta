# SpinIt

Ruleta de decisiones hecha con HTML, CSS y JavaScript vanilla. No requiere backend ni dependencias de JavaScript.

## Ejecutar
Abre `index.html` en un navegador moderno. Para probar compartir enlaces de forma fiable, sirve la carpeta desde un servidor estático (por ejemplo `python -m http.server 8000`) y abre `http://localhost:8000`.

## Funciones
- Crear, renombrar, cambiar y eliminar varias ruletas.
- Agregar, editar, eliminar, mezclar y limpiar opciones.
- Pesos/probabilidades relativas por opción (0.1 a 100).
- Canvas con segmentos proporcionales al peso y animación de giro.
- Historial local de ganadores por ruleta.
- Eliminación automática opcional del ganador.
- Cuatro paletas de colores.
- Efectos de sonido generados con Web Audio API (sin archivos externos).
- Compartir una configuración mediante URL hash. Al abrir el enlace se importa una copia; el historial no se incluye.
- Persistencia con LocalStorage.

## Estructura
- `index.html`: estructura.
- `css/styles.css`: interfaz y responsive.
- `js/storage.js`: estado, normalización y persistencia.
- `js/wheel.js`: dibujo Canvas y animación.
- `js/app.js`: interacción, historial, sonidos y compartir.

## Notas
- Los datos permanecen en el navegador donde se crearon; borrar datos del sitio elimina las ruletas guardadas.
- Los enlaces compartidos contienen las opciones y pesos codificados en el fragmento de URL. No se suben a un servidor.
- Los pesos son relativos: peso 2 tiene el doble de probabilidad que peso 1, no una probabilidad absoluta.
- Para una selección ponderada, SpinIt usa `crypto.getRandomValues`; la animación aterriza en el segmento elegido.
