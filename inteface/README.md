# Activador del Chatbot OESVICA (Widget Embeddable)

Este módulo te permite incrustar y activar el **Chatbot de Atención al Trabajador OESVICA** en cualquier página web externa (WordPress, Laravel, PHP puro, HTML, Shopify, Angular, React, Intranet institucional, etc.) con una simple etiqueta `<script>`, exactamente igual a la arquitectura utilizada por plataformas como Voiceflow o Intercom.

---

## 🚀 Código para Copiar y Pegar en Cualquier Página Web

Pega el siguiente código antes del cierre de la etiqueta `</body>` en tu sitio web:

```html
<script type="text/javascript">
  (function(d, t) {
      var v = d.createElement(t), s = d.getElementsByTagName(t)[0];
      v.onload = function() {
        window.oesvicaChat.load({
          serverUrl: 'https://ais-dev-7pwb7do4g6ftyewwkyqmiz-417075059177.us-east1.run.app', // URL donde está alojada tu aplicación
          title: 'Atención al Trabajador OESVICA',
          position: 'right', // 'right' o 'left'
          themeColor: '#2563eb' // Color del botón flotante
        });
      };
      v.src = 'https://ais-dev-7pwb7do4g6ftyewwkyqmiz-417075059177.us-east1.run.app/interface/widget.js'; 
      v.type = 'text/javascript'; 
      s.parentNode.insertBefore(v, s);
  })(document, 'script');
</script>
```

---

## ⚙️ Opciones de Configuración (`window.oesvicaChat.load`)

| Opción | Tipo | Valor por defecto | Descripción |
|---|---|---|---|
| `serverUrl` | `string` | *(Auto-detectado)* | URL base donde está desplegado el chatbot (por ejemplo `https://tu-dominio.com`). |
| `title` | `string` | `'Atención al Trabajador OESVICA'` | Título y etiqueta accesible para el iframe. |
| `position` | `string` | `'right'` | Ubicación del botón en la pantalla: `'right'` (inferior derecha) o `'left'` (inferior izquierda). |
| `themeColor` | `string` | `'#2563eb'` | Color hexadecimal primario del botón lanzador. |
| `autoOpen` | `boolean` | `false` | Si es `true`, el chat se despliega automáticamente al cargar la página. |
| `zIndex` | `number` | `999999` | Nivel de capa z-index para asegurar que flote sobre otros elementos. |

---

## 🕹️ Funciones JavaScript Disponibles

Una vez cargado, puedes interactuar con el widget desde tus propios botones o eventos de la página:

```javascript
// Abrir el chatbot
window.oesvicaChat.open();

// Cerrar el chatbot
window.oesvicaChat.close();

// Alternar entre abierto y cerrado
window.oesvicaChat.toggle();
```

---

## 📁 Archivos en esta Carpeta

- `widget.js`: Script principal ligero y autónomo (Vanilla JS sin dependencias externas).
- `snippet.html`: Código listo para copiar y pegar.
