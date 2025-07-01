const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const tempManager = require('../utils/tempManager');

class PDFService {
  constructor() {
    this.pdflibOptions = {
      ignoreEncryption: true
    };
  }

  /**
   * Merge multiple PDF files into one
   * @param {string[]} filePaths - Array of PDF file paths to merge
   * @returns {Promise<Uint8Array>} - Merged PDF as Uint8Array
   */
  async mergePDFs(filePaths) {
    try {
      const mergedPdf = await PDFDocument.create();

      for (const filePath of filePaths) {
        const pdfBytes = fs.readFileSync(filePath);
        const pdf = await PDFDocument.load(pdfBytes, this.pdflibOptions);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      return await mergedPdf.save();
    } catch (error) {
      throw new Error(`Failed to merge PDFs: ${error.message}`);
    }
  }

  /**
   * Split a PDF into individual pages
   * @param {string} filePath - Path to the PDF file
   * @param {number[]} pageIndices - Optional array of page indices to extract (0-based)
   * @returns {Promise<Array>} - Array of {pageNumber, pdfBytes} objects
   */
  async splitPDF(filePath, pageIndices = null) {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(pdfBytes, this.pdflibOptions);
      const totalPages = pdf.getPageCount();
      
      const pagesToExtract = pageIndices || Array.from({ length: totalPages }, (_, i) => i);
      const results = [];

      for (const pageIndex of pagesToExtract) {
        if (pageIndex >= 0 && pageIndex < totalPages) {
          const newPdf = await PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(pdf, [pageIndex]);
          newPdf.addPage(copiedPage);
          
          const pdfBytesResult = await newPdf.save();
          results.push({
            pageNumber: pageIndex + 1,
            pdfBytes: pdfBytesResult
          });
        }
      }

      return results;
    } catch (error) {
      throw new Error(`Failed to split PDF: ${error.message}`);
    }
  }

  /**
   * Compress a PDF file
   * @param {string} filePath - Path to the PDF file
   * @param {string} compressionLevel - Compression level: 'low', 'medium', 'high'
   * @returns {Promise<Uint8Array>} - Compressed PDF as Uint8Array
   */
  async compressPDF(filePath, compressionLevel = 'medium') {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(pdfBytes, this.pdflibOptions);

      // Simple compression by re-saving the PDF
      // For more advanced compression, additional libraries would be needed
      const compressedPdfBytes = await pdf.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: compressionLevel === 'high' ? 50 : compressionLevel === 'medium' ? 25 : 10
      });

      return compressedPdfBytes;
    } catch (error) {
      throw new Error(`Failed to compress PDF: ${error.message}`);
    }
  }

  /**
   * Rotate PDF pages
   * @param {string} filePath - Path to the PDF file
   * @param {number} rotation - Rotation angle (90, 180, 270)
   * @param {number[]} pageIndices - Optional array of page indices to rotate (0-based)
   * @returns {Promise<Uint8Array>} - Rotated PDF as Uint8Array
   */
  async rotatePDF(filePath, rotation, pageIndices = null) {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(pdfBytes, this.pdflibOptions);
      const totalPages = pdf.getPageCount();
      
      const pagesToRotate = pageIndices || Array.from({ length: totalPages }, (_, i) => i);

      for (const pageIndex of pagesToRotate) {
        if (pageIndex >= 0 && pageIndex < totalPages) {
          const page = pdf.getPage(pageIndex);
          page.setRotation({ angle: rotation });
        }
      }

      return await pdf.save();
    } catch (error) {
      throw new Error(`Failed to rotate PDF: ${error.message}`);
    }
  }

  /**
   * Add text watermark to PDF
   * @param {string} filePath - Path to the PDF file
   * @param {string} watermarkText - Text to use as watermark
   * @param {Object} options - Watermark options
   * @returns {Promise<Uint8Array>} - Watermarked PDF as Uint8Array
   */
  async addWatermark(filePath, watermarkText, options = {}) {
    try {
      const {
        opacity = 0.5,
        fontSize = 50,
        color = [128, 128, 128],
        rotation = 45,
        position = 'center'
      } = options;

      const pdfBytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(pdfBytes, this.pdflibOptions);
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      
      const pages = pdf.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        let x, y;
        switch (position) {
          case 'center':
            x = width / 2;
            y = height / 2;
            break;
          case 'top-left':
            x = 50;
            y = height - 50;
            break;
          case 'top-right':
            x = width - 50;
            y = height - 50;
            break;
          case 'bottom-left':
            x = 50;
            y = 50;
            break;
          case 'bottom-right':
            x = width - 50;
            y = 50;
            break;
          default:
            x = width / 2;
            y = height / 2;
        }

        page.drawText(watermarkText, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(color[0] / 255, color[1] / 255, color[2] / 255),
          opacity,
          rotate: { angle: rotation },
        });
      }

      return await pdf.save();
    } catch (error) {
      throw new Error(`Failed to add watermark: ${error.message}`);
    }
  }

  /**
   * Get PDF metadata
   * @param {string} filePath - Path to the PDF file
   * @returns {Promise<Object>} - PDF metadata
   */
  async getPDFMetadata(filePath) {
    try {
      const pdfBytes = fs.readFileSync(filePath);
      const pdf = await PDFDocument.load(pdfBytes, this.pdflibOptions);
      
      const pageCount = pdf.getPageCount();
      const title = pdf.getTitle();
      const author = pdf.getAuthor();
      const subject = pdf.getSubject();
      const creator = pdf.getCreator();
      const producer = pdf.getProducer();
      const creationDate = pdf.getCreationDate();
      const modificationDate = pdf.getModificationDate();

      return {
        pageCount,
        title,
        author,
        subject,
        creator,
        producer,
        creationDate,
        modificationDate,
        fileSize: fs.statSync(filePath).size
      };
    } catch (error) {
      throw new Error(`Failed to get PDF metadata: ${error.message}`);
    }
  }
}

module.exports = new PDFService();
