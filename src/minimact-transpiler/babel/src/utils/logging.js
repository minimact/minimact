/**
 * Logging Utilities for Minimact Transpiler
 *
 * Provides consistent, structured logging throughout the transpilation process.
 * Supports multiple log levels and formatted output.
 */

// Log levels
const LOG_LEVELS = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  VERBOSE: 5
};

// Current log level (default: INFO)
let currentLogLevel = LOG_LEVELS.INFO;

// Color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

/**
 * Set log level
 *
 * Controls verbosity of logging output.
 *
 * @param {string|number} level - Log level name or number
 */
function setLogLevel(level) {
  if (typeof level === 'string') {
    const upperLevel = level.toUpperCase();
    if (LOG_LEVELS[upperLevel] !== undefined) {
      currentLogLevel = LOG_LEVELS[upperLevel];
    }
  } else if (typeof level === 'number') {
    currentLogLevel = level;
  }
}

/**
 * Get current log level
 *
 * @returns {number} - Current log level
 */
function getLogLevel() {
  return currentLogLevel;
}

/**
 * Check if level should be logged
 *
 * @param {number} level - Level to check
 * @returns {boolean} - True if should log
 */
function shouldLog(level) {
  return currentLogLevel >= level;
}

/**
 * Format message with color
 *
 * @param {string} message - Message to format
 * @param {string} color - Color name
 * @returns {string} - Formatted message
 */
function colorize(message, color) {
  if (process.env.NO_COLOR) {
    return message;
  }
  return `${COLORS[color] || ''}${message}${COLORS.reset}`;
}

/**
 * Log element processing
 *
 * Logs when a JSX element is being processed.
 *
 * @param {string} tagName - Element tag name (e.g., "div", "button")
 * @param {string} path - Hex path
 */
function logElement(tagName, path) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  const message = `  ${colorize('[Element]', 'cyan')} <${colorize(tagName, 'blue')}> → ${colorize(path, 'gray')}`;
  console.log(message);
}

/**
 * Log text node processing
 *
 * @param {string} text - Text content
 * @param {string} path - Hex path
 */
function logText(text, path) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  const preview = text.length > 30 ? `${text.substring(0, 30)}...` : text;
  const message = `    ${colorize('[Text]', 'gray')} "${colorize(preview, 'white')}" → ${colorize(path, 'gray')}`;
  console.log(message);
}

/**
 * Log expression processing
 *
 * @param {string} type - Expression type (e.g., "Identifier", "MemberExpression")
 * @param {string} raw - Raw expression string
 * @param {string} path - Hex path
 */
function logExpression(type, raw, path) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  const preview = raw.length > 40 ? `${raw.substring(0, 40)}...` : raw;
  const message = `    ${colorize('[Expr]', 'magenta')} {${colorize(preview, 'yellow')}} (${colorize(type, 'gray')}) → ${colorize(path, 'gray')}`;
  console.log(message);
}

/**
 * Log attribute processing
 *
 * @param {string} name - Attribute name (e.g., "className", "style")
 * @param {string} value - Attribute value or type
 * @param {string} path - Hex path
 */
function logAttribute(name, value, path) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  const preview = value.length > 30 ? `${value.substring(0, 30)}...` : value;
  const message = `    ${colorize('[Attr]', 'cyan')} ${colorize(name, 'blue')}="${colorize(preview, 'white')}" → ${colorize(path, 'gray')}`;
  console.log(message);
}

/**
 * Log component summary stats
 *
 * @param {string} componentName - Component name
 * @param {number} nodeCount - Total node count
 * @param {number} maxDepth - Maximum depth
 */
function logStats(componentName, nodeCount, maxDepth) {
  if (!shouldLog(LOG_LEVELS.INFO)) return;

  const message = `${colorize('[Stats]', 'green')} ${colorize(componentName, 'bright')}: ${colorize(nodeCount, 'white')} nodes | ${colorize(maxDepth, 'white')} max depth`;
  console.log(message);
}

