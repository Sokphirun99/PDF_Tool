# Development Guide

## Project Architecture

### Overview
This PDF Tools application follows a modular architecture separating concerns between the main process, renderer process, and shared utilities.

### Directory Structure

```
src/
├── main/           # Electron main process
├── renderer/       # UI and renderer process
├── utils/          # Utility modules
└── shared/         # Shared constants and config
```

## Main Process (`src/main/`)

### `main.js`
- Application entry point
- Manages app lifecycle
- Coordinates services initialization

### `ipcHandlers.js`
- Generic IPC communication handlers
- File system operations
- Dialog interactions

### `pdfHandlers.js`
- PDF-specific IPC handlers
- Coordinates PDF operations
- Manages processing workflows

## Renderer Process (`src/renderer/`)

### `index.html`
- Main application UI
- Tool selection interface
- File drag & drop zones

### `js/renderer.js`
- UI logic and event handling
- IPC communication with main process
- User interaction management

### `css/styles.css`
- Application styling
- Responsive design
- Modern UI components

## Utilities (`src/utils/`)

### `tempManager.js`
- Temporary file management
- Directory cleanup
- Unique directory creation

### `windowManager.js`
- Electron window management
- Window creation and lifecycle
- Window state management

### `pdfService.js`
- Core PDF manipulation
- PDF-lib integration
- Document processing

### `imageService.js`
- Image processing with Sharp
- Format conversion
- Image optimization

## Shared Resources (`src/shared/`)

### `constants.js`
- Application constants
- Error messages
- Configuration defaults

### `config.json`
- Runtime configuration
- Feature flags
- Application settings

## Development Workflow

### Setting Up Development Environment

1. **Clone and Install**
   ```bash
   git clone <repository>
   cd PDF_Tool
   npm install
   ```

2. **Development Mode**
   ```bash
   npm run dev
   ```
   This starts Electron with DevTools enabled.

3. **Production Build**
   ```bash
   npm run build
   ```

### Code Organization Principles

1. **Separation of Concerns**
   - Main process handles system operations
   - Renderer process manages UI
   - Services encapsulate business logic

2. **Modular Design**
   - Each module has a single responsibility
   - Clear interfaces between modules
   - Easy to test and maintain

3. **Error Handling**
   - Consistent error handling patterns
   - User-friendly error messages
   - Graceful failure recovery

### Adding New Features

1. **PDF Operations**
   - Add service method in `pdfService.js`
   - Create IPC handler in `pdfHandlers.js`
   - Add UI controls in renderer

2. **Image Processing**
   - Add method to `imageService.js`
   - Update IPC handlers as needed
   - Integrate with existing UI

3. **UI Components**
   - Add HTML structure
   - Style with CSS
   - Add JavaScript behavior

### Testing Strategy

1. **Unit Tests**
   - Test individual service methods
   - Mock external dependencies
   - Focus on business logic

2. **Integration Tests**
   - Test IPC communication
   - End-to-end workflows
   - File processing pipelines

3. **Manual Testing**
   - UI interaction testing
   - File format compatibility
   - Error condition handling

### Performance Considerations

1. **Memory Management**
   - Process large files in chunks
   - Clean up temporary files
   - Monitor memory usage

2. **Background Processing**
   - Use workers for heavy operations
   - Show progress indicators
   - Allow operation cancellation

3. **File Handling**
   - Stream large files
   - Implement efficient caching
   - Optimize temporary storage

### Build and Distribution

1. **Building for Multiple Platforms**
   ```bash
   npm run build:mac    # macOS
   npm run build:win    # Windows
   npm run build:linux  # Linux
   ```

2. **Icon Generation**
   ```bash
   npm run icons
   ```
   Generates platform-specific icons from source SVG.

3. **Clean Build**
   ```bash
   npm run clean
   npm run build
   ```

### Debugging

1. **Main Process Debugging**
   - Use console.log statements
   - Enable verbose logging
   - Check Electron console

2. **Renderer Process Debugging**
   - Use DevTools (F12)
   - Console debugging
   - Network tab for file operations

3. **IPC Communication**
   - Log IPC messages
   - Verify data serialization
   - Check async operation handling

### Common Issues and Solutions

1. **Path Resolution**
   - Use absolute paths
   - Check file existence
   - Handle different operating systems

2. **Memory Issues**
   - Monitor temp directory size
   - Implement cleanup strategies
   - Use streaming for large files

3. **UI Responsiveness**
   - Use background processing
   - Implement progress indicators
   - Avoid blocking operations

### Contributing Guidelines

1. **Code Style**
   - Use consistent indentation
   - Follow naming conventions
   - Add meaningful comments

2. **Commit Messages**
   - Use descriptive messages
   - Reference issue numbers
   - Follow conventional commits

3. **Testing**
   - Test all new features
   - Verify cross-platform compatibility
   - Check error handling

### Security Considerations

1. **File Access**
   - Validate file paths
   - Check file permissions
   - Sanitize user inputs

2. **External Dependencies**
   - Keep dependencies updated
   - Audit for vulnerabilities
   - Use trusted packages only

3. **User Data**
   - Process files locally only
   - Clear temporary files
   - Respect privacy settings
