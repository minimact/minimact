# Reedsy Conversion Guide

## Quick Start

1. **Open a new Command Prompt** (to pick up Pandoc in PATH)
2. Navigate to the book folder:
   ```
   cd J:\projects\minimact\book
   ```
3. Run the conversion script:
   ```
   convert.bat
   ```
4. Your DOCX files will be in `docx-output/`

## What Gets Created

### Individual Chapter Files
- `Introduction.docx`
- `Chapter_01.docx` through `Chapter_09.docx`
- `Appendix_A.docx`
- `Glossary.docx`

### Combined Manuscript
- `Refactoring_React_Complete_Manuscript.docx`
  - Includes all chapters in order
  - Has Table of Contents
  - Ready for full-book import

## Importing to Reedsy

### Option 1: Individual Chapters (Recommended)
1. Go to Reedsy Book Editor
2. Create new book: "Refactoring React"
3. Import each chapter individually:
   - Click "+ Add Chapter"
   - Select "Import from File"
   - Upload the DOCX file
   - Reedsy will preserve formatting

**Benefits:**
- ✅ Better control over chapter structure
- ✅ Easy to reorder chapters
- ✅ Better formatting preservation
- ✅ Can edit chapters independently

### Option 2: Full Manuscript Upload
1. Upload `Refactoring_React_Complete_Manuscript.docx`
2. Reedsy will auto-split into chapters
3. Review and adjust formatting

**Benefits:**
- ✅ Faster initial upload
- ✅ Keeps everything in one file
- ⚠️ May need formatting cleanup

## Reedsy Tips

### Before Uploading:
1. **Book Metadata**
   - Title: "Refactoring React"
   - Subtitle: "How I Hyper-Optimized the Framework That Rules the Web In 0.1ms"
   - Author: [Your Name]
   - Genre: Computers & Technology

2. **Cover**
   - Upload `cover.jpg` separately
   - Reedsy will format it properly

### After Uploading:
1. **Check Code Formatting**
   - Reedsy should preserve code blocks
   - May need to adjust font (use monospace)

2. **Fix Typography**
   - Reedsy auto-applies smart quotes
   - Check technical terms (hex paths, etc.)

3. **Add Front Matter**
   - Copyright page
   - Dedication (optional)
   - Acknowledgments (optional)

4. **Add Back Matter**
   - About the Author
   - More Books By (if applicable)

## Formatting in Reedsy

### Code Blocks
If code blocks aren't formatted correctly:
1. Select the code block
2. Click "Format" → "Code Block"
3. Choose monospace font

### Headings
Reedsy auto-detects:
- `# Heading` → Chapter Title
- `## Heading` → Section
- `### Heading` → Subsection

### Tables
Tables should import correctly from Markdown.
If not:
1. Recreate using Reedsy's table tool
2. Or convert to bullet lists (simpler)

## Export from Reedsy

Once editing is complete:

1. **EPUB** (for Kindle, Apple Books, etc.)
   - Click "Export" → "EPUB"
   - Upload to KDP (Kindle Direct Publishing)

2. **PDF** (for print/Leanpub)
   - Click "Export" → "PDF"
   - Choose print size (6x9 recommended for technical books)

3. **DOCX** (for backup/submission)
   - Click "Export" → "DOCX"
   - Keep as master copy

## Troubleshooting

### Pandoc not found
**Solution:** Close this window, open a **new** Command Prompt, and try again.
(The new window will have Pandoc in PATH)

### Code blocks look wrong
**Solution:** In Reedsy, select code → Format → Code Block → Courier New

### Tables are broken
**Solution:**
1. Copy table data
2. Use Reedsy's table editor
3. Or convert to bullet lists

### Special characters (→, ✅, etc.) not showing
**Solution:** Reedsy supports Unicode. If they don't show:
1. Replace with text equivalents
2. Or use HTML entities

## Book Structure in Reedsy

```
Front Matter
├─ Title Page (auto-generated)
├─ Copyright Page (add manually)
└─ Table of Contents (auto-generated)

Main Content
├─ Introduction
├─ Chapter 1: The Hydration Trap
├─ Chapter 2: VNode Trees
├─ Chapter 3: The Rust Reconciler
├─ Chapter 4: The Babel Plugin
├─ Chapter 5: Predictive Rendering
├─ Chapter 6: State Synchronization
├─ Chapter 7: Hot Reload
├─ Chapter 8: Minimact Swig
└─ Chapter 9: Conclusion

Back Matter
├─ Appendix A: The Name Minimact
├─ Glossary
└─ About the Author (add manually)
```

## File Sizes

Expected DOCX sizes:
- Individual chapters: 50-500 KB each
- Complete manuscript: ~2-3 MB
- With embedded images: larger

## Next Steps

1. ✅ Run `convert.bat` to create DOCX files
2. ✅ Upload to Reedsy
3. ✅ Review formatting
4. ✅ Add front/back matter
5. ✅ Export to EPUB/PDF
6. 🚀 Publish!

---

**Questions?**
- Reedsy Help: https://reedsy.com/write-a-book
- Pandoc Docs: https://pandoc.org/MANUAL.html