/**
 * Log component start
 *
 * @param {string} componentName - Component name
 */
function logComponentStart(componentName) {
  if (!shouldLog(LOG_LEVELS.INFO)) return;

  console.log(`\n${colorize('======', 'gray')} ${colorize('Processing:', 'bright')} ${colorize(componentName, 'green')} ${colorize('======', 'gray')}`);
}

/**
 * Log component complete
 *
 * @param {string} componentName - Component name
 * @param {string} outputPath - Output file path
 */
function logComponentComplete(componentName, outputPath) {
  if (!shouldLog(LOG_LEVELS.INFO)) return;

  const message = `${colorize('✓', 'green')} ${colorize('Generated:', 'bright')} ${colorize(outputPath, 'white')}`;
  console.log(message);
}

/**
 * Log fragment processing
 *
 * @param {string} message - Custom message
 */
function logFragment(message = 'Flattening fragment children') {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  console.log(`    ${colorize('[Fragment]', 'yellow')} ${message}`);
}

/**
 * Log conditional processing
 *
 * @param {string} type - Conditional type (e.g., "&&", "? :")
 * @param {string} message - Custom message
 */
function logConditional(type, message) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  console.log(`    ${colorize('[Conditional]', 'magenta')} ${type} - ${message}`);
}

/**
 * Log loop processing
 *
 * @param {string} arrayBinding - Array being mapped
 * @param {string} itemVar - Item variable name
 */
function logLoop(arrayBinding, itemVar) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  const message = `    ${colorize('[Loop]', 'cyan')} ${colorize(arrayBinding, 'yellow')}.map(${colorize(itemVar, 'white')} => ...)`;
  console.log(message);
}

/**
 * Log cache hit (when hint matches)
 *
 * @param {string} hintId - Hint identifier
 * @param {number} latency - Latency in milliseconds
 */
function logCacheHit(hintId, latency) {
  if (!shouldLog(LOG_LEVELS.VERBOSE)) return;

  const message = `${colorize('🟢 CACHE HIT!', 'green')} Hint '${colorize(hintId, 'white')}' matched in ${colorize(latency.toFixed(2) + 'ms', 'gray')}`;
  console.log(message);
}

/**
 * Log cache miss (no hint found)
 *
 * @param {string} stateKey - State key that changed
 */
function logCacheMiss(stateKey) {
  if (!shouldLog(LOG_LEVELS.VERBOSE)) return;

  const message = `${colorize('🔴 CACHE MISS', 'red')} No prediction for state: ${colorize(stateKey, 'white')}`;
  console.log(message);
}

/**
 * Log error
 *
 * @param {string} message - Error message
 * @param {Error} error - Error object (optional)
 */
function logError(message, error = null) {
  if (!shouldLog(LOG_LEVELS.ERROR)) return;

  console.error(`${colorize('[ERROR]', 'red')} ${message}`);
  if (error && error.stack) {
    console.error(colorize(error.stack, 'gray'));
  }
}

/**
 * Log warning
 *
 * @param {string} message - Warning message
 */
function logWarn(message) {
  if (!shouldLog(LOG_LEVELS.WARN)) return;

  console.warn(`${colorize('[WARN]', 'yellow')} ${message}`);
}

/**
 * Log info
 *
 * @param {string} message - Info message
 */
function logInfo(message) {
  if (!shouldLog(LOG_LEVELS.INFO)) return;

  console.log(`${colorize('[INFO]', 'blue')} ${message}`);
}

/**
 * Log debug
 *
 * @param {string} message - Debug message
 */
function logDebug(message) {
  if (!shouldLog(LOG_LEVELS.DEBUG)) return;

  console.log(`${colorize('[DEBUG]', 'gray')} ${message}`);
}

/**
 * Log verbose
 *
 * @param {string} message - Verbose message
 */
