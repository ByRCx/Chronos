@echo off
echo ===========================================
echo Chronos - Script de Arranque de Servidor
echo ===========================================

:: Verifica si python está disponible en el PATH
where python >nul 2>nul
if %errorlevel% neq 0 (
echo.
echo ERROR: Python no se encontró en tu sistema.
echo Asegúrate de tener Python instalado y añadido al PATH.
pause
exit /b 1
)

echo.
echo 1. Instalando dependencias de Python (Flask)...
python -m pip install Flask flask_cors --quiet

if %errorlevel% neq 0 (
echo.
echo ERROR: Falló la instalación de dependencias.
echo Asegúrate de tener permisos y acceso a Internet.
pause
exit /b 1
)

echo.
echo 2. Iniciando el servidor Flask...
echo    (Servidor API en: https://www.google.com/search?q=http://127.0.0.1:5000)
echo.
python app.py

:: El script se detiene aquí hasta que el usuario cierra la ventana del servidor

echo.
echo Servidor detenido. Presiona cualquier tecla para salir.
pause