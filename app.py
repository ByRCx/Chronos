# -*- coding: utf-8 -*-
"""
Servidor Flask para el control del Autoclicker.
Este servidor simula el control de un script de automatización
al que la interfaz Chronos (index.html) se conecta
a través del endpoint /control.
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
import time # Usado para simular un proceso
import threading # Para manejar el clic en un hilo separado

app = Flask(__name__)
# Habilitar CORS para permitir que el frontend (index.html) se conecte
# desde diferentes orígenes (necesario en un entorno de desarrollo)
CORS(app) 

# Estado global del autoclicker
autoclicker_status = "DETENIDO"
click_thread = None
stop_event = threading.Event()

def run_clicker_loop(stop_event):
    """
    Función que simula el proceso de clic constante. 
    En un entorno real, aquí se usaría pyautogui.
    """
    global autoclicker_status
    autoclicker_status = "EJECUTANDO"
    print("--- Autoclicker Iniciado. (Simulación) ---")
    
    # Bucle de simulación: se ejecuta hasta que se establece el evento de parada
    while not stop_event.is_set():
        # Aquí iría el código real del clic (ej: pyautogui.click())
        # Para la simulación, simplemente esperamos y comprobamos la parada
        time.sleep(1) 
    
    autoclicker_status = "DETENIDO"
    print("--- Autoclicker Detenido. ---")

@app.route('/control', methods=['POST'])
def control_clicker():
    """
    Endpoint para iniciar, detener o verificar el estado del autoclicker.
    Payload: {"action": "start" | "stop" | "status"}
    """
    global click_thread, autoclicker_status, stop_event
    
    data = request.get_json()
    action = data.get('action')

    if action == "start":
        if autoclicker_status == "DETENIDO":
            stop_event.clear()
            click_thread = threading.Thread(target=run_clicker_loop, args=(stop_event,))
            click_thread.start()
            return jsonify({"status": "SUCCESS", "message": "Autoclicker Iniciado", "state": "EJECUTANDO"}), 200
        else:
            return jsonify({"status": "INFO", "message": "Autoclicker ya está en ejecución", "state": "EJECUTANDO"}), 200

    elif action == "stop":
        if autoclicker_status == "EJECUTANDO":
            stop_event.set()
            if click_thread and click_thread.is_alive():
                click_thread.join(timeout=2) # Espera un poco a que termine el hilo
            autoclicker_status = "DETENIDO"
            return jsonify({"status": "SUCCESS", "message": "Autoclicker Detenido", "state": "DETENIDO"}), 200
        else:
            return jsonify({"status": "INFO", "message": "Autoclicker ya está detenido", "state": "DETENIDO"}), 200

    elif action == "status":
        return jsonify({"status": "SUCCESS", "message": "Estado del Autoclicker", "state": autoclicker_status}), 200

    else:
        return jsonify({"status": "ERROR", "message": "Acción no válida"}), 400

if __name__ == '__main__':
    # Inicia el servidor Flask en el puerto 5000
    print("Iniciando Servidor Flask en http://127.0.0.1:5000...")
    print("El servidor permanecerá corriendo hasta que lo detengas (Ctrl+C).")
    # Es crucial que Flask se ejecute en el puerto 5000 para que el frontend lo encuentre
    app.run(debug=False, port=5000)