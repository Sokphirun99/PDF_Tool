const { app } = require('electron');

// Import modular services
const windowManager = require('../utils/windowManager');
const tempManager = require('../utils/tempManager');
const ipcHandlers = require('./ipcHandlers');
const pdfHandlers = require('./pdfHandlers');

/**
 * Create the main application window
 */
function createWindow() {
  return windowManager.createMainWindow();
}

/**
 * Initialize the application
 */
function initializeApp() {
  // Initialize temp directories
  tempManager.initializeTempDirectories();
  
  // Clean up old temp files on startup
  tempManager.cleanupTempDirectory();
  
  // Create main window
  createWindow();
  
  // Schedule periodic cleanup every 15 minutes
  setInterval(() => {
    tempManager.cleanupTempDirectory();
  }, 15 * 60 * 1000);
}

// App event handlers
app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (!windowManager.hasMainWindow()) {
    createWindow();
  }
});

// Cleanup on app exit
app.on('before-quit', () => {
  console.log('Cleaning up temp files before exit...');
  tempManager.cleanupTempDirectory(0); // Clean all temp files on exit
});

// Handle app security
app.on('web-contents-created', (event, contents) => {
  // Disable navigation to external URLs
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Allow only local file navigation
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});

// Set up environment PATH to include Homebrew paths
process.env.PATH = [
    '/opt/homebrew/bin',      // M1 Macs
    '/usr/local/bin',         // Intel Macs
    process.env.PATH
].join(':');

console.log('PDF Tools application started successfully!');
