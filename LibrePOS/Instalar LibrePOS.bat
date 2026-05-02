@echo off
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 scripts\install.py
  goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python scripts\install.py
  goto end
)

echo No se encontro Python 3. Usando instalacion directa con npm.
where npm >nul 2>nul
if not %errorlevel%==0 (
  echo No se encontro Node.js/npm. Se abrira la pagina oficial de Node.js.
  start https://nodejs.org/
  pause
  goto end
)
npm install
npm run build
pause

:end
