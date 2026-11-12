@echo off
rem Lance ANAT Pilotage sur cet ordinateur, avec les comptes de demonstration.
cd /d "%~dp0"
set CADENCE_DEMO=1

rem Un ancien serveur occupe deja le port 4000 : on le signale au lieu d'echouer sans explication
netstat -ano | findstr /r /c:":4000 .*LISTENING" >nul
if %errorlevel%==0 (
  echo.
  echo Le port 4000 est deja utilise : ANAT Pilotage tourne peut-etre deja.
  echo Ouvrez http://localhost:4000 dans le navigateur, ou fermez l'ancienne fenetre puis relancez.
  echo.
  pause
  exit /b 1
)

rem Installe les dependances au premier lancement, puis construit la version a jour
if not exist node_modules (
  echo Installation des dependances...
  call npm install || goto :erreur
)
echo Construction de l'application...
call npm run build || goto :erreur

echo.
echo ANAT Pilotage demarre : ouvrez http://localhost:4000
echo.
call npm start
pause
exit /b 0

:erreur
echo.
echo Le lancement a echoue : voir le message ci-dessus.
pause
exit /b 1
