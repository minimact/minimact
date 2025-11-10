#!/usr/bin/env python3
"""
Apply chapter additions to the main chapter files.

This script reads the *_Additions.md files and inserts them into the
appropriate locations in the chapter files.
"""

import re
import sys
import io
from pathlib import Path

# Fix Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


def find_insertion_point(content: str, marker: str, line_hint: int = None) -> int:
    """
    Find the insertion point in the content.

    Args:
        content: The chapter content
        marker: A unique text marker to search for (section title, etc.)
        line_hint: Optional line number hint from the additions file

    Returns:
        Character position to insert at, or -1 if not found
    """
    lines = content.split('\n')

    # Try to find the marker
    for i, line in enumerate(lines):
        if marker.lower() in line.lower():
            # Insert after this section and its content
            # Find the next section (##) or end of file
            for j in range(i + 1, len(lines)):
                if lines[j].startswith('## ') and j > i + 1:
                    # Found next section, insert before it
                    return sum(len(lines[k]) + 1 for k in range(j))

            # No next section found, insert at end
            return len(content)

    return -1


def apply_chapter_additions(chapter_file: Path, additions_file: Path) -> bool:
    """
    Apply additions from additions_file to chapter_file.

    Returns:
        True if successful, False otherwise
    """
    print(f"\n{'='*60}")
    print(f"Processing: {chapter_file.name}")
    print(f"Additions from: {additions_file.name}")
    print(f"{'='*60}")

    # Read both files
    try:
        chapter_content = chapter_file.read_text(encoding='utf-8')
        additions_content = additions_file.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ Error reading files: {e}")
        return False

    # Parse the additions file into sections
    sections = []
    current_section = None
    current_content = []
    insertion_marker = None
    line_hint = None

    for line in additions_content.split('\n'):
        # Check for new section headers (multiple formats)
        is_section_header = (
            (line.startswith('## ') and ('NEW SECTION' in line or 'SECTION' in line or 'ADDITION' in line)) or
            (line.startswith('## 🔥') or line.startswith('## 📍'))
        )

        if is_section_header:
            # Save previous section if exists
            if current_section and current_content:
                sections.append({
                    'title': current_section,
                    'content': '\n'.join(current_content),
                    'marker': insertion_marker,
                    'line_hint': line_hint
                })

            # Start new section
            current_section = line
            current_content = []
            insertion_marker = None
            line_hint = None

        # Check for insertion instructions (multiple formats)
        elif line.startswith('**Insert after') or line.startswith('**Location') or 'After "' in line or "After '" in line:
            # Extract the marker - try multiple patterns

            # Pattern 1: **Insert after "Section Title"**
            match = re.search(r'Insert after ["\'](.+?)["\']', line)

            # Pattern 2: **Location**: After line 631 (end of PathConverter code block)
            if not match:
                match = re.search(r'\((.+?)\)$', line)  # Extract text in parentheses at end

            # Pattern 3: After "Section Title" Section
            if not match:
                match = re.search(r'After ["\'"](.+?)["\'"] [Ss]ection', line)

            # Pattern 4: Simple "After something"
            if not match:
                match = re.search(r'After (.+?)(?:\(|line|$)', line)

            if match:
                insertion_marker = match.group(1).strip()

            # Extract line number hint
            match = re.search(r'[Ll]ine[~\s]+(\d+)', line)
            if match:
                line_hint = int(match.group(1))

        # Check for "Add this section" markers
        elif line.startswith('### Add:') or line.startswith('**Add this section'):
            # This is a subsection title, extract it
            if '### Add:' in line:
                subsection_title = line.replace('### Add:', '').strip().strip('"')
                current_content.append(f"### {subsection_title}")
            continue

        # Check for section dividers
        elif line.startswith('---') and current_section:
            if not current_content or current_content[-1] != '---':
                current_content.append(line)

        # Skip instruction lines
        elif line.startswith('**Insert this section') or line.startswith('**Current Problem'):
            continue

        # Regular content
        elif current_section and line.strip() and not line.startswith('>'):
            current_content.append(line)

    # Save last section
    if current_section and current_content:
        sections.append({
            'title': current_section,
            'content': '\n'.join(current_content),
            'marker': insertion_marker,
            'line_hint': line_hint
        })

    if not sections:
        print("WARNING: No sections found in additions file")
        return False

    print(f"\nFound {len(sections)} sections to add:")
    for i, section in enumerate(sections, 1):
        title = section['title'].replace('## ', '').replace('🐛 ', '').replace('⚡ ', '').replace('🛡️ ', '').replace('📊 ', '').replace('🤔 ', '')
        print(f"  {i}. {title[:60]}...")

    # Auto-confirm if running non-interactively
    try:
        response = input("\nApply these additions? (y/n): ").strip().lower()
        if response != 'y':
            print("Cancelled")
            return False
    except EOFError:
        # Non-interactive mode, auto-confirm
        print("Auto-confirming (non-interactive mode)")
        pass

    # Apply each section
    modified_content = chapter_content
    additions_made = 0

    for section in sections:
        marker = section['marker']
        content_to_add = section['content']

        if not marker:
            print(f"\nWARNING: No insertion marker for: {section['title'][:50]}...")
            print("   Skipping this section")
            continue

        # Find insertion point
        pos = find_insertion_point(modified_content, marker, section['line_hint'])

        if pos == -1:
            print(f"\nWARNING: Could not find insertion point for marker: '{marker}'")
            print("   You may need to manually add this section")
            continue

        # Insert the content
        modified_content = (
            modified_content[:pos] +
            "\n\n" + content_to_add + "\n\n" +
            modified_content[pos:]
        )

        additions_made += 1
        print(f"OK: Added: {section['title'][:50]}...")

    if additions_made == 0:
        print("\nERROR: No additions were made")
        return False

    # Create backup
    backup_file = chapter_file.with_suffix('.md.backup')
    backup_file.write_text(chapter_content, encoding='utf-8')
    print(f"\nBackup created: {backup_file.name}")

    # Write modified content
    chapter_file.write_text(modified_content, encoding='utf-8')
    print(f"SUCCESS: Updated: {chapter_file.name}")
    print(f"   {additions_made}/{len(sections)} sections added successfully")

    return True


def main():
    """Main entry point."""
    book_dir = Path(__file__).parent

    # Find all addition files
    addition_files = sorted(book_dir.glob('Chapter_*_Additions.md'))

    if not addition_files:
        print("No addition files found!")
        return 1

    print("Found addition files:")
    for f in addition_files:
        print(f"  - {f.name}")

    # Process each one
    success_count = 0
    for additions_file in addition_files:
        # Find corresponding chapter file
        chapter_num = re.search(r'Chapter_(\d+)', additions_file.name).group(1)

        # Try to find the chapter file (might have different naming)
        chapter_files = list(book_dir.glob(f'Chapter_{chapter_num}_*.md'))
        chapter_files = [f for f in chapter_files if 'Additions' not in f.name and 'backup' not in f.name]

        if not chapter_files:
            print(f"\nWARNING: No chapter file found for {additions_file.name}")
            continue

        chapter_file = chapter_files[0]

        if apply_chapter_additions(chapter_file, additions_file):
            success_count += 1

    print(f"\n{'='*60}")
    print(f"SUCCESS: Processed {success_count}/{len(addition_files)} files")
    print(f"{'='*60}")

    return 0 if success_count == len(addition_files) else 1


if __name__ == '__main__':
    sys.exit(main())
