@echo off
REM ===================================================================
REM  Zmanim Flyer Maker - double-click this file to start.
REM  Keep the black window open while you work. Close it when done.
REM ===================================================================
title Zmanim Flyer Maker
cd /d "%~dp0"

echo.
echo   Starting the Zmanim Flyer Maker...
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   ---------------------------------------------------------
  echo   Node.js is not installed on this computer.
  echo.
  echo   Please install it first, from:  https://nodejs.org
  echo   Choose the big green "LTS" button, accept the defaults,
  echo   then double-click this file again.
  echo   ---------------------------------------------------------
  echo.
  pause
  exit /b 1
)

REM First run only: fetch the building blocks. Takes a few minutes.
if not exist "node_modules\" (
  echo   First time setup - this takes a few minutes. Please wait...
  echo.
  call npm ci
  if errorlevel 1 goto failed
)

REM First run only, or after an update: prepare the app.
if not exist "dist\server\wrangler.json" (
  echo   Preparing the app - about a minute...
  echo.
  call npm run build
  if errorlevel 1 goto failed
)

echo.
echo   ---------------------------------------------------------
echo    Ready. Your browser should open by itself.
echo    If it doesn't, open Chrome and go to:
echo.
echo        http://localhost:3000
echo.
echo    LEAVE THIS BLACK WINDOW OPEN while you work.
echo    Closing it stops the flyer maker.
echo   ---------------------------------------------------------
echo.

REM Give the server a head start, then open the browser. `ping` is used as the
REM delay on purpose: `timeout` refuses to run whenever input is redirected,
REM which silently breaks this line in some launch contexts.
start "" /b cmd /c "ping -n 8 127.0.0.1 >nul & start "" http://localhost:3000"

call npm start

echo.
echo   The flyer maker has stopped. You can close this window.
pause
exit /b 0

:failed
echo.
echo   ---------------------------------------------------------
echo   Something went wrong during setup.
echo   Take a photo of this window and send it to Yaakov.
echo   ---------------------------------------------------------
echo.
pause
exit /b 1
