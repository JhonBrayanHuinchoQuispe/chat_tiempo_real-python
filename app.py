import os
from flask import Flask, render_template, request, jsonify 
from flask_cors import CORS 
from dotenv import load_dotenv
import pusher

load_dotenv()

# Inicio Flask y habilito CORS para permitir el frontend
aplicacion = Flask(__name__)
CORS(aplicacion)


ID_APLICACION_PUSHER = os.getenv("PUSHER_APP_ID")
CLAVE_PUSHER = os.getenv("PUSHER_KEY")
SECRETO_PUSHER = os.getenv("PUSHER_SECRET")
CLUSTER_PUSHER = os.getenv("PUSHER_CLUSTER", "mt1")


cliente_pusher = None
if ID_APLICACION_PUSHER and CLAVE_PUSHER and SECRETO_PUSHER:
    cliente_pusher = pusher.Pusher(
        app_id=ID_APLICACION_PUSHER,
        key=CLAVE_PUSHER,
        secret=SECRETO_PUSHER,
        cluster=CLUSTER_PUSHER,
        ssl=True,
    )

MENSAJES = []


@aplicacion.route("/")
def pagina_principal():
    return render_template(
        "index.html",
        clave_pusher=CLAVE_PUSHER or "",
        cluster_pusher=CLUSTER_PUSHER,
        pusher_configurado=bool(cliente_pusher),
    )


# Puntoo de entrada HTTP: recibo el mensaje y lo reenvio a todos
@aplicacion.route("/api/mensaje", methods=["POST"]) 
def enviar_mensaje():
    datos = request.get_json(silent=True) or {}
    texto = (datos.get("texto") or request.form.get("texto") or "").strip()
    usuario = (datos.get("usuario") or request.form.get("usuario") or "Anónimo").strip()

    if not texto:
        return jsonify({"error": "El texto del mensaje es requerido"}), 400

    mensaje = {"usuario": usuario, "texto": texto}
    MENSAJES.append(mensaje)
    
    if cliente_pusher:
        try:
            cliente_pusher.trigger("chat", "nuevo_mensaje", mensaje)
        except Exception as error:
            return jsonify({"estado": "fallido", "razon": str(error)}), 500

        return jsonify({"estado": "exitoso"})


if __name__ == "__main__":
    puerto = int(os.getenv("PORT", 5000))
    aplicacion.run(host="0.0.0.0", port=puerto, debug=True)