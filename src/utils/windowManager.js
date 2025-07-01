const { BrowserWindow } = require('electron');
const path = require('path');

class WindowManager {
  constructor() {
    this.mainWindow = null;
  }

  /**
   * Create the main application window
   */
  createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true
      },
      icon: path.join(__dirname, '../../public/assets/icon.png'),
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
      this.mainWindow.webContents.openDevTools();
    }

    return this.mainWindow;
  }

  /**
   * Get the main window instance
   * @returns {BrowserWindow|null}
   */
  getMainWindow() {
    return this.mainWindow;
  }

  /**
   * Check if main window exists and is not destroyed
   * @returns {boolean}
   */
  hasMainWindow() {
    return this.mainWindow && !this.mainWindow.isDestroyed();
  }

  /**
   * Close the main window
   */
  closeMainWindow() {
    if (this.hasMainWindow()) {
      this.mainWindow.close();
      this.mainWindow = null;
    }
  }

  /**
   * Get all windows
   * @returns {BrowserWindow[]}
   */
  getAllWindows() {
    return BrowserWindow.getAllWindows();
  }
}

module.exports = new WindowManager();