function logVerbose(message) {
  if (!shouldLog(LOG_LEVELS.VERBOSE)) return;

  console.log(`${colorize('[VERBOSE]', 'dim')} ${message}`);
}

/**
 * Create progress bar
 *
 * @param {number} current - Current progress
 * @param {number} total - Total items
 * @param {number} width - Bar width in characters
 * @returns {string} - Progress bar string
 */
function createProgressBar(current, total, width = 30) {
  const percentage = Math.floor((current / total) * 100);
  const filledWidth = Math.floor((current / total) * width);
  const emptyWidth = width - filledWidth;

  const filled = colorize('█'.repeat(filledWidth), 'green');
  const empty = colorize('░'.repeat(emptyWidth), 'gray');

  return `[${filled}${empty}] ${percentage}% (${current}/${total})`;
}

/**
 * Log progress
 *
 * @param {string} label - Progress label
 * @param {number} current - Current progress
 * @param {number} total - Total items
 */
function logProgress(label, current, total) {
  if (!shouldLog(LOG_LEVELS.INFO)) return;

  const bar = createProgressBar(current, total);
  process.stdout.write(`\r${label}: ${bar}`);

  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * Create table for logging
 *
 * @param {Array} rows - Array of row objects
 * @param {Array} columns - Array of column names
 * @returns {string} - Formatted table
 */
function createTable(rows, columns) {
  if (rows.length === 0) return '';

  // Calculate column widths
  const widths = columns.map(col => {
    const values = rows.map(row => String(row[col] || ''));
    return Math.max(col.length, ...values.map(v => v.length));
  });

  // Create header
  const header = columns.map((col, i) => col.padEnd(widths[i])).join(' | ');
  const separator = widths.map(w => '-'.repeat(w)).join('-+-');

  // Create rows
  const rowStrings = rows.map(row =>
    columns.map((col, i) => String(row[col] || '').padEnd(widths[i])).join(' | ')
  );

  return [header, separator, ...rowStrings].join('\n');
}

/**
 * Log table
 *
 * @param {Array} rows - Array of row objects
 * @param {Array} columns - Array of column names
 */
function logTable(rows, columns) {
  if (!shouldLog(LOG_LEVELS.INFO)) return;

  const table = createTable(rows, columns);
  console.log('\n' + table + '\n');
}

/**
 * Time a function execution
 *
 * @param {string} label - Label for the timing
 * @param {Function} fn - Function to time
 * @returns {*} - Result of function
 */
function timeExecution(label, fn) {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (shouldLog(LOG_LEVELS.VERBOSE)) {
    logVerbose(`${label} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Time an async function execution
 *
 * @param {string} label - Label for the timing
 * @param {Function} fn - Async function to time
 * @returns {Promise<*>} - Result of function
 */
async function timeExecutionAsync(label, fn) {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (shouldLog(LOG_LEVELS.VERBOSE)) {
    logVerbose(`${label} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

/**
 * Create indented logger
 *
 * @param {number} indentLevel - Indentation level
 * @returns {Function} - Logger function with indentation
 */
function createIndentedLogger(indentLevel = 0) {
  const indent = '  '.repeat(indentLevel);
  return (message) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(indent + message);
    }
  };
}

module.exports = {
  // Log level control
  LOG_LEVELS,
  setLogLevel,
  getLogLevel,
  shouldLog,

  // Core logging
  logElement,
  logText,
  logExpression,
  logAttribute,
  logStats,

  // Component lifecycle
  logComponentStart,
  logComponentComplete,

  // Structural logging
  logFragment,
  logConditional,
  logLoop,

  // Cache logging
  logCacheHit,
  logCacheMiss,

  // Standard levels
  logError,
  logWarn,
  logInfo,
  logDebug,
  logVerbose,

  // Progress and tables
  logProgress,
  createProgressBar,
  logTable,
  createTable,

  // Timing
  timeExecution,
  timeExecutionAsync,

  // Utilities
  colorize,
  createIndentedLogger,
  COLORS
};
