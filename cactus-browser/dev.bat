@echo off
echo Starting Cactus Browser Development Mode...
echo.

REM Check if runtime is built
if not exist "minimact-runtime-aot\bin\Release\net8.0\win-x64\publish\minimact-runtime-aot.exe" (
    echo Runtime not found! Building first...
    call build-runtime.bat
    if %ERRORLEVEL% NEQ 0 exit /b 1
)

REM Start Tauri dev server
echo.
echo Starting Tauri dev server...
pnpm tauri dev
