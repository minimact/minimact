import { GridPatch, GridAnimationOptions } from './types';

/**
 * GridPatcher - Applies surgical patches to grid DOM
 *
 * Handles:
 * - Insert row at index
 * - Update row at index
 * - Delete row at index
 * - Update cell value
 * - Replace entire grid
 * - Replace page (for pagination)
 */
export class GridPatcher {
  private animationOptions: GridAnimationOptions;

  constructor(
    private container: HTMLElement,
    private gridId: string,
    animationOptions: GridAnimationOptions = {}
  ) {
    this.animationOptions = {
      insertDuration: animationOptions.insertDuration ?? 300,
      updateDuration: animationOptions.updateDuration ?? 500,
      deleteDuration: animationOptions.deleteDuration ?? 300,
      flashOnUpdate: animationOptions.flashOnUpdate ?? true,
      flashColor: animationOptions.flashColor ?? '#fffacd'
    };
  }

  /**
   * Apply a grid patch
   */
  applyPatch(patch: GridPatch): void {
    const startTime = performance.now();

    try {
      switch (patch.type) {
        case 'insertRow':
          this.insertRow(patch);
          break;
        case 'updateRow':
          this.updateRow(patch);
          break;
        case 'deleteRow':
          this.deleteRow(patch);
          break;
        case 'updateCell':
          this.updateCell(patch);
          break;
        case 'replaceGrid':
          this.replaceGrid(patch);
          break;
        case 'replacePage':
          this.replacePage(patch);
          break;
        default:
          console.warn('[GridPatcher] Unknown patch type:', (patch as any).type);
      }

      const latency = performance.now() - startTime;
      console.log(`[GridPatcher] Applied ${patch.type} patch in ${latency.toFixed(2)}ms`);
    } catch (error) {
      console.error('[GridPatcher] Error applying patch:', error);
    }
  }

  /**
   * Insert a new row at specified index
   */
  private insertRow(patch: GridPatch): void {
    if (patch.rowIndex === undefined || !patch.html) {
      console.error('[GridPatcher] insertRow missing rowIndex or html');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) return;

    const rows = Array.from(tbody.children);

    // Create new row element
    const newRow = this.createElementFromHtml(patch.html);
    if (!newRow) {
      console.error('[GridPatcher] Failed to create row from html');
      return;
    }

    // Insert at index
    if (patch.rowIndex >= rows.length) {
      tbody.appendChild(newRow);
    } else {
      tbody.insertBefore(newRow, rows[patch.rowIndex]);
    }

    // Animate row insertion
    this.animateRowInsert(newRow as HTMLElement);
  }

  /**
   * Update existing row at index
   */
  private updateRow(patch: GridPatch): void {
    if (patch.rowIndex === undefined || !patch.html) {
      console.error('[GridPatcher] updateRow missing rowIndex or html');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) return;

    const row = tbody.children[patch.rowIndex];
    if (!row) {
      console.error('[GridPatcher] Row not found at index:', patch.rowIndex);
      return;
    }

    // Create new row element
    const newRow = this.createElementFromHtml(patch.html);
    if (!newRow) {
      console.error('[GridPatcher] Failed to create row from html');
      return;
    }

    // Replace row
    tbody.replaceChild(newRow, row);

    // Animate row update
    if (this.animationOptions.flashOnUpdate) {
      this.animateRowUpdate(newRow as HTMLElement);
    }
  }

  /**
   * Delete row at index
   */
  private deleteRow(patch: GridPatch): void {
    if (patch.rowIndex === undefined) {
      console.error('[GridPatcher] deleteRow missing rowIndex');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) return;

    const row = tbody.children[patch.rowIndex];
    if (!row) {
      console.error('[GridPatcher] Row not found at index:', patch.rowIndex);
      return;
    }

    // Animate row deletion
    this.animateRowDelete(row as HTMLElement, () => {
      tbody.removeChild(row);
    });
  }

  /**
   * Update single cell value
   */
  private updateCell(patch: GridPatch): void {
    if (patch.rowIndex === undefined || patch.cellIndex === undefined || patch.value === undefined) {
      console.error('[GridPatcher] updateCell missing rowIndex, cellIndex, or value');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) return;

    const row = tbody.children[patch.rowIndex];
    if (!row) {
      console.error('[GridPatcher] Row not found at index:', patch.rowIndex);
      return;
    }

    const cell = row.children[patch.cellIndex];
    if (!cell) {
      console.error('[GridPatcher] Cell not found at index:', patch.cellIndex);
      return;
    }

    // Update cell content
    const oldValue = cell.textContent;
    cell.textContent = patch.value;

    // Animate cell update
    if (oldValue !== patch.value && this.animationOptions.flashOnUpdate) {
      this.animateCellUpdate(cell as HTMLElement);
    }
  }

