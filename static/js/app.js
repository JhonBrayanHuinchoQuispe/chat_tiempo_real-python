const clavePusher = document.querySelector('meta[name="pusher-key"]').getAttribute('content');
const clusterPusher = document.querySelector('meta[name="pusher-cluster"]').getAttribute('content');
let usuarioActual = "";

// Evito XSS escapando caracteres especiales del texto
function escaparHtml(texto) {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function crearBurbujaMensaje(usuario, texto, esMio = false) {
  const divMensaje = document.createElement("div");
  divMensaje.className = `mensaje ${esMio ? "propio" : "otro"}`;
  
  divMensaje.innerHTML = `
    <div class="autor-mensaje">${escaparHtml(usuario)}</div>
    <div class="texto-mensaje">${escaparHtml(texto)}</div>
  `;
  
  return divMensaje;
}

function agregarMensajeAlChat(usuario, texto, esMio = false) {
  const divMensajes = document.getElementById("mensajes");
  const elementoMensaje = crearBurbujaMensaje(usuario, texto, esMio);
  
  divMensajes.appendChild(elementoMensaje);
  divMensajes.scrollTop = divMensajes.scrollHeight;
}

// Envio el mensaje al backend y limpio el campo de texto
async function enviarMensaje() {
  const campoUsuario = document.getElementById("usuario");
  const campoTexto = document.getElementById("texto");
  const usuario = campoUsuario.value.trim() || "Anónimo";
  const texto = campoTexto.value.trim();
  
  if (!texto) return;
  
  usuarioActual = usuario;
  
  try {
    const respuesta = await fetch("/api/mensaje", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, texto })
    });
    
    if (respuesta.ok) {
      campoTexto.value = "";
      campoTexto.focus();
    } else {
      const error = await respuesta.json().catch(() => ({}));
      agregarMensajeAlChat("Sistema", "Error al enviar: " + (error.razon || respuesta.status), false);
    }
  } catch (excepcion) {
    agregarMensajeAlChat("Sistema", "Error de conexión: " + excepcion, false);
  }
}

// Conecto con Pusher y me suscribo al canal "chat"
function inicializarPusher() {
  if (clavePusher) {
    Pusher.logToConsole = false;
    const pusher = new Pusher(clavePusher, { cluster: clusterPusher });
    const canal = pusher.subscribe("chat");
    
    canal.bind("nuevo_mensaje", function (datos) {
      const esMio = datos.usuario === usuarioActual;
      agregarMensajeAlChat(datos.usuario, datos.texto, esMio);
    });
  }
}

function configurarEventos() {
  document.getElementById("enviar").addEventListener("click", enviarMensaje);
  
  document.getElementById("texto").addEventListener("keypress", function (evento) {
    if (evento.key === "Enter") {
      enviarMensaje();
    }
  });
  
  document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("texto").focus();
  });
}

function inicializarAplicacion() {
  configurarEventos();
  inicializarPusher();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarAplicacion);
} else {
  inicializarAplicacion();
}