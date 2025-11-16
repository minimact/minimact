@echo off
echo Building Minimact Native AOT Runtime...
echo.

REM Add vswhere to PATH for Native AOT
set PATH=%PATH%;C:\Program Files (x86)\Microsoft Visual Studio\Installer

REM Build Minimact first
echo [1/2] Building Minimact.AspNetCore...
cd ..\src\Minimact.AspNetCore
dotnet build -c Release
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Minimact build failed!
    exit /b 1
)
echo.

REM Build AOT runtime
echo [2/2] Publishing Native AOT Runtime...
cd ..\..\cactus-browser\minimact-runtime-aot
dotnet publish -c Release -r win-x64
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Runtime publish failed!
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Native AOT Runtime built!
echo ========================================
echo Location: bin\Release\net8.0\win-x64\publish\minimact-runtime-aot.exe
dir bin\Release\net8.0\win-x64\publish\minimact-runtime-aot.exe
echo.
