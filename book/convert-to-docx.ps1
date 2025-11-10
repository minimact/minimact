# Convert Minimact Book to DOCX for Reedsy

Write-Host "Converting Minimact book to DOCX format..." -ForegroundColor Cyan

# Create output directory
$outputDir = "docx-output"
if (!(Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# List of files
$files = @(
    "Introduction.md",
    "Chapter_01_The_Hydration_Trap.md",
    "Chapter_02_VNode_Trees.md",
    "Chapter_03_The_Rust_Reconciler.md",
    "Chapter_04_The_Babel_Plugin.md",
    "Chapter_05_Predictive_Rendering.md",
    "Chapter_06_State_Synchronization.md",
    "Chapter_07_Hot_Reload.md",
    "Chapter_08_Minimact_Swig.md",
    "Chapter_09_Conclusion.md",
    "Appendix_A_The_Name_Minimact.md",
    "Glossary.md"
)

# Convert each file
$count = 0
foreach ($file in $files) {
    if (Test-Path $file) {
        $count++
        $baseName = [System.IO.Path]::GetFileNameWithoutExtension($file)
        $outputFile = "$outputDir\$baseName.docx"

        Write-Host "Converting $file..." -ForegroundColor Yellow

        pandoc $file -o $outputFile --from markdown --to docx --standalone 2>$null

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  Created: $outputFile" -ForegroundColor Green
        }
    }
}

Write-Host "Conversion complete!" -ForegroundColor Cyan
Write-Host "Files converted: $count" -ForegroundColor Green
Write-Host "Output directory: $outputDir" -ForegroundColor Cyan

# Create combined manuscript
Write-Host "Creating combined manuscript..." -ForegroundColor Cyan
$combinedFile = "$outputDir\Refactoring_React_Complete.docx"
pandoc $files -o $combinedFile --from markdown --to docx --standalone --toc 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Combined manuscript created: $combinedFile" -ForegroundColor Green
}

Write-Host "Ready for Reedsy!" -ForegroundColor Magenta
