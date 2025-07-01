# PDF Tools - Electron Application

A comprehensive PDF manipulation tool built with Electron by **phirun**. This desktop application provides a modern, user-friendly interface for various PDF operations, replicating the functionality of ilovepdf.com.

## About the Creator

This application was created and developed by **phirun** - a comprehensive PDF toolkit designed to provide professional-grade PDF manipulation capabilities in a desktop application.

## Features

### Core PDF Operations
- **Merge PDF**: Combine multiple PDF files into one document
- **Split PDF**: Extract pages or split PDF into multiple files
- **Compress PDF**: Reduce file size while maintaining quality
- **Rotate PDF**: Rotate pages to correct orientation
- **Watermark PDF**: Add text watermarks to documents

### Conversion Tools
- **PDF to JPG**: Advanced PDF image processing with multiple modes:
  - **Page Conversion**: Convert each PDF page to high-quality images
  - **Image Extraction**: Extract embedded images from PDF content
  - **Combined Processing**: Both convert pages AND extract embedded images
  - **Smart Image Optimization**: Adjustable quality from 30% to 100%
  - **Multiple Output Formats**: JPEG, PNG, and WebP support
  - **Resolution Control**: 72-300 DPI options for different use cases
  - **Organized ZIP Creation**: Separate folders for page images and extracted images
  - **Individual Save Options**: Save each image separately with descriptive naming
  - **Compression Statistics**: Real-time feedback on file size reduction
- **JPG to PDF**: Create PDF documents from images
- **Word to PDF**: Convert Word documents to PDF format
- **Excel to PDF**: Convert Excel spreadsheets to PDF format

### User Interface
- Modern, responsive design with gradient backgrounds
- Drag & drop file support
- Real-time progress tracking
- Professional tool cards layout
- Intuitive navigation and controls

## Installation

### Prerequisites
- **Node.js**: Version 18.x or 20.x recommended for best compatibility
- **npm**: Comes with Node.js installation

### Setup Steps

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd convert_pdf_all
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Rebuild native modules (if needed):**
   ```bash
   npm rebuild canvas
   ```
   *This step is important if you encounter NODE_MODULE_VERSION errors*

4. **Run the application:**
   ```bash
   npm start
   ```

### Troubleshooting Installation

If you encounter native module compilation errors:

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules
npm rebuild canvas

