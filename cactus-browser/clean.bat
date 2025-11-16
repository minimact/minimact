@echo off
echo Cleaning Cactus Browser build artifacts...
echo.

REM Clean .NET runtime
echo Cleaning minimact-runtime-aot...
cd minimact-runtime-aot
if exist bin rmdir /s /q bin
if exist obj rmdir /s /q obj
cd ..

REM Clean Tauri
echo Cleaning Tauri...
cd src-tauri
if exist target rmdir /s /q target
cd ..

REM Clean Node modules (optional - comment out if you want to keep)
REM echo Cleaning node_modules...
REM if exist node_modules rmdir /s /q node_modules

echo.
echo Clean complete!