  /**
   * Replace entire grid
   */
  private replaceGrid(patch: GridPatch): void {
    if (!patch.html) {
      console.error('[GridPatcher] replaceGrid missing html');
      return;
    }

    this.container.innerHTML = patch.html;
  }

  /**
   * Replace page (for pagination)
   */
  private replacePage(patch: GridPatch): void {
    if (!patch.html) {
      console.error('[GridPatcher] replacePage missing html');
      return;
    }

    const tbody = this.getGridBody();
    if (!tbody) {
      console.error('[GridPatcher] Grid body not found for replacePage');
      return;
    }

    // Fade out current rows
    const rows = Array.from(tbody.children) as HTMLElement[];
    rows.forEach(row => {
      row.style.transition = `opacity ${this.animationOptions.deleteDuration}ms ease`;
      row.style.opacity = '0';
    });

    // Replace after fade out
    setTimeout(() => {
      tbody.innerHTML = patch.html || '';

      // Fade in new rows
      const newRows = Array.from(tbody.children) as HTMLElement[];
      newRows.forEach((row, index) => {
        row.style.opacity = '0';
        setTimeout(() => {
          row.style.transition = `opacity ${this.animationOptions.insertDuration}ms ease`;
          row.style.opacity = '1';
        }, index * 50); // Stagger animation
      });
    }, this.animationOptions.deleteDuration);
  }

  /**
   * Get grid body element (usually <div> containing rows)
   */
  private getGridBody(): Element | null {
    // Assume grid structure: <div data-grid-id="..."><div class="grid-body">rows...</div></div>
    const body = this.container.querySelector('.grid-body') || this.container;
    return body;
  }

  /**
   * Create element from HTML string
   */
  private createElementFromHtml(html: string): Element | null {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html.trim();
    return tempDiv.firstElementChild;
  }

  /**
   * Animate row insertion
   */
  private animateRowInsert(row: HTMLElement): void {
    row.style.opacity = '0';
    row.style.transform = 'translateY(-10px)';

    requestAnimationFrame(() => {
      row.style.transition = `opacity ${this.animationOptions.insertDuration}ms ease, transform ${this.animationOptions.insertDuration}ms ease`;
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';

      // Clean up after animation
      setTimeout(() => {
        row.style.transition = '';
        row.style.transform = '';
      }, this.animationOptions.insertDuration!);
    });
  }

  /**
   * Animate row update
   */
  private animateRowUpdate(row: HTMLElement): void {
    const originalBg = row.style.backgroundColor;
    row.style.backgroundColor = this.animationOptions.flashColor!;

    setTimeout(() => {
      row.style.transition = `background-color ${this.animationOptions.updateDuration}ms ease`;
      row.style.backgroundColor = originalBg;

      // Clean up after animation
      setTimeout(() => {
        row.style.transition = '';
      }, this.animationOptions.updateDuration!);
    }, 100);
  }

  /**
   * Animate row deletion
   */
  private animateRowDelete(row: HTMLElement, callback: () => void): void {
    row.style.transition = `opacity ${this.animationOptions.deleteDuration}ms ease, transform ${this.animationOptions.deleteDuration}ms ease`;
    row.style.opacity = '0';
    row.style.transform = 'translateX(-20px)';

    setTimeout(callback, this.animationOptions.deleteDuration);
  }

  /**
   * Animate cell update
   */
  private animateCellUpdate(cell: HTMLElement): void {
    const originalBg = cell.style.backgroundColor;
    cell.style.backgroundColor = '#90ee90'; // Light green flash

    setTimeout(() => {
      cell.style.transition = `background-color ${this.animationOptions.updateDuration}ms ease`;
      cell.style.backgroundColor = originalBg;

      // Clean up after animation
      setTimeout(() => {
        cell.style.transition = '';
      }, this.animationOptions.updateDuration!);
    }, 100);
  }

  /**
   * Update animation options
   */
  setAnimationOptions(options: GridAnimationOptions): void {
    this.animationOptions = { ...this.animationOptions, ...options };
  }

  /**
   * Disable all animations
   */
  disableAnimations(): void {
    this.animationOptions = {
      insertDuration: 0,
      updateDuration: 0,
      deleteDuration: 0,
      flashOnUpdate: false
    };
  }

  /**
   * Enable all animations
   */
  enableAnimations(): void {
    this.animationOptions = {
      insertDuration: 300,
      updateDuration: 500,
      deleteDuration: 300,
      flashOnUpdate: true,
      flashColor: '#fffacd'
    };
  }
}