# Alternative: Force rebuild everything
npm rebuild
```

## Development

### Development Mode
Run the application in development mode with DevTools enabled:
```bash
npm run dev
```

### Building for Distribution
Create distributable packages:
```bash
npm run build
```

### Project Structure
```
convert_pdf_all/
├── main.js              # Main Electron process
├── index.html           # Main application window
├── styles.css           # Application styles
├── renderer.js          # Renderer process logic
├── package.json         # Project configuration
├── assets/              # Application assets
└── temp/               # Temporary file processing
```

## Dependencies

### Core Dependencies
- **electron**: Desktop application framework
- **pdf-lib**: PDF manipulation library
- **pdf-poppler**: PDF to image conversion using poppler-utils (optional)
- **sharp**: Image processing

### Additional Libraries
- **express**: For potential local server functionality
- **multer**: File upload handling
- **mammoth**: Word document processing
- **xlsx**: Excel file processing
- **jspdf**: PDF generation

## Important Notes

### PDF to Image Conversion
This application uses a **dual-approach system** for PDF to image conversion:

1. **Primary Method**: `pdf-poppler` with system poppler-utils
   - ✅ **High Quality**: True image rendering of PDF content
   - ✅ **Fast Processing**: Native C++ performance
   - ⚠️ **Requires**: poppler-utils to be installed on system

2. **Fallback Method**: Pure JavaScript SVG generation
   - ✅ **No Dependencies**: Works without any external tools
   - ✅ **Always Available**: Guaranteed to work on any system
   - ℹ️ **Preview Only**: Creates visual page representations, not pixel-perfect images

### System Requirements for High-Quality Images

**macOS (with Homebrew):**
```bash
brew install poppler
```

**Ubuntu/Debian:**
```bash
sudo apt-get install poppler-utils
```

**Windows:**
- Download poppler from: https://blog.alivate.com.au/poppler-windows/
- Add to PATH environment variable

### How It Works
- **If poppler-utils is available**: Creates high-quality PNG/JPEG images
- **If poppler-utils is missing**: Creates beautiful SVG previews with page info
- **Automatic fallback**: No configuration needed, works in both scenarios

## Usage

1. **Launch the application**
2. **Select a tool** from the tools grid
3. **Upload files** using drag & drop or file picker
4. **Configure options** (if applicable)
5. **Process files** and download results

### Supported File Formats

#### Input Formats
- PDF files (`.pdf`)
- Images (`.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`)
- Word documents (`.doc`, `.docx`)
- Excel files (`.xls`, `.xlsx`)
- PowerPoint (`.ppt`, `.pptx`)

#### Output Formats
- PDF (`.pdf`)
- JPG images (`.jpg`)
- PNG images (`.png`)

## Features in Detail

### Merge PDF
- Select multiple PDF files
- Maintains original quality
- Preserves bookmarks and links
- Custom output filename

### Split PDF
- Split by page ranges (e.g., 1-3, 5-7)
- Split into equal parts
- Extract specific pages
- Multiple output files

### Compress PDF
- Three compression levels
- Quality vs. size optimization
- Batch processing support
- Significant size reduction

### PDF to Images
- High-quality image extraction
- Multiple format support
- Customizable resolution
- Batch conversion

### Watermark PDF
- Custom text watermarks
- Adjustable opacity
- Diagonal placement
- Professional appearance

## Technical Details

### Architecture
- **Main Process**: Handles file operations and system integration
- **Renderer Process**: Manages UI and user interactions
- **IPC Communication**: Secure communication between processes

### Security
- Context isolation disabled for development (should be enabled for production)
- Node integration for file system access
- Secure file handling practices

### Performance
- Asynchronous file processing
- Progress tracking
- Memory efficient operations
- Automatic temporary file cleanup
- Smart temp directory management:
  - **Development**: Uses `./temp/` in project directory
  - **Production**: Uses system temp directory for packaged apps
  - **Cleanup**: Automatic removal of files older than 30 minutes
  - **Isolation**: Each operation gets unique temp directory

## Building for Production

### Prerequisites for Building
Before building, ensure you have the required tools installed:

```bash
# Install Xcode Command Line Tools (macOS)
xcode-select --install

