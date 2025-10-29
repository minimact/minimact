@echo off
setlocal enabledelayedexpansion

rem Determine repo root (directory of this script)
set "REPO_ROOT=%~dp0"
set "PROJECT_PATH=%REPO_ROOT%src\Minimact.AspNetCore\Minimact.AspNetCore.csproj"
set "OUTPUT_DIR=%REPO_ROOT%artifacts\nuget"

if not exist "%PROJECT_PATH%" (
  echo [pack-minimact-aspnetcore] Project file not found: "%PROJECT_PATH%"
  exit /b 1
)

if not exist "%OUTPUT_DIR%" (
  mkdir "%OUTPUT_DIR%"
)

echo [pack-minimact-aspnetcore] Building Minimact native library with cargo...
pushd "%REPO_ROOT%src" >nul
cargo build --release
set "CARGO_EXIT=%ERRORLEVEL%"
popd >nul
if not "%CARGO_EXIT%"=="0" (
  echo [pack-minimact-aspnetcore] cargo build failed.
  exit /b %CARGO_EXIT%
)

echo [pack-minimact-aspnetcore] Building Minimact.AspNetCore (Release)...
dotnet build "%PROJECT_PATH%" --configuration Release
if errorlevel 1 (
  echo [pack-minimact-aspnetcore] dotnet build failed.
  exit /b 1
)

echo [pack-minimact-aspnetcore] Packing Minimact.AspNetCore...
dotnet pack "%PROJECT_PATH%" --configuration Release --output "%OUTPUT_DIR%"
if errorlevel 1 (
  echo [pack-minimact-aspnetcore] dotnet pack failed.
  exit /b 1
)

echo [pack-minimact-aspnetcore] Package created in "%OUTPUT_DIR%".
exit /b 0
