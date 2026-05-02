@echo off
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 scripts\start.py
  goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python scripts\start.py
  goto end
)

echo No se encontro Python 3. Arrancando directamente con npm.
where npm >nul 2>nul
if not %errorlevel%==0 (
  echo No se encontro Node.js/npm. Se abrira la pagina oficial de Node.js.
  start https://nodejs.org/
  pause
  goto end
)
if not exist node_modules (
  npm install
)
start http://localhost:5173/
npm start

:end