# Install build tools (if needed)
npm install -g electron-builder
```

### macOS Apple Silicon (M1/M2/M3)
For Apple Silicon Macs, you have several build options:

#### Universal Binary (Recommended)
Builds for both Intel and Apple Silicon:
```bash
npm run build -- --mac --universal
```

#### Apple Silicon Only
Builds specifically for M1/M2/M3 Macs:
```bash
npm run build -- --mac --arm64
```

#### Intel Only (for compatibility)
```bash
npm run build -- --mac --x64
```

#### Build Configuration
Add this to your `package.json` for optimal Apple Silicon builds:
```json
{
  "build": {
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["universal"]
        },
        {
          "target": "zip",
          "arch": ["universal"]
        }
      ],
      "category": "public.app-category.productivity"
    }
  }
}
```

### Windows
```bash
npm run build -- --win
```

### Linux
```bash
npm run build -- --linux
```

### Apple Silicon Build Tips

1. **Node.js Version**: Use Node.js 18.x or 20.x for best Apple Silicon compatibility
2. **Rosetta Issues**: If you encounter native module issues, try:
   ```bash
   # Clean and reinstall with Apple Silicon Node
   rm -rf node_modules package-lock.json
   arch -arm64 npm install
   ```
3. **Universal Builds**: Create universal binaries that work on both Intel and Apple Silicon
4. **Testing**: Test on both architectures if possible

## Troubleshooting

### Common Issues

1. **Files not processing**
   - Check file permissions
   - Ensure supported file format
   - Verify file is not corrupted

2. **Application won't start**
   - Run `npm install` to ensure dependencies
   - Check Node.js version compatibility
   - Clear npm cache if needed

3. **Processing errors**
   - Check available disk space
   - Ensure write permissions in output directory
   - Try with smaller files first

4. **Packaged app temp directory error**
   - **Fixed**: App now uses system temp directory when packaged
   - Development: Uses `./temp/` in project directory
   - Production: Uses system temp directory (e.g., `/tmp/pdf-tools-electron/`)
   - Automatic cleanup prevents temp file accumulation

5. **PDF to Image conversion fails**
   - ✅ **Fixed**: No longer requires GraphicsMagick/ImageMagick
   - Uses pure JavaScript solution with PDF.js v3.11.174
   - If you see canvas-related errors, ensure Node.js version compatibility
   - **Module compatibility**: Uses CommonJS-compatible version of pdfjs-dist
   - **Native module issues**: Run `npm rebuild canvas` if you see NODE_MODULE_VERSION errors

5. **Native module compilation errors**
   - **Canvas module**: If you see NODE_MODULE_VERSION errors, run `npm rebuild canvas`
   - **Node.js version mismatch**: Ensure consistent Node.js version across development
   - **Electron compatibility**: Canvas module needs to match Electron's Node.js version

6. **Apple Silicon (M1/M2/M3) Build Issues**
   - **Architecture mismatch**: Ensure you're using arm64 Node.js on Apple Silicon
   - **Rosetta conflicts**: Avoid mixing x64 and arm64 binaries:
     ```bash
     # Check Node.js architecture
     node -p "process.arch"  # Should show 'arm64' on Apple Silicon
     
     # Force arm64 if needed
     arch -arm64 npm install
     arch -arm64 npm run build:mac:arm64
     ```
   - **Native modules**: Some modules may need rebuilding for Apple Silicon:
     ```bash
     npm rebuild --arch=arm64
     ```
   - **Universal builds**: If targeting both Intel and Apple Silicon:
     ```bash
     npm run build:mac:universal
     ```

### Resolved Issues

**❌ Old Error**: `Could not execute GraphicsMagick/ImageMagick: gm "identify"`
**✅ Solution**: Replaced `pdf2pic` with `pdfjs-dist@3.11.174` + `canvas`

**❌ ES Module Error**: `Cannot find module 'pdfjs-dist/legacy/build/pdf.js'`
**✅ Solution**: Used specific CommonJS-compatible version (3.11.174) instead of latest ES module version

**❌ Buffer Type Error**: `Please provide binary data as Uint8Array, rather than Buffer`
**✅ Solution**: Convert Node.js Buffer to Uint8Array before passing to PDF.js
```javascript
const pdfBuffer = fs.readFileSync(filePath);
const pdfData = new Uint8Array(pdfBuffer); // Convert Buffer to Uint8Array
const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
```

**❌ Native Module Error**: `NODE_MODULE_VERSION 127. This version of Node.js requires NODE_MODULE_VERSION 118`
**✅ Solution**: Switched from canvas-dependent libraries to poppler-utils + pure JavaScript fallback
```bash
# Install poppler-utils for high-quality conversion (optional)
brew install poppler  # macOS
sudo apt-get install poppler-utils  # Linux

