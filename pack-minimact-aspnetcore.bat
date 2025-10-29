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

echo [pack-minimact-aspnetcore] Packing Minimact.AspNetCore...
dotnet pack "%PROJECT_PATH%" --configuration Release --output "%OUTPUT_DIR%"
if errorlevel 1 (
  echo [pack-minimact-aspnetcore] dotnet pack failed.
  exit /b 1
)

echo [pack-minimact-aspnetcore] Package created in "%OUTPUT_DIR%".
exit /b 0
