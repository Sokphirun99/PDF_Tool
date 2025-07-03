const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const windowManager = require('../utils/windowManager');

class IPCHandlers {
  constructor() {
    this.setupHandlers();
  }

  setupHandlers() {
    // File selection handlers
    ipcMain.handle('select-files', this.selectFiles.bind(this)); // Generic file selector
    ipcMain.handle('select-pdf-files', this.selectPDFFiles.bind(this));
    ipcMain.handle('select-image-files', this.selectImageFiles.bind(this));
    ipcMain.handle('select-word-files', this.selectWordFiles.bind(this));
    ipcMain.handle('select-save-location', this.selectSaveLocation.bind(this));
    ipcMain.handle('save-file', this.saveFile.bind(this)); // Save file dialog
    
    // File system operations
    ipcMain.handle('read-file', this.readFile.bind(this));
    ipcMain.handle('write-file', this.writeFile.bind(this));
    ipcMain.handle('delete-file', this.deleteFile.bind(this));
    ipcMain.handle('file-exists', this.fileExists.bind(this));
    ipcMain.handle('save-images', this.saveImages.bind(this));
    ipcMain.handle('select-folder', this.selectFolder.bind(this));
    ipcMain.handle('open-file-location', this.openFileLocation.bind(this));
    
    // Application operations
    ipcMain.handle('show-message-box', this.showMessageBox.bind(this));
    ipcMain.handle('show-error-box', this.showErrorBox.bind(this));
  }

  async selectPDFFiles() {
    const result = await dialog.showOpenDialog(windowManager.getMainWindow(), {
      title: 'Select PDF Files',
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    return result;
  }

  async selectImageFiles() {
    const result = await dialog.showOpenDialog(windowManager.getMainWindow(), {
      title: 'Select Image Files',
      filters: [
        { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    return result;
  }

  async selectWordFiles() {
    const result = await dialog.showOpenDialog(windowManager.getMainWindow(), {
      title: 'Select Word Files',
      filters: [
        { name: 'Word Documents', extensions: ['doc', 'docx'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    return result;
  }

  async selectSaveLocation(defaultName = 'output.pdf') {
    const result = await dialog.showSaveDialog(windowManager.getMainWindow(), {
      title: 'Save File',
      defaultPath: defaultName,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    return result;
  }

  async selectFiles() {
    const result = await dialog.showOpenDialog(windowManager.getMainWindow(), {
      title: 'Select Files',
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: 'Word Documents', extensions: ['doc', 'docx'] },
        { name: 'Excel Files', extensions: ['xls', 'xlsx'] },
        { name: 'PowerPoint', extensions: ['ppt', 'pptx'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    });

    return result;
  }

  async readFile(filePath) {
    try {
      const data = fs.readFileSync(filePath);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async writeFile(filePath, data) {
    try {
      fs.writeFileSync(filePath, data);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteFile(filePath) {
    try {
      fs.unlinkSync(filePath);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  async showMessageBox(options) {
    const result = await dialog.showMessageBox(windowManager.getMainWindow(), options);
    return result;
  }

  async showErrorBox(title, content) {
    dialog.showErrorBox(title, content);
  }

  async saveFile(event, defaultName = 'output.pdf') {
    const result = await dialog.showSaveDialog(windowManager.getMainWindow(), {
      title: 'Save File',
      defaultPath: defaultName,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'ZIP Files', extensions: ['zip'] },
        { name: 'Image Files', extensions: ['jpg', 'jpeg', 'png'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    return result;
  }

  async saveImages(event, imagePaths, originalPdfPath) {
    try {
      if (!imagePaths || imagePaths.length === 0) {
        return [];
      }

      const savedPaths = [];
      const originalName = path.basename(originalPdfPath, path.extname(originalPdfPath));
      
      for (let i = 0; i < imagePaths.length; i++) {
        const imagePath = imagePaths[i];
        const extension = path.extname(imagePath);
        const suggestedName = `${originalName}_page_${i + 1}${extension}`;
        
        const result = await dialog.showSaveDialog(windowManager.getMainWindow(), {
          title: `Save Image ${i + 1} of ${imagePaths.length}`,
          defaultPath: suggestedName,
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled && result.filePath) {
          // Copy the temporary image to the selected location
          fs.copyFileSync(imagePath, result.filePath);
          savedPaths.push(result.filePath);
        } else {
          // User cancelled, break the loop
          break;
        }
      }
      
      return savedPaths;
    } catch (error) {
      console.error('Error saving images:', error);
      throw error;
    }
  }

  async selectFolder() {
    const result = await dialog.showOpenDialog(windowManager.getMainWindow(), {
      title: 'Select Folder to Save Images',
      properties: ['openDirectory']
    });

    return result;
  }

  async openFileLocation(filePath) {
    try {
      console.log('Opening folder containing file:', filePath);
      
      // Handle case where filePath might be an object
      let actualPath = filePath;
      if (typeof filePath === 'object') {
        // Extract path from object if it has a path property
        if (filePath && filePath.path) {
          actualPath = filePath.path;
        } else if (filePath && filePath.zipPath) {
          actualPath = filePath.zipPath;
        } else {
          console.error('Invalid file path object:', filePath);
          throw new Error('Invalid file path object provided');
        }
      }
      
      // Ensure we have a valid string path
      if (!actualPath || typeof actualPath !== 'string') {
        throw new Error('File path must be a valid string, received: ' + typeof actualPath);
      }
      
      if (!fs.existsSync(actualPath)) {
        throw new Error('File not found: ' + actualPath);
      }

      const path = require('path');
      const { shell } = require('electron');
      
      // Just open the folder, don't select the file
      const folderPath = path.dirname(actualPath);
      await shell.openPath(folderPath);
      
      return { success: true };
    } catch (error) {
      console.error('Error opening folder:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new IPCHandlers();