# The app works without poppler-utils (creates SVG previews instead)
```

**❌ Canvas Native Module Issues**: Various NODE_MODULE_VERSION conflicts
**✅ Solution**: Eliminated native module dependencies entirely
- Primary: Uses `pdf-poppler` with system poppler-utils
- Fallback: Pure JavaScript SVG generation with pdf-lib
- Result: Works on any system without compilation issues

This provides a robust solution that works with or without external dependencies.

### Development Issues

1. **DevTools not opening**
   - Use `npm run dev` instead of `npm start`
   - Check console for errors

2. **Module not found errors**
   - Run `npm install` again
   - Check package.json for missing dependencies

## Contributing

This project is maintained by **phirun**. If you'd like to contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - Created by **phirun**

## Acknowledgments

- Created and developed by **phirun**
- Inspired by ilovepdf.com functionality
- Built with Electron framework
- Uses pdf-lib for PDF operations
- Modern UI design with CSS3

## Contact

Created by **phirun** - For questions or support regarding this PDF Tools application.

## Future Enhancements

- OCR text extraction
- Digital signature support
- Form filling capabilities
- Batch processing improvements
- Cloud storage integration
- Advanced compression algorithms

---

**Note**: This application was created by **phirun** and is designed for desktop use, providing offline PDF processing capabilities without requiring internet connectivity.

## 🚀 Enhanced Image Compression Features

### PDF to Image Conversion with Advanced Compression

Our PDF to Image conversion tool now includes powerful compression features that give you full control over output quality and file sizes:

#### 🎛️ Quality Control Options
- **Image Quality Slider**: Adjust compression from 30% to 100%
  - 30-50%: Maximum compression for web thumbnails
  - 60-80%: Balanced compression for general use
  - 85-95%: High quality for professional documents
  - 100%: Lossless quality for archival purposes

#### 📐 Resolution Settings
- **72 DPI**: Perfect for web display and email sharing
- **96 DPI**: Standard screen resolution
- **150 DPI**: Recommended for most applications (default)
- **200 DPI**: High quality for detailed viewing
- **300 DPI**: Print-quality resolution

#### 🖼️ Output Format Options
- **JPEG**: Best compression ratio, ideal for photos and documents
- **PNG**: Lossless compression, perfect for images with transparency
- **WebP**: Modern format with superior compression and quality

#### 📦 Advanced ZIP Compression
1. **Standard ZIP**: Basic archiving of generated images
2. **Optimized ZIP**: Advanced compression with:
   - Pre-compression image optimization
   - Maximum ZIP compression (level 9)
   - Real-time compression statistics
   - File size reduction tracking

#### 💡 Smart Recommendations
The interface provides intelligent suggestions based on your selected options:
- **Estimated file sizes** before processing
- **Compression ratio previews**
- **Quality vs. size trade-off indicators**
- **Format recommendations** based on content type

#### 📊 Compression Statistics
After processing, you'll see detailed statistics including:
- Original vs. compressed file sizes
- Percentage of space saved
- Number of images processed
- Final archive specifications

### Usage Example

1. Select "PDF to JPG" tool
2. Upload your PDF file
3. Adjust quality settings (recommended: 85% quality, 150 DPI, JPEG format)
4. Choose between:
   - **Save Individual Images**: Select location for each image
   - **Save as ZIP Archive**: Create standard compressed archive
   - **Optimize & ZIP**: Advanced compression with quality control

The **Optimize & ZIP** option provides the best compression results, often reducing file sizes by 60-80% while maintaining excellent visual quality.

## 🖼️ Enhanced PDF Image Processing

### Three Processing Modes

#### 1. **Convert Pages to Images** 
- Converts each PDF page into a separate JPG/PNG image
- Perfect for creating image versions of document pages
- Maintains page layout and formatting
- High-quality rendering with customizable DPI settings

#### 2. **Extract Embedded Images**
- Extracts images that are embedded within the PDF content
- Finds photos, graphics, and illustrations embedded in the document
- Preserves original image quality and format
- Useful for extracting assets from PDFs

#### 3. **Do Both (Recommended)**
- Combines both page conversion and image extraction
- Gets everything: page images + embedded images
- Most comprehensive option for maximum image recovery
- Organizes results into separate categories

### Intelligent File Organization

When using the combined processing mode, the application organizes results into:

- **📄 Page Images**: `filename_page_1.jpg`, `filename_page_2.jpg`, etc.
- **🖼️ Extracted Images**: `filename_extracted_1.jpg`, `filename_extracted_2.png`, etc.
- **📦 ZIP Structure**: Organized folders (`/pages/` and `/extracted/`) for easy navigation

### Advanced Features

#### Smart Detection
- Automatically detects embedded images using `pdfimages` (poppler-utils)
- Fallback to PDF-lib for systems without poppler-utils
- Handles various image formats (JPEG, PNG, PBM, PPM, CCITT)

#### Quality Control
- **Page Conversion**: Full quality control with DPI and format options
- **Image Extraction**: Preserves original embedded image quality
- **Compression**: Post-processing optimization for file size reduction

#### Batch Processing
- Process large PDFs with many pages efficiently
- Memory-optimized handling for large documents
- Progress tracking for long operations
