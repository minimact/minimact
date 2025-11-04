/**
 * File System Utilities for Minimact Transpiler
 *
 * Provides safe, consistent file system operations.
 * Handles directory creation, JSON reading/writing, and path management.
 */

const fs = require('fs');
const path = require('path');

/**
 * Ensure directory exists
 *
 * Creates directory and all parent directories if they don't exist.
 * Does nothing if directory already exists.
 *
 * @param {string} dir - Directory path
 * @returns {boolean} - True if successful
 */
function ensureDir(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return true;
  } catch (error) {
    console.error(`[FileSystem] Failed to create directory: ${dir}`, error);
    return false;
  }
}

/**
 * Write JSON to file
 *
 * Writes data as formatted JSON with proper indentation.
 * Ensures parent directory exists before writing.
 *
 * @param {string} filePath - Output file path
 * @param {Object} data - Data to write
 * @param {number} indent - JSON indentation (default: 2)
 * @returns {boolean} - True if successful
 */
function writeJSON(filePath, data, indent = 2) {
  try {
    // Ensure parent directory exists
    const dir = path.dirname(filePath);
    ensureDir(dir);

    // Write formatted JSON
    const json = JSON.stringify(data, null, indent);
    fs.writeFileSync(filePath, json, 'utf8');

    return true;
  } catch (error) {
    console.error(`[FileSystem] Failed to write JSON: ${filePath}`, error);
    return false;
  }
}

/**
 * Read JSON from file
 *
 * Reads and parses JSON file.
 *
 * @param {string} filePath - Input file path
 * @returns {Object|null} - Parsed JSON or null on error
 */
function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`[FileSystem] Failed to read JSON: ${filePath}`, error);
    return null;
  }
}

/**
 * Get output file path
 *
 * Builds output file path for a component.
 *
 * @param {string} outputDir - Output directory
 * @param {string} componentName - Component name
 * @param {string} extension - File extension (default: '.json')
 * @returns {string} - Full output path
 */
function getOutputPath(outputDir, componentName, extension = '.json') {
  return path.join(outputDir, `${componentName}${extension}`);
}

/**
 * Check if file exists
 *
 * @param {string} filePath - File path to check
 * @returns {boolean} - True if file exists
 */
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

/**
 * Check if directory exists
 *
 * @param {string} dirPath - Directory path to check
 * @returns {boolean} - True if directory exists
 */
function dirExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

/**
 * Read file as text
 *
 * @param {string} filePath - File path
 * @returns {string|null} - File content or null on error
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`[FileSystem] Failed to read file: ${filePath}`, error);
    return null;
  }
}

/**
 * Write text to file
 *
 * @param {string} filePath - Output file path
 * @param {string} content - Content to write
 * @returns {boolean} - True if successful
 */
function writeFile(filePath, content) {
  try {
    const dir = path.dirname(filePath);
    ensureDir(dir);
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  } catch (error) {
    console.error(`[FileSystem] Failed to write file: ${filePath}`, error);
    return false;
  }
}

/**
 * Delete file
 *
 * @param {string} filePath - File path to delete
 * @returns {boolean} - True if successful
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return true;
  } catch (error) {
    console.error(`[FileSystem] Failed to delete file: ${filePath}`, error);
    return false;
  }
}

/**
 * List files in directory
 *
 * @param {string} dirPath - Directory path
 * @param {string} extension - Filter by extension (optional)
 * @returns {Array} - Array of file names
 */
function listFiles(dirPath, extension = null) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }

    let files = fs.readdirSync(dirPath);

    // Filter by extension if provided
    if (extension) {
      const ext = extension.startsWith('.') ? extension : `.${extension}`;
      files = files.filter(f => f.endsWith(ext));
    }

    return files;
  } catch (error) {
    console.error(`[FileSystem] Failed to list files: ${dirPath}`, error);
    return [];
  }
}

/**
 * Get file stats
 *
 * @param {string} filePath - File path
 * @returns {Object|null} - File stats or null on error
 */
function getFileStats(filePath) {
  try {
    return fs.statSync(filePath);
  } catch (error) {
    return null;
  }
}

/**
 * Get file size in bytes
 *
 * @param {string} filePath - File path
 * @returns {number} - File size or -1 on error
 */
function getFileSize(filePath) {
  const stats = getFileStats(filePath);
  return stats ? stats.size : -1;
}

/**
 * Get file modification time
 *
 * @param {string} filePath - File path
 * @returns {Date|null} - Modification time or null on error
 */
function getFileModTime(filePath) {
  const stats = getFileStats(filePath);
  return stats ? stats.mtime : null;
}

/**
 * Copy file
 *
 * @param {string} sourcePath - Source file path
 * @param {string} destPath - Destination file path
 * @returns {boolean} - True if successful
 */
