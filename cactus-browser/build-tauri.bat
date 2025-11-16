@echo off
echo Setting up MSVC environment...
call "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvarsall.bat" x64

echo.
echo Building Tauri backend...
cd src-tauri
cargo build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Tauri build failed!
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Tauri backend built!
echo ========================================
