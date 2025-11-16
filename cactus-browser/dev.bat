@echo off
echo Starting Cactus Browser Development Mode...
echo.

REM Set up MSVC environment
echo Setting up MSVC environment...
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Could not set up MSVC environment!
    echo Please install Visual Studio 2022 with "Desktop development with C++" workload
    exit /b 1
)

REM Check if runtime is built
if not exist "minimact-runtime-aot\bin\Release\net8.0\win-x64\publish\minimact-runtime-aot.exe" (
    echo Runtime not found! Building first...
    call build-runtime.bat
    if %ERRORLEVEL% NEQ 0 exit /b 1
)

REM Start Tauri dev server
echo.
echo ========================================
echo Starting Tauri dev server...
echo ========================================
echo.
pnpm tauri dev