function copyFile(sourcePath, destPath) {
  try {
    const dir = path.dirname(destPath);
    ensureDir(dir);
    fs.copyFileSync(sourcePath, destPath);
    return true;
  } catch (error) {
    console.error(`[FileSystem] Failed to copy file: ${sourcePath} -> ${destPath}`, error);
    return false;
  }
}

/**
 * Resolve path relative to current working directory
 *
 * @param {string} relativePath - Relative path
 * @returns {string} - Absolute path
 */
function resolvePath(relativePath) {
  return path.resolve(process.cwd(), relativePath);
}

/**
 * Get relative path from base
 *
 * @param {string} from - Base path
 * @param {string} to - Target path
 * @returns {string} - Relative path
 */
function getRelativePath(from, to) {
  return path.relative(from, to);
}

/**
 * Join path segments
 *
 * @param {...string} segments - Path segments
 * @returns {string} - Joined path
 */
function joinPath(...segments) {
  return path.join(...segments);
}

/**
 * Get directory name from path
 *
 * @param {string} filePath - File path
 * @returns {string} - Directory name
 */
function getDirName(filePath) {
  return path.dirname(filePath);
}

/**
 * Get base name from path
 *
 * @param {string} filePath - File path
 * @param {string} ext - Extension to remove (optional)
 * @returns {string} - Base name
 */
function getBaseName(filePath, ext) {
  return path.basename(filePath, ext);
}

/**
 * Get file extension
 *
 * @param {string} filePath - File path
 * @returns {string} - Extension (with dot)
 */
function getExtension(filePath) {
  return path.extname(filePath);
}

/**
 * Change file extension
 *
 * @param {string} filePath - File path
 * @param {string} newExt - New extension (with or without dot)
 * @returns {string} - New file path
 */
function changeExtension(filePath, newExt) {
  const ext = newExt.startsWith('.') ? newExt : `.${newExt}`;
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  return path.join(dir, base + ext);
}

/**
 * Normalize path (resolve . and ..)
 *
 * @param {string} filePath - File path
 * @returns {string} - Normalized path
 */
function normalizePath(filePath) {
  return path.normalize(filePath);
}

/**
 * Check if path is absolute
 *
 * @param {string} filePath - File path
 * @returns {boolean} - True if absolute
 */
function isAbsolutePath(filePath) {
  return path.isAbsolute(filePath);
}

/**
 * Create temporary file path
 *
 * @param {string} prefix - File name prefix
 * @param {string} extension - File extension
 * @returns {string} - Temporary file path
 */
function getTempFilePath(prefix = 'temp', extension = '.tmp') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  const fileName = `${prefix}-${timestamp}-${random}${extension}`;
  return path.join(require('os').tmpdir(), fileName);
}

/**
 * Safe write JSON with backup
 *
 * Writes JSON to temporary file first, then renames to target.
 * This prevents corruption if write fails midway.
 *
 * @param {string} filePath - Output file path
 * @param {Object} data - Data to write
 * @param {number} indent - JSON indentation
 * @returns {boolean} - True if successful
 */
function safeWriteJSON(filePath, data, indent = 2) {
  const tempPath = getTempFilePath('minimact-json', '.json');

  try {
    // Write to temp file
    const json = JSON.stringify(data, null, indent);
    fs.writeFileSync(tempPath, json, 'utf8');

    // Ensure target directory exists
    const dir = path.dirname(filePath);
    ensureDir(dir);

    // Move temp file to target
    fs.renameSync(tempPath, filePath);

    return true;
  } catch (error) {
    console.error(`[FileSystem] Failed to safely write JSON: ${filePath}`, error);

    // Clean up temp file
    try {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return false;
  }
}

/**
 * Create directory structure from array
 *
 * @param {string} baseDir - Base directory
 * @param {Array} dirs - Array of subdirectories
 * @returns {boolean} - True if all successful
 */
function ensureDirStructure(baseDir, dirs) {
  try {
    for (const dir of dirs) {
      const fullPath = path.join(baseDir, dir);
      ensureDir(fullPath);
    }
    return true;
  } catch (error) {
    console.error(`[FileSystem] Failed to create directory structure in: ${baseDir}`, error);
    return false;
  }
}

module.exports = {
  // Directory operations
  ensureDir,
  dirExists,
  ensureDirStructure,

  // JSON operations
  writeJSON,
  readJSON,
  safeWriteJSON,

  // File operations
  readFile,
  writeFile,
  deleteFile,
  copyFile,
  fileExists,

  // File info
  getFileStats,
  getFileSize,
  getFileModTime,

  // Directory listing
  listFiles,

  // Path operations
  getOutputPath,
  resolvePath,
  getRelativePath,
  joinPath,
  getDirName,
  getBaseName,
  getExtension,
  changeExtension,
  normalizePath,
  isAbsolutePath,

  // Utilities
  getTempFilePath
};
