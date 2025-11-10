@echo off
echo Converting Minimact book to DOCX...
echo.

cd /d "%~dp0"

if not exist docx-output mkdir docx-output

echo Converting Introduction...
pandoc Introduction.md -o docx-output/Introduction.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 1...
pandoc Chapter_01_The_Hydration_Trap.md -o docx-output/Chapter_01.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 2...
pandoc Chapter_02_VNode_Trees.md -o docx-output/Chapter_02.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 3...
pandoc Chapter_03_The_Rust_Reconciler.md -o docx-output/Chapter_03.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 4...
pandoc Chapter_04_The_Babel_Plugin.md -o docx-output/Chapter_04.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 5...
pandoc Chapter_05_Predictive_Rendering.md -o docx-output/Chapter_05.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 6...
pandoc Chapter_06_State_Synchronization.md -o docx-output/Chapter_06.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 7...
pandoc Chapter_07_Hot_Reload.md -o docx-output/Chapter_07.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 8...
pandoc Chapter_08_Minimact_Swig.md -o docx-output/Chapter_08.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Chapter 9...
pandoc Chapter_09_Conclusion.md -o docx-output/Chapter_09.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Appendix A...
pandoc Appendix_A_The_Name_Minimact.md -o docx-output/Appendix_A.docx --from markdown-yaml_metadata_block --to docx --standalone

echo Converting Glossary...
pandoc Glossary.md -o docx-output/Glossary.docx --from markdown-yaml_metadata_block --to docx --standalone

echo.
echo Creating combined manuscript...
pandoc Introduction.md Chapter_01_The_Hydration_Trap.md Chapter_02_VNode_Trees.md Chapter_03_The_Rust_Reconciler.md Chapter_04_The_Babel_Plugin.md Chapter_05_Predictive_Rendering.md Chapter_06_State_Synchronization.md Chapter_07_Hot_Reload.md Chapter_08_Minimact_Swig.md Chapter_09_Conclusion.md Appendix_A_The_Name_Minimact.md Glossary.md -o docx-output/Refactoring_React_Complete_Manuscript.docx --from markdown-yaml_metadata_block --to docx --standalone --toc --toc-depth=2

echo.
echo Done! DOCX files are in: docx-output/
echo.
echo Import these files into Reedsy:
echo   - Individual chapters (for chapter-by-chapter editing)
echo   - OR complete manuscript (for full-book upload)
echo.
pause
