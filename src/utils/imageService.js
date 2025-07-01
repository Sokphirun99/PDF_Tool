const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const tempManager = require('./tempManager');

class ImageService {
  constructor() {
    this.supportedFormats = ['jpeg', 'png', 'webp', 'tiff', 'gif'];
  }

  /**
   * Convert PDF pages to images
   * @param {string} pdfPath - Path to the PDF file
   * @param {Object} options - Conversion options
   * @returns {Promise<Array>} - Array of image file paths
   */
  async convertPDFToImages(pdfPath, options = {}) {
    try {
      const {
        format = 'jpeg',
        quality = 85,
        dpi = 150,
        outputDir = null
      } = options;

      // This is a simplified implementation
      // In a real-world scenario, you'd use pdf-poppler or similar
      const outputDirectory = outputDir || tempManager.createUniqueDir('pdf-to-images');
      const imagePaths = [];

      // For now, return a placeholder implementation
      // You would integrate with pdf-poppler here
      console.log(`Converting PDF ${pdfPath} to ${format} images at ${dpi} DPI`);
      
      return imagePaths;
    } catch (error) {
      throw new Error(`Failed to convert PDF to images: ${error.message}`);
    }
  }

  /**
   * Convert images to PDF
   * @param {string[]} imagePaths - Array of image file paths
   * @param {Object} options - Conversion options
   * @returns {Promise<Uint8Array>} - PDF as Uint8Array
   */
  async convertImagesToPDF(imagePaths, options = {}) {
    try {
      const {
        pageSize = 'A4',
        margin = 20,
        quality = 85
      } = options;

      const pdfDoc = await PDFDocument.create();

      for (const imagePath of imagePaths) {
        const imageBytes = fs.readFileSync(imagePath);
        const extension = path.extname(imagePath).toLowerCase();
        
        let image;
        if (extension === '.png') {
          image = await pdfDoc.embedPng(imageBytes);
        } else if (['.jpg', '.jpeg'].includes(extension)) {
          image = await pdfDoc.embedJpg(imageBytes);
        } else {
          // Convert other formats to PNG first
          const convertedBytes = await this.convertImageFormat(imageBytes, 'png');
          image = await pdfDoc.embedPng(convertedBytes);
        }

        const page = pdfDoc.addPage();
        const { width: pageWidth, height: pageHeight } = page.getSize();
        
        // Calculate image dimensions to fit the page
        const { width: imgWidth, height: imgHeight } = image.scale(1);
        const availableWidth = pageWidth - (margin * 2);
        const availableHeight = pageHeight - (margin * 2);
        
        const widthRatio = availableWidth / imgWidth;
        const heightRatio = availableHeight / imgHeight;
        const scale = Math.min(widthRatio, heightRatio);
        
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        page.drawImage(image, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      }

      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Failed to convert images to PDF: ${error.message}`);
    }
  }

  /**
   * Optimize image file
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output image path
   * @param {Object} options - Optimization options
   * @returns {Promise<Object>} - Optimization results
   */
  async optimizeImage(inputPath, outputPath, options = {}) {
    try {
      const {
        quality = 85,
        format = 'jpeg',
        width = null,
        height = null,
        progressive = true
      } = options;

      const originalStats = fs.statSync(inputPath);
      
      let pipeline = sharp(inputPath);

      // Resize if dimensions provided
      if (width || height) {
        pipeline = pipeline.resize(width, height, {
          fit: sharp.fit.inside,
          withoutEnlargement: true
        });
      }

      // Apply format-specific optimizations
      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          pipeline = pipeline.jpeg({
            quality,
            progressive,
            mozjpeg: true
          });
          break;
        case 'png':
          pipeline = pipeline.png({
            quality,
            progressive,
            compressionLevel: 9
          });
          break;
        case 'webp':
          pipeline = pipeline.webp({
            quality,
            effort: 6
          });
          break;
        default:
          throw new Error(`Unsupported format: ${format}`);
      }

      await pipeline.toFile(outputPath);

      const optimizedStats = fs.statSync(outputPath);
      const compressionRatio = ((originalStats.size - optimizedStats.size) / originalStats.size) * 100;

      return {
        originalSize: originalStats.size,
        optimizedSize: optimizedStats.size,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        savedBytes: originalStats.size - optimizedStats.size
      };
    } catch (error) {
      throw new Error(`Failed to optimize image: ${error.message}`);
    }
  }

  /**
   * Convert image format
   * @param {Buffer} imageBuffer - Image buffer
   * @param {string} format - Target format
   * @param {Object} options - Conversion options
   * @returns {Promise<Buffer>} - Converted image buffer
   */
  async convertImageFormat(imageBuffer, format, options = {}) {
    try {
      const { quality = 85 } = options;

      let pipeline = sharp(imageBuffer);

      switch (format.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          return await pipeline.jpeg({ quality }).toBuffer();
        case 'png':
          return await pipeline.png({ quality }).toBuffer();
        case 'webp':
          return await pipeline.webp({ quality }).toBuffer();
        case 'tiff':
          return await pipeline.tiff({ quality }).toBuffer();
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      throw new Error(`Failed to convert image format: ${error.message}`);
    }
  }

  /**
   * Get image metadata
   * @param {string} imagePath - Path to the image file
   * @returns {Promise<Object>} - Image metadata
   */
  async getImageMetadata(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = fs.statSync(imagePath);

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasProfile: metadata.hasProfile,
        hasAlpha: metadata.hasAlpha,
        fileSize: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    } catch (error) {
      throw new Error(`Failed to get image metadata: ${error.message}`);
    }
  }

  /**
   * Create thumbnail
   * @param {string} inputPath - Input image path
   * @param {string} outputPath - Output thumbnail path
   * @param {Object} options - Thumbnail options
   * @returns {Promise<string>} - Thumbnail path
   */
  async createThumbnail(inputPath, outputPath, options = {}) {
    try {
      const {
        width = 200,
        height = 200,
        format = 'jpeg',
        quality = 80
      } = options;

      await sharp(inputPath)
        .resize(width, height, {
          fit: sharp.fit.cover,
          position: sharp.strategy.smart
        })
        .jpeg({ quality })
        .toFile(outputPath);

      return outputPath;
    } catch (error) {
      throw new Error(`Failed to create thumbnail: ${error.message}`);
    }
  }
}

module.exports = new ImageService();
