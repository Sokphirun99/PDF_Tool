# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-07-01 - Project Restructure

### Added
- **Modular Architecture**: Completely restructured project for better maintainability
- **Service Layer**: Separate services for PDF and image processing
- **Utility Modules**: Dedicated modules for common operations
- **Configuration Management**: Centralized configuration and constants
- **Development Tools**: Scripts for icon generation and build automation
- **Documentation**: Comprehensive guides for development and usage

### Changed
- **File Organization**: Moved all source files to `src/` directory structure
  ```
  src/
  ├── main/           # Main process files
  ├── renderer/       # Renderer process files  
  ├── utils/          # Utility modules
  └── shared/         # Shared resources
  ```
- **Asset Management**: Moved assets to `public/assets/` directory
- **Build Configuration**: Updated electron-builder configuration for new structure
- **Package Scripts**: Enhanced npm scripts with new development tools

### Technical Improvements
- **Main Process Refactoring**: Split large main.js into focused modules
  - `main.js`: Application lifecycle and coordination
  - `ipcHandlers.js`: Generic IPC communication
  - `pdfHandlers.js`: PDF-specific operations
- **Service Architecture**: Created dedicated service classes
  - `pdfService.js`: PDF manipulation using pdf-lib
  - `imageService.js`: Image processing with Sharp
  - `tempManager.js`: Temporary file management
  - `windowManager.js`: Window lifecycle management
- **Shared Resources**: Centralized configuration and constants
  - `constants.js`: Application-wide constants
  - `config.json`: Runtime configuration

### Developer Experience
- **Build Process**: Improved build scripts and automation
- **Icon Generation**: Automated icon generation from source SVG
- **Development Mode**: Enhanced development environment setup
- **Documentation**: Added comprehensive development guide
- **Code Organization**: Clear separation of concerns and responsibilities

### File Structure Changes
```
Before:
├── main.js
├── renderer.js
├── index.html
├── styles.css
├── assets/
└── temp/

After:
├── src/
│   ├── main/
│   ├── renderer/
│   ├── utils/
│   └── shared/
├── public/
├── build/
├── docs/
├── scripts/
└── temp/
```

### Benefits
- **Maintainability**: Easier to maintain and extend codebase
- **Scalability**: Better architecture for adding new features
- **Testing**: Improved testability with modular design
- **Development**: Enhanced developer experience and tooling
- **Performance**: Better resource management and optimization
- **Security**: Improved separation of concerns and data handling

### Migration Notes
- All existing functionality preserved
- No breaking changes to user interface
- Improved error handling and logging
- Better temporary file cleanup
- Enhanced cross-platform compatibility

### Future Enhancements Enabled
- Component-based UI architecture
- Plugin system support
- Advanced testing framework
- Automated CI/CD pipeline
- Enhanced build optimization
- Performance monitoring
- Advanced error reporting

---

## [0.9.0] - Previous Version

### Features
- Basic PDF manipulation (merge, split, compress, rotate)
- PDF to image conversion
- Image to PDF conversion
- Document format conversion
- Watermark functionality
- Drag & drop interface
