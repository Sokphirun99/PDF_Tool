const fs = require('fs');
const path = require('path');
const os = require('os');
const { app } = require('electron');

class TempManager {
  constructor() {
    this.tempDir = app.isPackaged 
      ? path.join(os.tmpdir(), 'pdf-tools-electron') 
      : path.join(__dirname, '../../temp');
  }

  /**
   * Initialize temp directory structure
   */
  initializeTempDirectories() {
    const subdirs = ['', 'pages', 'extracted', 'optimized'];
    
    subdirs.forEach(subdir => {
      const dirPath = path.join(this.tempDir, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  /**
   * Clean up temp directory (remove old files)
   * @param {number} maxAgeMinutes - Maximum age of files to keep in minutes
   */
  cleanupTempDirectory(maxAgeMinutes = 30) {
    try {
      if (!fs.existsSync(this.tempDir)) return;
      
      const now = Date.now();
      const maxAge = maxAgeMinutes * 60 * 1000; // Convert to milliseconds
      
      const cleanDir = (dirPath) => {
        const files = fs.readdirSync(dirPath);
        
        files.forEach(file => {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          
          if (stats.isDirectory()) {
            cleanDir(filePath); // Recursively clean subdirectories
            
            // Remove empty directories
            try {
              if (fs.readdirSync(filePath).length === 0) {
                fs.rmdirSync(filePath);
              }
            } catch (err) {
              // Directory not empty or other error, ignore
            }
          } else {
            // Remove files older than maxAge
            if (now - stats.mtime.getTime() > maxAge) {
              try {
                fs.unlinkSync(filePath);
                console.log('Cleaned up old temp file:', file);
              } catch (err) {
                console.log('Failed to cleanup temp file:', file, err.message);
              }
            }
          }
        });
      };

      cleanDir(this.tempDir);
    } catch (err) {
      console.error('Error during temp directory cleanup:', err);
    }
  }

  /**
   * Create a unique temporary directory
   * @param {string} prefix - Prefix for the directory name
   * @returns {string} Path to the created directory
   */
  createUniqueDir(prefix = 'pdf-operation') {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const dirName = `${prefix}_${timestamp}_${randomString}`;
    const dirPath = path.join(this.tempDir, dirName);
    
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    return dirPath;
  }

  /**
   * Get the temp directory path
   * @returns {string} Temp directory path
   */
  getTempDir() {
    return this.tempDir;
  }

  /**
   * Clean up specific directory
   * @param {string} dirPath - Directory to clean
   */
  cleanupDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (err) {
      console.error('Error cleaning up directory:', dirPath, err);
    }
  }
}

module.exports = new TempManager();
