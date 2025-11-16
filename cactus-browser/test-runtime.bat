@echo off
echo Testing Minimact Native AOT Runtime...
echo.

REM Create test request
echo Creating test request...
echo { > test-request.json
echo   "csharp": "using System;\nusing System.Collections.Generic;\nusing Minimact.AspNetCore.Core;\n\npublic class TestComponent : MinimactComponent\n{\n    protected override VNode Render()\n    {\n        return new VElement(\"div\", new Dictionary^<string, string^> { [\"class\"] = \"test\" })\n        {\n            Children = new List^<VNode^>\n            {\n                new VText(\"Hello from Cactus Browser! 🌵\") { Path = \"1.1\" }\n            },\n            Path = \"1\"\n        };\n    }\n}", >> test-request.json
echo   "templates": {}, >> test-request.json
echo   "initialState": {} >> test-request.json
echo } >> test-request.json

REM Run runtime
echo.
echo Running runtime...
echo ========================================
minimact-runtime-aot\bin\Release\net8.0\win-x64\publish\minimact-runtime-aot.exe test-request.json
echo ========================================

REM Cleanup
del test-request.json

echo.
echo Test complete!
