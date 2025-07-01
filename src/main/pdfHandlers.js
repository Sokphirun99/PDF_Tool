const { ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const pdfService = require('../utils/pdfService');
const imageService = require('../utils/imageService');
const tempManager = require('../utils/tempManager');
const windowManager = require('../utils/windowManager');

class PDFHandlers {
  constructor() {
    this.setupHandlers();
  }

  setupHandlers() {
    // PDF Operations
    ipcMain.handle('merge-pdfs', this.mergePDFs.bind(this));
    ipcMain.handle('split-pdf', this.splitPDF.bind(this));
    ipcMain.handle('compress-pdf', this.compressPDF.bind(this));
    ipcMain.handle('rotate-pdf', this.rotatePDF.bind(this));
    ipcMain.handle('add-watermark', this.addWatermark.bind(this));
    
    // Conversion Operations
    ipcMain.handle('pdf-to-images', this.pdfToImages.bind(this));
    ipcMain.handle('images-to-pdf', this.imagesToPDF.bind(this));
    ipcMain.handle('extract-pdf-images', this.extractPDFImages.bind(this));
    
    // File Operations
    ipcMain.handle('save-images', this.saveImages.bind(this));
    ipcMain.handle('create-zip', this.createZip.bind(this));
    ipcMain.handle('create-images-zip', this.createImagesZip.bind(this));
    ipcMain.handle('create-auto-zip', this.createAutoZip.bind(this));
    ipcMain.handle('create-optimized-images-zip', this.createOptimizedImagesZip.bind(this));
    
    // Metadata
    ipcMain.handle('get-pdf-metadata', this.getPDFMetadata.bind(this));
    ipcMain.handle('get-pdf-page-count', this.getPDFPageCount.bind(this));
  }

  async mergePDFs(event, filePaths) {
    try {
      const mergedPdfBytes = await pdfService.mergePDFs(filePaths);
      return { success: true, data: mergedPdfBytes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async splitPDF(event, filePath, pageIndices = null) {
    try {
      const splitResults = await pdfService.splitPDF(filePath, pageIndices);
      return { success: true, data: splitResults };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async compressPDF(event, filePath, compressionLevel = 'medium') {
    try {
      const compressedPdfBytes = await pdfService.compressPDF(filePath, compressionLevel);
      return { success: true, data: compressedPdfBytes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async rotatePDF(event, filePath, rotation, pageIndices = null) {
    try {
      const rotatedPdfBytes = await pdfService.rotatePDF(filePath, rotation, pageIndices);
      return { success: true, data: rotatedPdfBytes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async addWatermark(event, filePath, watermarkText, options = {}) {
    try {
      const watermarkedPdfBytes = await pdfService.addWatermark(filePath, watermarkText, options);
      return { success: true, data: watermarkedPdfBytes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async pdfToImages(event, filePath, options = {}) {
    try {
      const imagePaths = await imageService.convertPDFToImages(filePath, options);
      return { success: true, data: imagePaths };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async imagesToPDF(event, imagePaths, options = {}) {
    try {
      const pdfBytes = await imageService.convertImagesToPDF(imagePaths, options);
      return { success: true, data: pdfBytes };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async saveImages(event, imagePaths, originalPdfPath) {
    try {
      const results = [];
      const originalName = path.basename(originalPdfPath, path.extname(originalPdfPath));
      
      for (let i = 0; i < imagePaths.length; i++) {
        const imagePath = imagePaths[i];
        const extension = path.extname(imagePath);
        const suggestedName = `${originalName}_page_${i + 1}${extension}`;
        
        const result = await dialog.showSaveDialog(windowManager.getMainWindow(), {
          defaultPath: suggestedName,
          filters: [
            { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });
        
        if (!result.canceled) {
          fs.copyFileSync(imagePath, result.filePath);
          results.push(result.filePath);
        }
      }
      
      return { success: true, data: results };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createZip(event, files, zipPath) {
    try {
      return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          resolve({ success: true, size: archive.pointer() });
        });

        archive.on('error', (err) => {
          reject({ success: false, error: err.message });
        });

        archive.pipe(output);

        // Add files to archive
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            archive.file(file.path, { name: file.name });
          }
        });

        archive.finalize();
      });
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async extractPDFImages(event, filePath, options = {}) {
    try {
      // This would extract embedded images from PDF
      // For now, return placeholder
      console.log('Extracting images from PDF:', filePath);
      return { success: true, data: [] };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createImagesZip(event, imagePaths, originalPdfPath) {
    try {
      const originalName = path.basename(originalPdfPath, path.extname(originalPdfPath));
      const zipPath = path.join(tempManager.createUniqueDir('zip'), `${originalName}_images.zip`);
      
      const files = imagePaths.map((imagePath, index) => ({
        path: imagePath,
        name: `page_${index + 1}${path.extname(imagePath)}`
      }));

      return await this.createZip(event, files, zipPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createAutoZip(event, imagePaths, originalPdfPath, mode) {
    try {
      const originalName = path.basename(originalPdfPath, path.extname(originalPdfPath));
      const zipPath = path.join(tempManager.createUniqueDir('zip'), `${originalName}_${mode}.zip`);
      
      const files = imagePaths.map((imagePath, index) => ({
        path: imagePath,
        name: `${mode}_${index + 1}${path.extname(imagePath)}`
      }));

      return await this.createZip(event, files, zipPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async createOptimizedImagesZip(event, imagePaths, originalPdfPath, quality) {
    try {
      const originalName = path.basename(originalPdfPath, path.extname(originalPdfPath));
      const zipPath = path.join(tempManager.createUniqueDir('zip'), `${originalName}_optimized.zip`);
      
      const files = imagePaths.map((imagePath, index) => ({
        path: imagePath,
        name: `optimized_${index + 1}${path.extname(imagePath)}`
      }));

      return await this.createZip(event, files, zipPath);
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPDFMetadata(event, filePath) {
    try {
      const metadata = await pdfService.getPDFMetadata(filePath);
      return { success: true, data: metadata };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPDFPageCount(event, filePath) {
    try {
      const metadata = await pdfService.getPDFMetadata(filePath);
      return { success: true, data: metadata.pageCount };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new PDFHandlers();
