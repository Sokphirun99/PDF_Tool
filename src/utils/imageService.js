const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const tempManager = require('./tempManager');
const { spawn } = require('child_process');
const fsPromises = require('fs').promises;

// Define possible paths for pdftoppm on macOS
const POPPLER_PATHS = [
    '/opt/homebrew/bin/pdftoppm',  // M1 Macs (ARM)
    '/usr/local/bin/pdftoppm',     // Intel Macs
    '/usr/bin/pdftoppm',           // System installation
    'pdftoppm'                     // Global PATH
];

// Function to find the correct pdftoppm path
async function findPdftoppm() {
    for (const popplerPath of POPPLER_PATHS) {
        try {
            if (popplerPath === 'pdftoppm') {
                // Test if it's in PATH
                return new Promise((resolve) => {
                    const testProcess = spawn('which', ['pdftoppm']);
                    testProcess.on('close', (code) => {
                        resolve(code === 0 ? 'pdftoppm' : null);
                    });
                });
            } else {
                // Check if file exists at specific path
                await fsPromises.access(popplerPath);
                return popplerPath;
            }
        } catch (error) {
            // Continue to next path
        }
    }
    return null;
}

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
    const {
        quality = 'normal',
        format = 'jpg',
        firstPage = null,
        lastPage = null,
        maxPages = 50,
        selectedPages = null
    } = options;

    console.log(`🔄 Starting PDF conversion: ${path.basename(pdfPath)}`);
    console.log(`📋 Options:`, { quality, format, firstPage, lastPage, maxPages });

    try {
        // Validate input file
        if (!pdfPath || !(await fsPromises.access(pdfPath).then(() => true).catch(() => false))) {
            throw new Error(`PDF file not found: ${pdfPath}`);
        }

        // Find pdftoppm executable
        const pdftoppmPath = await findPdftoppm();
        if (!pdftoppmPath) {
            console.log('❌ pdftoppm not found, trying pdf-poppler fallback...');
            return this.convertWithPdfPoppler(pdfPath, options);
        }

        console.log(`✅ Found pdftoppm at: ${pdftoppmPath}`);

        const outputDir = path.join(require('os').tmpdir(), `pdf_conversion_${Date.now()}`);
        await fsPromises.mkdir(outputDir, { recursive: true });

        const outputBaseName = path.join(outputDir, 'page');
        
        // Set DPI based on quality
        const dpi = quality === 'high' ? 200 : quality === 'normal' ? 150 : 120;
        
        // Build pdftoppm command arguments
        const args = [
            '-jpeg',
            '-r', dpi.toString(),
            '-cropbox'
        ];

        // Handle selected pages
        if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
            console.log(`📄 Converting selected pages: ${selectedPages.join(', ')}`);
            
            // If we have specific pages, we'll convert them in batches or individually
            // For simplicity, we'll convert the range from min to max and filter later
            const minPage = Math.min(...selectedPages);
            const maxPage = Math.max(...selectedPages);
            
            args.push('-f', minPage.toString());
            args.push('-l', maxPage.toString());
        } else {
            // Add page range if specified (original logic)
            if (firstPage !== null) {
                args.push('-f', firstPage.toString());
            }
            if (lastPage !== null) {
                args.push('-l', Math.min(lastPage, (firstPage || 1) + maxPages - 1).toString());
            } else if (maxPages && !lastPage) {
                args.push('-l', ((firstPage || 1) + maxPages - 1).toString());
            }
        }

        // Add input and output
        args.push(pdfPath, outputBaseName);

        console.log(`🚀 Running: ${pdftoppmPath} ${args.join(' ')}`);

        // Execute pdftoppm
        const result = await new Promise((resolve, reject) => {
            const process = spawn(pdftoppmPath, args);
            let stderr = '';

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true });
                } else {
                    reject(new Error(`pdftoppm failed with code ${code}: ${stderr}`));
                }
            });

            process.on('error', (error) => {
                reject(new Error(`pdftoppm process error: ${error.message}`));
            });

            // Set timeout
            setTimeout(() => {
                process.kill('SIGTERM');
                reject(new Error('pdftoppm process timed out'));
            }, 30000);
        });

        // Find generated files
        const files = await fsPromises.readdir(outputDir);
        let imageFiles = files
            .filter(file => file.endsWith('.jpg'))
            .sort()
            .map(file => path.join(outputDir, file));

        // Filter for selected pages if specified
        if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
            const minPage = Math.min(...selectedPages);
            const selectedSet = new Set(selectedPages);
            
            imageFiles = imageFiles.filter((file, index) => {
                const pageNumber = minPage + index;
                return selectedSet.has(pageNumber);
            });
            
            console.log(`📋 Filtered to ${imageFiles.length} selected pages from ${files.filter(f => f.endsWith('.jpg')).length} total pages`);
        }

        if (imageFiles.length === 0) {
            throw new Error('No images were generated by pdftoppm');
        }

        console.log(`✅ Successfully converted ${imageFiles.length} pages`);
        return imageFiles;

    } catch (error) {
        console.log(`❌ Direct pdftoppm failed: ${error.message}`);
        console.log('🔄 Trying pdf-poppler fallback...');
        
        try {
            return await this.convertWithPdfPoppler(pdfPath, options);
        } catch (fallbackError) {
            console.log(`❌ pdf-poppler also failed: ${fallbackError.message}`);
            console.log('🔄 Using SVG preview fallback...');
            return this.createSvgPreview(pdfPath);
        }
    }
  }

  /**
   * Fallback method: Convert PDF to actual images using pdf-lib + canvas
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} outputDirectory - Output directory
   * @returns {Promise<Array>} - Array of image file paths
   */
  async convertPDFToSVGFallback(pdfPath, outputDirectory) {
    try {
      console.log('Using fallback canvas-based image conversion method');
      
      // Try to use pdfjs-dist for actual image rendering
      try {
        return await this.convertPDFWithPDFJS(pdfPath, outputDirectory);
      } catch (pdfjsError) {
        console.log('pdfjs-dist failed, using basic image placeholder:', pdfjsError.message);
        return await this.createImagePlaceholders(pdfPath, outputDirectory);
      }
      
    } catch (error) {
      throw new Error(`Fallback conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert PDF using pdfjs-dist library for actual image rendering
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} outputDirectory - Output directory
   * @returns {Promise<Array>} - Array of image file paths
   */
  async convertPDFWithPDFJS(pdfPath, outputDirectory) {
    try {
      // Use pdfjs-dist for actual PDF rendering
      const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
      const Canvas = require('canvas');
      
      // Read PDF file
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfData = new Uint8Array(pdfBuffer);
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdfDoc = await loadingTask.promise;
      
      const imagePaths = [];
      const numPages = pdfDoc.numPages;
      
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // 2x scale for better quality
        
        // Create canvas
        const canvas = Canvas.createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        // Render page to canvas
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        await page.render(renderContext).promise;
        
        // Save as JPEG
        const imageBuffer = canvas.toBuffer('image/jpeg', { quality: 0.85 });
        const imagePath = path.join(outputDirectory, `page-${pageNum}.jpg`);
        fs.writeFileSync(imagePath, imageBuffer);
        imagePaths.push(imagePath);
      }
      
      console.log(`Successfully converted ${imagePaths.length} pages to JPG using pdfjs-dist`);
      return imagePaths;
      
    } catch (error) {
      throw new Error(`PDF.js conversion failed: ${error.message}`);
    }
  }

  /**
   * Create basic image placeholders when other methods fail
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} outputDirectory - Output directory
   * @returns {Promise<Array>} - Array of image file paths
   */
  async createImagePlaceholders(pdfPath, outputDirectory) {
    try {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      const imagePaths = [];
      
      // Use Sharp to create actual images
      for (let i = 0; i < pageCount; i++) {
        const page = pdfDoc.getPage(i);
        const { width, height } = page.getSize();
        
        // Create a simple image using Sharp
        const imageBuffer = await sharp({
          create: {
            width: Math.round(width * 2), // 2x scale
            height: Math.round(height * 2),
            channels: 3,
            background: { r: 255, g: 255, b: 255 }
          }
        })
        .composite([
          {
            input: Buffer.from(
              `<svg width="${Math.round(width * 2)}" height="${Math.round(height * 2)}">
                <rect width="100%" height="100%" fill="white"/>
                <rect x="40" y="40" width="${Math.round(width * 2) - 80}" height="${Math.round(height * 2) - 80}" fill="none" stroke="#ddd" stroke-width="4"/>
                <text x="50%" y="45%" text-anchor="middle" font-family="Arial" font-size="48" fill="#666">PDF Page ${i + 1}</text>
                <text x="50%" y="55%" text-anchor="middle" font-family="Arial" font-size="24" fill="#999">Converted to Image</text>
                <text x="50%" y="65%" text-anchor="middle" font-family="Arial" font-size="20" fill="#bbb">Install poppler-utils for better quality</text>
              </svg>`
            ),
            top: 0,
            left: 0
          }
        ])
        .jpeg({ quality: 85 })
        .toBuffer();
        
        const imagePath = path.join(outputDirectory, `page-${i + 1}.jpg`);
        fs.writeFileSync(imagePath, imageBuffer);
        imagePaths.push(imagePath);
      }
      
      console.log(`Created ${imagePaths.length} placeholder JPG files`);
      return imagePaths;
      
    } catch (error) {
      throw new Error(`Image placeholder creation failed: ${error.message}`);
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

  /**
   * Fallback conversion method using pdf-poppler
   * @param {string} pdfPath - Path to the PDF file  
   * @param {Object} options - Conversion options
   * @returns {Promise<Array>} - Array of image file paths
   */
  async convertWithPdfPoppler(pdfPath, options = {}) {
    const { selectedPages = null, quality = 'normal' } = options;
    
    try {
      const pdfPoppler = require('pdf-poppler');
      const outputDir = path.join(require('os').tmpdir(), `pdf_poppler_${Date.now()}`);
      await fs.promises.mkdir(outputDir, { recursive: true });

      const popplrOptions = {
        format: 'jpeg',
        out_dir: outputDir,
        out_prefix: 'page',
        page: null // Convert all pages first, then filter
      };

      // If specific pages are selected, handle them
      if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
        // pdf-poppler doesn't support individual page selection well
        // So we'll convert all and filter afterwards
        console.log(`📄 Converting PDF with pdf-poppler, will filter to pages: ${selectedPages.join(', ')}`);
      }

      const result = await pdfPoppler.convert(pdfPath, popplrOptions);
      
      // Get generated files
      const files = await fs.promises.readdir(outputDir);
      let imageFiles = files
        .filter(file => file.endsWith('.jpg'))
        .sort()
        .map(file => path.join(outputDir, file));

      // Filter for selected pages if specified
      if (selectedPages && Array.isArray(selectedPages) && selectedPages.length > 0) {
        const selectedSet = new Set(selectedPages);
        imageFiles = imageFiles.filter((file, index) => {
          const pageNumber = index + 1; // pdf-poppler uses 1-based indexing
          return selectedSet.has(pageNumber);
        });
        
        console.log(`📋 Filtered to ${imageFiles.length} selected pages from ${files.filter(f => f.endsWith('.jpg')).length} total pages`);
      }

      if (imageFiles.length === 0) {
        throw new Error('No images were generated');
      }

      return imageFiles;
    } catch (error) {
      console.error('pdf-poppler conversion failed:', error);
      throw error;
    }
  }
}

module.exports = new ImageService();
