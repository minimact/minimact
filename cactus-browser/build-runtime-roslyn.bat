@echo off
echo Building Minimact Runtime with Roslyn Support...
echo.

echo [1/2] Building Minimact.AspNetCore...
cd ..\src\Minimact.AspNetCore
dotnet build -c Release
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Minimact.AspNetCore build failed!
    exit /b 1
)
cd ..\..\cactus-browser

echo.
echo [2/2] Building Minimact Runtime (with Roslyn)...
cd minimact-runtime
dotnet publish -c Release -r win-x64 --self-contained false
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Runtime build failed!
    exit /b 1
)
cd ..

echo.
echo ========================================
echo SUCCESS! Runtime built with Roslyn!
echo ========================================
echo Location: minimact-runtime\bin\Release\net8.0\win-x64\publish\minimact-runtime.exe
dir /s minimact-runtime\bin\Release\net8.0\win-x64\publish\minimact-runtime.exe
