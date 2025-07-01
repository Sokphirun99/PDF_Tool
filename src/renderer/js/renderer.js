const { ipcRenderer } = require('electron');

// Global variables
let currentTool = null;
let selectedFiles = [];
let currentRotation = 90;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setupDropZone();
});

function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target.getAttribute('href').substring(1);
            navigateToSection(target);
        });
    });

    // Rotation buttons
    document.querySelectorAll('.rotation-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.rotation-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentRotation = parseInt(e.target.dataset.angle);
        });
    });

    // Watermark opacity slider
    const opacitySlider = document.getElementById('watermarkOpacity');
    const opacityValue = document.getElementById('opacityValue');
    if (opacitySlider && opacityValue) {
        opacitySlider.addEventListener('input', (e) => {
            opacityValue.textContent = Math.round(e.target.value * 100) + '%';
        });
    }
}

function setupDropZone() {
    const dropZone = document.getElementById('dropZone');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        
        const files = Array.from(e.dataTransfer.files);
        handleFileSelection(files);
    });
}

function scrollToTools() {
    document.getElementById('tools').scrollIntoView({ behavior: 'smooth' });
}

function navigateToSection(section = 'home') {
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${section}"]`).classList.add('active');

    // Show/hide sections
    if (section === 'home') {
        document.getElementById('home').style.display = 'block';
        document.getElementById('tools').style.display = 'block';
        document.getElementById('processing').style.display = 'none';
    } else {
        document.getElementById('home').style.display = 'none';
        document.getElementById('tools').style.display = 'none';
        document.getElementById('processing').style.display = 'block';
    }
}

function selectTool(tool) {
    currentTool = tool;
    selectedFiles = [];
    
    // Hide home sections
    document.getElementById('home').style.display = 'none';
    document.getElementById('tools').style.display = 'none';
    document.getElementById('processing').style.display = 'block';
    
    // Update tool title and description
    const toolConfig = getToolConfig(tool);
    document.getElementById('tool-title').textContent = toolConfig.title;
    document.getElementById('drop-zone-description').textContent = toolConfig.description;
    
    // Show/hide tool-specific options
    hideAllOptions();
    if (toolConfig.options) {
        document.getElementById('toolOptions').style.display = 'block';
        document.getElementById(toolConfig.options).style.display = 'block';
    }
    
    // Reset UI
    document.getElementById('fileList').style.display = 'none';
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
}

function getToolConfig(tool) {
    const configs = {
        'merge': {
            title: 'Merge PDF',
            description: 'Select multiple PDF files to merge into one document',
            options: null
        },
        'split': {
            title: 'Split PDF',
            description: 'Select a PDF file to split into multiple documents',
            options: 'splitOptions'
        },
        'compress': {
            title: 'Compress PDF',
            description: 'Select PDF files to compress and reduce file size',
            options: 'compressOptions'
        },
        'pdf-to-jpg': {
            title: 'PDF to Compressed Images',
            description: 'Drop your PDF here (supports large files with many pages) → Convert to optimized JPG/PNG images',
            options: 'imageOptions'
        },
        'jpg-to-pdf': {
            title: 'JPG to PDF',
            description: 'Select JPG images to convert to PDF',
            options: null
        },
        'rotate': {
            title: 'Rotate PDF',
            description: 'Select PDF files to rotate',
            options: 'rotateOptions'
        },
        'watermark': {
            title: 'Watermark PDF',
            description: 'Select PDF files to add watermarks',
            options: 'watermarkOptions'
        },
        'word-to-pdf': {
            title: 'Word to PDF',
            description: 'Select Word documents to convert to PDF',
            options: null
        },
        'excel-to-pdf': {
            title: 'Excel to PDF',
            description: 'Select Excel files to convert to PDF',
            options: null
        }
    };
    
    return configs[tool] || { title: 'Unknown Tool', description: 'Select files to process' };
}

function hideAllOptions() {
    document.getElementById('toolOptions').style.display = 'none';
    document.querySelectorAll('.option-group').forEach(group => {
        group.style.display = 'none';
    });
}

function goBack() {
    document.getElementById('home').style.display = 'block';
    document.getElementById('tools').style.display = 'block';
    document.getElementById('processing').style.display = 'none';
    currentTool = null;
    selectedFiles = [];
}

async function selectFiles() {
    try {
        let result;
        
        // Determine which file selector to use based on current tool
        switch(currentTool) {
            case 'jpg-to-pdf':
            case 'images-to-pdf':
                result = await ipcRenderer.invoke('select-image-files');
                break;
            case 'word-to-pdf':
                result = await ipcRenderer.invoke('select-word-files');
                break;
            case 'merge':
            case 'split':
            case 'compress':
            case 'rotate':
            case 'watermark':
            case 'pdf-to-jpg':
                result = await ipcRenderer.invoke('select-pdf-files');
                break;
            default:
                // Fallback to image files for unknown tools
                result = await ipcRenderer.invoke('select-image-files');
                break;
        }
        
        if (!result.canceled && result.filePaths.length > 0) {
            handleFileSelection(result.filePaths);
        }
    } catch (error) {
        console.error('Error selecting files:', error);
        showError('Failed to select files');
    }
}

function handleFileSelection(files) {
    if (typeof files[0] === 'string') {
        // File paths from dialog
        selectedFiles = files.map(filePath => ({
            path: filePath,
            name: filePath.split('/').pop(),
            size: 'Unknown'
        }));
    } else {
        // File objects from drag & drop
        selectedFiles = Array.from(files).map(file => ({
            path: file.path,
            name: file.name,
            size: formatFileSize(file.size)
        }));
    }
    
    displayFileList();
}

async function displayFileList() {
    const fileList = document.getElementById('fileList');
    const filesContainer = document.getElementById('files');
    
    filesContainer.innerHTML = '';
    
    for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index];
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        let pageInfo = '';
        // If it's PDF to JPG tool and it's a PDF file, show page count
        if (currentTool === 'pdf-to-jpg' && file.name.toLowerCase().endsWith('.pdf')) {
            try {
                const pageCount = await ipcRenderer.invoke('get-pdf-page-count', file.path);
                if (pageCount > 0) {
                    pageInfo = `<p style="color: #667eea; font-weight: bold;">📄 ${pageCount} page${pageCount > 1 ? 's' : ''} → ${pageCount} JPG file${pageCount > 1 ? 's' : ''} will be created</p>`;
                }
            } catch (error) {
                console.log('Could not get page count:', error);
            }
        }
        
        fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-file-pdf"></i>
                </div>
                <div class="file-details">
                    <h4>${file.name}</h4>
                    <p>Size: ${file.size}</p>
                    ${pageInfo}
                </div>
            </div>
            <button class="btn btn-outline" onclick="removeFile(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        filesContainer.appendChild(fileItem);
    }
    
    fileList.style.display = 'block';
    
    // Show PDF to JPG preview if applicable
    await showPdfToJpgPreview();
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    if (selectedFiles.length === 0) {
        document.getElementById('fileList').style.display = 'none';
    } else {
        displayFileList();
    }
}

function clearFiles() {
    selectedFiles = [];
    document.getElementById('fileList').style.display = 'none';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function processFiles() {
    if (selectedFiles.length === 0) {
        showError('Please select files to process');
        return;
    }
    
    showProgress('Processing files...');
    
    try {
        let result;
        const filePaths = selectedFiles.map(file => file.path);
        
        switch (currentTool) {
            case 'merge':
                result = await ipcRenderer.invoke('merge-pdfs', filePaths);
                if (result.success) {
                    const outputName = generateMergedFilename(selectedFiles);
                    await saveResult(result, outputName);
                } else {
                    showError(`Merge failed: ${result.error}`);
                }
                break;
                
            case 'split':
                const splitRanges = getSplitRanges();
                result = await ipcRenderer.invoke('split-pdf', filePaths[0], splitRanges);
                if (result.success) {
                    const outputName = generateSplitFilename(selectedFiles[0]);
                    await saveMultipleResults(result, outputName);
                } else {
                    showError(`Split failed: ${result.error}`);
                }
                break;
                
            case 'compress':
                const compression = getCompressionLevel();
                result = await ipcRenderer.invoke('compress-pdf', filePaths[0], compression);
                if (result.success) {
                    const outputName = generateProcessedFilename(selectedFiles[0], 'compressed');
                    await saveResult(result, outputName);
                } else {
                    showError(`Compression failed: ${result.error}`);
                }
                break;
                
            case 'pdf-to-jpg':
                const imageOptions = getImageConversionOptions();
                const processingMode = getProcessingMode();
                
                // Show quality setting in the status
                const qualityText = imageOptions.quality === 100 ? 'High (100%)' : 'Normal (75%)';
                showProgress(`Converting PDF with ${qualityText} quality...`);
                
                try {
                    if (processingMode === 'extract') {
                        // Extract embedded images only
                        result = await ipcRenderer.invoke('extract-pdf-images', filePaths[0], imageOptions);
                        if (result && result.length > 5) {
                            await autoCreateZipFromImages(result, filePaths[0], 'extracted');
                        } else {
                            await saveImageResults(result, filePaths[0], 'extracted');
                        }
                    } else {
                        // Convert pages to JPG (default)
                        result = await ipcRenderer.invoke('pdf-to-images', filePaths[0], 'jpg', imageOptions);
                        if (result && result.length > 5) {
                            await autoCreateZipFromImages(result, filePaths[0], 'pages');
                        } else {
                            await saveImageResults(result, filePaths[0]);
                        }
                    }
                } catch (conversionError) {
                    // Provide specific guidance based on the error
                    let errorMessage = conversionError.message;
                    let helpText = '';
                    
                    if (errorMessage.includes('pdftoppm') || errorMessage.includes('poppler')) {
                        helpText = '\n\n💡 To get high-quality image conversion, install poppler-utils:\n' +
                                  '• macOS: brew install poppler\n' +
                                  '• Ubuntu: sudo apt-get install poppler-utils\n' +
                                  '• Windows: Download from poppler-windows\n\n' +
                                  'The app will use preview mode without poppler-utils.';
                    } else if (errorMessage.includes('fallback failed')) {
                        helpText = '\n\n📝 This appears to be a complex PDF. Try:\n' +
                                  '• Using a smaller PDF for testing\n' +
                                  '• Checking if the PDF is password-protected\n' +
                                  '• Installing poppler-utils for better compatibility';
                    }
                    
                    showError(`PDF conversion failed: ${errorMessage}${helpText}`);
                    throw conversionError;
                }
                break;
                
            case 'jpg-to-pdf':
                result = await ipcRenderer.invoke('images-to-pdf', filePaths);
                if (result.success) {
                    // Generate filename based on input images
                    const outputName = generateImagesToPDFFilename(selectedFiles);
                    await saveResult(result, outputName);
                } else {
                    showError(`Image to PDF conversion failed: ${result.error}`);
                }
                break;
                
            case 'rotate':
                result = await ipcRenderer.invoke('rotate-pdf', filePaths[0], currentRotation);
                if (result.success) {
                    const outputName = generateProcessedFilename(selectedFiles[0], 'rotated');
                    await saveResult(result, outputName);
                } else {
                    showError(`Rotation failed: ${result.error}`);
                }
                break;
                
            case 'watermark':
                const watermarkText = document.getElementById('watermarkText').value;
                const opacity = parseFloat(document.getElementById('watermarkOpacity').value);
                if (!watermarkText) {
                    showError('Please enter watermark text');
                    return;
                }
                result = await ipcRenderer.invoke('add-watermark', filePaths[0], watermarkText, opacity);
                if (result.success) {
                    const outputName = generateProcessedFilename(selectedFiles[0], 'watermarked');
                    await saveResult(result, outputName);
                } else {
                    showError(`Watermark failed: ${result.error}`);
                }
                break;
                
            default:
                showError('Tool not implemented yet');
                return;
        }
        
        hideProgress();
        
    } catch (error) {
        console.error('Processing error:', error);
        hideProgress();
        showError(`Processing failed: ${error.message}`);
    }
}

function getSplitRanges() {
    const splitType = document.querySelector('input[name="splitType"]:checked').value;
    
    if (splitType === 'pages') {
        const ranges = document.getElementById('pageRanges').value;
        return parsePageRanges(ranges);
    } else {
        const partCount = parseInt(document.getElementById('partCount').value);
        // This would need to be calculated based on the PDF page count
        // For now, return a simple split
        return [[0, 2], [3, 5]]; // Example ranges
    }
}

function parsePageRanges(rangesStr) {
    const ranges = [];
    const parts = rangesStr.split(',');
    
    parts.forEach(part => {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
            const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()) - 1);
            const range = [];
            for (let i = start; i <= end; i++) {
                range.push(i);
            }
            ranges.push(range);
        } else {
            ranges.push([parseInt(trimmed) - 1]);
        }
    });
    
    return ranges;
}

function getCompressionLevel() {
    const level = document.querySelector('input[name="compression"]:checked').value;
    const levels = { low: 0.9, medium: 0.7, high: 0.5 };
    return levels[level] || 0.7;
}

function getImageConversionOptions() {
    // Get quality setting from radio buttons
    const qualityRadio = document.querySelector('input[name="imageQuality"]:checked');
    const quality = qualityRadio && qualityRadio.value === 'high' ? 100 : 75;
    
    return {
        quality: quality,
        dpi: qualityRadio && qualityRadio.value === 'high' ? 300 : 150, // Higher DPI for high quality
        format: 'jpg',
        optimize: true
    };
}

function getProcessingMode() {
    const modeRadio = document.querySelector('input[name="processingMode"]:checked');
    return modeRadio ? modeRadio.value : 'pages';
}

async function saveResult(result, defaultName) {
    try {
        // Handle the response format from IPC handlers
        let buffer;
        if (result && result.success && result.data) {
            buffer = result.data;
        } else if (Buffer.isBuffer(result)) {
            buffer = result;
        } else {
            throw new Error('Invalid result format - expected buffer or success response');
        }

        const saveDialog = await ipcRenderer.invoke('save-file', defaultName);
        if (!saveDialog.canceled) {
            require('fs').writeFileSync(saveDialog.filePath, buffer);
            showSuccess(`File saved successfully: ${saveDialog.filePath}`);
        }
    } catch (error) {
        showError(`Failed to save file: ${error.message}`);
    }
}

async function saveMultipleResults(result, baseName) {
    try {
        // Handle the response format from IPC handlers
        let buffers;
        if (result && result.success && result.data) {
            buffers = result.data;
        } else if (Array.isArray(result)) {
            buffers = result;
        } else {
            throw new Error('Invalid result format - expected array of buffers or success response');
        }

        const results = [];
        for (let i = 0; i < buffers.length; i++) {
            try {
                const saveDialog = await ipcRenderer.invoke('save-file', `${baseName}-${i + 1}.pdf`);
                if (!saveDialog.canceled) {
                    // Handle buffer format - might be an object with pdfBytes property
                    const buffer = buffers[i].pdfBytes || buffers[i];
                    require('fs').writeFileSync(saveDialog.filePath, buffer);
                    results.push(saveDialog.filePath);
                }
            } catch (error) {
                console.error('Error saving file:', error);
            }
        }
        showSuccess(`${results.length} files saved successfully`);
    } catch (error) {
        showError(`Failed to save files: ${error.message}`);
    }
}

async function saveImageResults(imagePaths, originalPdfPath) {
    try {
        const savedPaths = await ipcRenderer.invoke('save-images', imagePaths, originalPdfPath);
        
        if (savedPaths.length > 0) {
            showSuccess(`${savedPaths.length} image(s) saved successfully!`);
            
            // Show the saved files in results
            const resultsSection = document.getElementById('resultsSection');
            const downloadLinks = document.getElementById('downloadLinks');
            
            downloadLinks.innerHTML = '';
            
            // Check if we got SVG files (fallback mode) or actual images
            const isSvgFallback = imagePaths.length > 0 && imagePaths[0].endsWith('.svg');
            
            if (isSvgFallback) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'alert alert-warning';
                warningDiv.innerHTML = `
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                        <h4 style="color: #856404; margin-bottom: 10px;">
                            <i class="fas fa-exclamation-triangle"></i> Preview Mode Files Saved
                        </h4>
                        <p style="color: #856404;">SVG preview files were saved. For actual JPG images, install poppler-utils.</p>
                    </div>
                `;
                downloadLinks.appendChild(warningDiv);
            }
            
            savedPaths.forEach((savedPath, index) => {
                const downloadItem = document.createElement('div');
                downloadItem.className = 'download-item';
                
                const fileExtension = savedPath.split('.').pop().toUpperCase();
                const isActualImage = ['PNG', 'JPG', 'JPEG'].includes(fileExtension);
                
                downloadItem.innerHTML = `
                    <div class="file-info">
                        <div class="file-icon" style="background: ${isActualImage ? '#28a745' : '#ffc107'}">
                            <i class="fas fa-${isActualImage ? 'image' : 'file-code'}"></i>
                        </div>
                        <div class="file-details">
                            <h4>Saved: ${savedPath.split('/').pop()}</h4>
                            <p>${savedPath}</p>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="openImageLocation('${savedPath}')">
                        <i class="fas fa-folder-open"></i>
                        Open Location
                    </button>
                `;
                downloadLinks.appendChild(downloadItem);
            });
            
            resultsSection.style.display = 'block';
        } else {
            showError('No files were saved - operation cancelled by user');
        }
    } catch (error) {
        showError(`Failed to save images: ${error.message}`);
    }
}

function showImageResults(imagePaths, originalPdfPath = null) {
    const resultsSection = document.getElementById('resultsSection');
    const downloadLinks = document.getElementById('downloadLinks');
    
    downloadLinks.innerHTML = '';
    
    // Add save options
    if (originalPdfPath) {
        const saveOptionsDiv = document.createElement('div');
        saveOptionsDiv.innerHTML = `
            <div style="background: #e7f3ff; border: 1px solid #b8daff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h4 style="color: #004085; margin-bottom: 15px;">
                    <i class="fas fa-save"></i> Save Options
                </h4>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="saveIndividualImages()" style="flex: 1; min-width: 200px;">
                        <i class="fas fa-file-image"></i>
                        Save Individual Images
                    </button>
                    <button class="btn btn-success" onclick="saveAsZip()" style="flex: 1; min-width: 200px;">
                        <i class="fas fa-file-archive"></i>
                        Save as ZIP Archive
                    </button>
                    <button class="btn btn-info" onclick="showCompressionOptions()" style="flex: 1; min-width: 200px;">
                        <i class="fas fa-compress-arrows-alt"></i>
                        Optimize & ZIP
                    </button>
                </div>
                <p style="color: #004085; margin-top: 10px; margin-bottom: 0; font-size: 0.9em;">
                    <strong>Individual:</strong> Choose location for each image &nbsp;|&nbsp; 
                    <strong>ZIP:</strong> All images in one compressed file
                </p>
            </div>
        `;
        downloadLinks.appendChild(saveOptionsDiv);
        
        // Store for save functions
        window.currentImagePaths = imagePaths;
        window.currentOriginalPath = originalPdfPath;
    }
    
    // Check if we got SVG files (fallback mode) or actual images
    const isSvgFallback = imagePaths.length > 0 && imagePaths[0].endsWith('.svg');
    
    if (isSvgFallback) {
        const warningDiv = document.createElement('div');
        warningDiv.innerHTML = `
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <h4 style="color: #856404; margin-bottom: 10px;">
                    <i class="fas fa-exclamation-triangle"></i> Preview Mode
                </h4>
                <p style="color: #856404; margin-bottom: 10px;">
                    SVG previews generated instead of actual images. For JPG/PNG images, install poppler-utils.
                </p>
            </div>
        `;
        downloadLinks.appendChild(warningDiv);
    }
    
    // Show conversion results info
    const infoDiv = document.createElement('div');
    infoDiv.innerHTML = `
        <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h4 style="color: #495057; margin-bottom: 10px;">
                <i class="fas fa-info-circle"></i> Conversion Results
            </h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <div><strong>Total Pages:</strong> ${imagePaths.length}</div>
                <div><strong>Format:</strong> ${isSvgFallback ? 'SVG Preview' : imagePaths[0]?.split('.').pop()?.toUpperCase() || 'Unknown'}</div>
                <div><strong>Status:</strong> <span style="color: #28a745;">Ready to Save</span></div>
            </div>
        </div>
    `;
    downloadLinks.appendChild(infoDiv);
    
    // Show individual files preview
    const previewTitle = document.createElement('h4');
    previewTitle.textContent = 'Generated Files Preview:';
    previewTitle.style.marginBottom = '15px';
    previewTitle.style.color = '#495057';
    downloadLinks.appendChild(previewTitle);
    
    imagePaths.forEach((imagePath, index) => {
        const downloadItem = document.createElement('div');
        downloadItem.className = 'download-item';
        
        const fileExtension = imagePath.split('.').pop().toUpperCase();
        const isActualImage = ['PNG', 'JPG', 'JPEG'].includes(fileExtension);
        
        downloadItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon" style="background: ${isActualImage ? '#28a745' : '#ffc107'}">
                    <i class="fas fa-${isActualImage ? 'image' : 'file-code'}"></i>
                </div>
                <div class="file-details">
                    <h4>Page ${index + 1} ${isSvgFallback ? '(Preview)' : ''}</h4>
                    <p>Will be saved as: ${originalPdfPath ? path.basename(originalPdfPath, path.extname(originalPdfPath)) + '_page_' + (index + 1) + '.' + fileExtension.toLowerCase() : 'Unknown'}</p>
                </div>
            </div>
            <button class="btn btn-outline" onclick="previewImage('${imagePath}')">
                <i class="fas fa-eye"></i>
                Preview
            </button>
        `;
        downloadLinks.appendChild(downloadItem);
    });
    
    resultsSection.style.display = 'block';
}

async function saveIndividualImages() {
    if (window.currentImagePaths && window.currentOriginalPath) {
        await saveImageResults(window.currentImagePaths, window.currentOriginalPath);
    }
}

async function saveAsZip() {
    if (!window.currentImagePaths || !window.currentOriginalPath) {
        showError('No images available to save');
        return;
    }
    
    try {
        showProgress('Creating ZIP archive...');
        
        const result = await ipcRenderer.invoke('create-images-zip', window.currentImagePaths, window.currentOriginalPath);
        
        hideProgress();
        
        if (result) {
            const resultsSection = document.getElementById('resultsSection');
            const downloadLinks = document.getElementById('downloadLinks');
            
            // Add success message and ZIP info
            const successDiv = document.createElement('div');
            successDiv.innerHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #155724; margin-bottom: 15px;">
                        <i class="fas fa-check-circle"></i> ZIP Archive Created Successfully!
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px;">
                        <div><strong>File:</strong> ${result.zipPath.split('/').pop()}</div>
                        <div><strong>Images:</strong> ${result.fileCount} files</div>
                        <div><strong>Size:</strong> ${formatFileSize(result.totalBytes)}</div>
                        <div><strong>Compression:</strong> Maximum</div>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="openImageLocation('${result.zipPath}')">
                            <i class="fas fa-folder-open"></i>
                            Open ZIP Location
                        </button>
                        <button class="btn btn-secondary" onclick="showZipContents()">
                            <i class="fas fa-list"></i>
                            View Contents
                        </button>
                    </div>
                    <p style="color: #155724; margin-top: 10px; margin-bottom: 0; font-size: 0.9em;">
                        <strong>Location:</strong> ${result.zipPath}
                    </p>
                </div>
            `;
            
            // Insert at the top of downloadLinks
            downloadLinks.insertBefore(successDiv, downloadLinks.firstChild);
            
            // Store ZIP info for later use
            window.currentZipResult = result;
        } else {
            showError('ZIP creation was cancelled');
        }
    } catch (error) {
        hideProgress();
        showError(`Failed to create ZIP archive: ${error.message}`);
    }
}

async function autoCreateZipFromImages(imagePaths, originalPdfPath, mode = 'pages') {
    try {
        if (!imagePaths || imagePaths.length === 0) {
            showError('No images to compress');
            return;
        }
        
        const modeText = mode === 'extracted' ? 'extracted images' : 'page images';
        showProgress(`Creating ZIP archive with ${imagePaths.length} ${modeText}...`);
        
        // Automatically create ZIP with optimized settings
        const result = await ipcRenderer.invoke('create-auto-zip', imagePaths, originalPdfPath, mode);
        
        hideProgress();
        
        if (result) {
            // Show simple success message with ZIP details
            const resultsSection = document.getElementById('resultsSection');
            const downloadLinks = document.getElementById('downloadLinks');
            
            const modeTitle = mode === 'extracted' ? 'Images Extracted & Compressed!' : 'PDF Pages Converted & Compressed!';
            const modeDescription = mode === 'extracted' ? 
                'All embedded images have been extracted and compressed into a ZIP file.' :
                'All PDF pages have been converted to JPG images and compressed into a ZIP file.';
            
            downloadLinks.innerHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 12px; padding: 25px; text-align: center;">
                    <div style="font-size: 3rem; color: #28a745; margin-bottom: 15px;">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <h3 style="color: #155724; margin-bottom: 15px;">
                        ${modeTitle}
                    </h3>
                    <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0;">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 15px;">
                            <div>
                                <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${result.fileCount}</div>
                                <div style="color: #666; font-size: 0.9em;">${mode === 'extracted' ? 'Images' : 'Pages'}</div>
                            </div>
                            <div>
                                <div style="font-size: 1.5em; font-weight: bold; color: #28a745;">${formatFileSize(result.compressedSize)}</div>
                                <div style="color: #666; font-size: 0.9em;">ZIP Size</div>
                            </div>
                            <div>
                                <div style="font-size: 1.5em; font-weight: bold; color: #fd7e14;">Maximum</div>
                                <div style="color: #666; font-size: 0.9em;">Compression</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin: 20px 0;">
                        <strong style="color: #155724;">📁 Saved as:</strong><br>
                        <code style="background: #f8f9fa; padding: 5px 10px; border-radius: 4px; color: #495057;">
                            ${result.zipPath.split('/').pop()}
                        </code>
                    </div>
                    <button class="btn btn-primary" onclick="openImageLocation('${result.zipPath}')" style="font-size: 1.1em; padding: 12px 24px;">
                        <i class="fas fa-folder-open"></i>
                        Open ZIP File Location
                    </button>
                    <p style="color: #155724; margin-top: 15px; margin-bottom: 0; font-size: 0.9em;">
                        ${modeDescription}
                    </p>
                </div>
            `;
            
            resultsSection.style.display = 'block';
        } else {
            showError('ZIP creation was cancelled');
        }
    } catch (error) {
        hideProgress();
        showError(`Failed to create ZIP archive: ${error.message}`);
    }
}

function showZipContents() {
    if (!window.currentImagePaths || !window.currentOriginalPath) return;
    
    const originalName = window.currentOriginalPath.split('/').pop().replace(/\.[^/.]+$/, '');
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; 
        display: flex; align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; border-radius: 10px; padding: 30px; 
        max-width: 600px; width: 90%; max-height: 70vh; overflow-y: auto;
    `;
    
    content.innerHTML = `
        <h3 style="margin-bottom: 20px; color: #333;">
            <i class="fas fa-file-archive"></i> ZIP Archive Contents
        </h3>
        <div style="margin-bottom: 20px;">
            ${window.currentImagePaths.map((path, index) => {
                const ext = path.split('.').pop();
                return `
                    <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                        <i class="fas fa-${['png', 'jpg', 'jpeg'].includes(ext.toLowerCase()) ? 'image' : 'file-code'}" 
                           style="color: #667eea; margin-right: 10px; width: 20px;"></i>
                        <span>${originalName}_page_${index + 1}.${ext}</span>
                    </div>
                `;
            }).join('')}
        </div>
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="width: 100%;">
            <i class="fas fa-times"></i> Close
        </button>
    `;
    
    modal.className = 'modal';
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function previewImage(imagePath) {
    // Open the image in default system viewer
    openImageLocation(imagePath);
}

function openImageLocation(imagePath) {
    require('electron').shell.showItemInFolder(imagePath);
}

function showProgress(message) {
    document.getElementById('progressSection').style.display = 'block';
    document.getElementById('progressText').textContent = message;
    document.getElementById('loadingOverlay').style.display = 'flex';
    
    // Simulate progress
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        document.getElementById('progressFill').style.width = progress + '%';
        if (progress >= 90) {
            clearInterval(interval);
        }
    }, 200);
}

function hideProgress() {
    document.getElementById('progressSection').style.display = 'none';
    document.getElementById('loadingOverlay').style.display = 'none';
    document.getElementById('progressFill').style.width = '0%';
}

function showSuccess(message) {
    const resultsSection = document.getElementById('resultsSection');
    const downloadLinks = document.getElementById('downloadLinks');
    
    downloadLinks.innerHTML = `
        <div class="success-message">
            <i class="fas fa-check-circle" style="color: #28a745; font-size: 3rem; margin-bottom: 1rem;"></i>
            <p>${message}</p>
        </div>
    `;
    
    resultsSection.style.display = 'block';
}

function showError(message) {
    alert(`Error: ${message}`);
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showCompressionOptions() {
    if (!window.currentImagePaths || !window.currentOriginalPath) {
        showError('No images available to compress');
        return;
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; 
        display: flex; align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; border-radius: 15px; padding: 30px; 
        max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    content.innerHTML = `
        <h3 style="margin-bottom: 25px; color: #333; text-align: center;">
            <i class="fas fa-compress-arrows-alt"></i> Image Optimization Options
        </h3>
        
        <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">
                <i class="fas fa-image"></i> Image Quality
            </label>
            <div style="display: flex; align-items: center; gap: 15px;">
                <input type="range" id="compressQuality" min="30" max="100" value="85" 
                       style="flex: 1; height: 6px; background: #ddd; outline: none; border-radius: 5px;">
                <span id="qualityValue" style="min-width: 50px; font-weight: bold; color: #667eea;">85%</span>
            </div>
            <small style="color: #666; margin-top: 5px; display: block;">
                Higher quality = larger files. Recommended: 70-90% for good balance.
            </small>
        </div>
        
        <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">
                <i class="fas fa-expand-arrows-alt"></i> Image Resolution (DPI)
            </label>
            <select id="compressDPI" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">
                <option value="72">72 DPI (Web)</option>
                <option value="96">96 DPI (Screen)</option>
                <option value="150" selected>150 DPI (Standard)</option>
                <option value="200">200 DPI (High Quality)</option>
                <option value="300">300 DPI (Print Quality)</option>
            </select>
            <small style="color: #666; margin-top: 5px; display: block;">
                Lower DPI = smaller files. 150 DPI is good for most uses.
            </small>
        </div>
        
        <div style="margin-bottom: 25px;">
            <label style="display: block; margin-bottom: 8px; font-weight: bold; color: #555;">
                <i class="fas fa-file-image"></i> Output Format
            </label>
            <select id="compressFormat" style="width: 100%; padding: 10px; border: 2px solid #ddd; border-radius: 8px;">
                <option value="jpg" selected>JPEG (Best compression)</option>
                <option value="png">PNG (Lossless)</option>
                <option value="webp">WebP (Modern format)</option>
            </select>
            <small style="color: #666; margin-top: 5px; display: block;">
                JPEG provides best compression for photos. PNG for images with transparency.
            </small>
        </div>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; text-align: center;">
                <div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #667eea;">${window.currentImagePaths.length}</div>
                    <div style="font-size: 0.9em; color: #666;">Images</div>
                </div>
                <div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #28a745;" id="estimatedSize">~50MB</div>
                    <div style="font-size: 0.9em; color: #666;">Est. Size</div>
                </div>
                <div>
                    <div style="font-size: 1.5em; font-weight: bold; color: #fd7e14;" id="compressionRatio">~70%</div>
                    <div style="font-size: 0.9em, color: #666;">Compression</div>
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 15px; justify-content: space-between;">
            <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="flex: 1;">
                <i class="fas fa-times"></i> Cancel
            </button>
            <button class="btn btn-primary" onclick="processOptimizedZip()" style="flex: 1;">
                <i class="fas fa-compress-arrows-alt"></i> Optimize & Create ZIP
            </button>
        </div>
    `;
    
    modal.className = 'modal';
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners for real-time updates
    const qualitySlider = content.querySelector('#compressQuality');
    const qualityValue = content.querySelector('#qualityValue');
    const estimatedSize = content.querySelector('#estimatedSize');
    const compressionRatio = content.querySelector('#compressionRatio');
    
    function updateEstimates() {
        const quality = parseInt(qualitySlider.value);
        qualityValue.textContent = quality + '%';
        
        // Rough estimates based on quality
        const baseSize = window.currentImagePaths.length * 2; // 2MB per image average
        const qualityMultiplier = quality / 100;
        const estimated = Math.round(baseSize * qualityMultiplier);
        estimatedSize.textContent = `~${estimated}MB`;
        
        const compression = Math.round(100 - (quality * 0.8));
        compressionRatio.textContent = `~${compression}%`;
    }
    
    qualitySlider.addEventListener('input', updateEstimates);
    content.querySelector('#compressDPI').addEventListener('change', updateEstimates);
    content.querySelector('#compressFormat').addEventListener('change', updateEstimates);
    
    updateEstimates();
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

async function processOptimizedZip() {
    const modal = document.querySelector('.modal');
    const quality = parseInt(modal.querySelector('#compressQuality').value);
    const dpi = parseInt(modal.querySelector('#compressDPI').value);
    const format = modal.querySelector('#compressFormat').value;
    
    modal.remove();
    
    if (!window.currentImagePaths || !window.currentOriginalPath) {
        showError('No images available to compress');
        return;
    }
    
    try {
        showProgress('Optimizing images and creating ZIP archive...');
        
        const options = {
            quality: quality,
            dpi: dpi,
            format: format,
            optimize: true
        };
        
        const result = await ipcRenderer.invoke('create-optimized-images-zip', 
            window.currentImagePaths, window.currentOriginalPath, options);
        
        hideProgress();
        
        if (result) {
            // Calculate compression percentage
            const compressionPercent = result.originalSize > 0 ? 
                Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100) : 0;
            
            const successDiv = document.createElement('div');
            successDiv.innerHTML = `
                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                    <h4 style="color: #155724; margin-bottom: 15px;">
                        <i class="fas fa-check-circle"></i> Optimized ZIP Archive Created!
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                            <div style="font-size: 1.1em; font-weight: bold; color: #155724;">${result.fileCount}</div>
                            <div style="font-size: 0.9em; color: #666;">Images</div>
                        </div>
                        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                            <div style="font-size: 1.1em; font-weight: bold; color: #667eea;">${formatFileSize(result.compressedSize)}</div>
                            <div style="font-size: 0.9em; color: #666;">Final Size</div>
                        </div>
                        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                            <div style="font-size: 1.1em; font-weight: bold; color: #28a745;">${compressionPercent}%</div>
                            <div style="font-size: 0.9em; color: #666;">Saved</div>
                        </div>
                        <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                            <div style="font-size: 1.1em; font-weight: bold; color: #fd7e14;">${result.options.quality}%</div>
                            <div style="font-size: 0.9em; color: #666;">Quality</div>
                        </div>
                    </div>
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 15px;">
                        <small style="color: #155724;">
                            <strong>Optimization:</strong> ${formatFileSize(result.originalSize)} → ${formatFileSize(result.compressedSize)} 
                            (saved ${formatFileSize(result.originalSize - result.compressedSize)})
                        </small>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-primary" onclick="openImageLocation('${result.zipPath}')">
                            <i class="fas fa-folder-open"></i>
                            Open ZIP Location
                        </button>
                        <button class="btn btn-secondary" onclick="showOptimizedZipContents()">
                            <i class="fas fa-list"></i>
                            View Contents
                        </button>
                    </div>
                    <p style="color: #155724; margin-top: 10px; margin-bottom: 0; font-size: 0.9em;">
                        <strong>Location:</strong> ${result.zipPath}
                    </p>
                </div>
            `;
            
            const resultsSection = document.getElementById('resultsSection');
            const downloadLinks = document.getElementById('downloadLinks');
            
            // Insert at the top of downloadLinks
            downloadLinks.insertBefore(successDiv, downloadLinks.firstChild);
            
            // Store optimized ZIP info for later use
            window.currentOptimizedZipResult = result;
        } else {
            showError('ZIP creation was cancelled');
        }
    } catch (error) {
        hideProgress();
        showError(`Failed to create optimized ZIP archive: ${error.message}`);
    }
}

function showOptimizedZipContents() {
    if (!window.currentOptimizedZipResult) return;
    
    const result = window.currentOptimizedZipResult;
    const originalName = window.currentOriginalPath.split('/').pop().replace(/\.[^/.]+$/, '');
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
        background: rgba(0,0,0,0.5); z-index: 1000; 
        display: flex; align-items: center; justify-content: center;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
        background: white; border-radius: 10px; padding: 30px; 
        max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto;
    `;
    
    content.innerHTML = `
        <h3 style="margin-bottom: 20px; color: #333;">
            <i class="fas fa-file-archive"></i> Optimized ZIP Archive Contents
        </h3>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; text-align: center;">
                <div>
                    <div style="font-weight: bold; color: #667eea;">Quality</div>
                    <div>${result.options.quality}%</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: #667eea;">Format</div>
                    <div>${result.options.format.toUpperCase()}</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: #667eea;">DPI</div>
                    <div>${result.options.dpi}</div>
                </div>
                <div>
                    <div style="font-weight: bold; color: #28a745;">Compression</div>
                    <div>${Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100)}%</div>
                </div>
            </div>
        </div>
        
        <div style="margin-bottom: 20px;">
            ${window.currentImagePaths.map((path, index) => {
                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; align-items: center;">
                            <i class="fas fa-image" style="color: #667eea; margin-right: 10px; width: 20px;"></i>
                            <span>${originalName}_page_${index + 1}.${result.options.format}</span>
                        </div>
                        <span style="color: #666; font-size: 0.9em;">Optimized</span>
                    </div>
                `;
            }).join('')}
        </div>
        
        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()" style="width: 100%;">
            <i class="fas fa-times"></i> Close
        </button>
    `;
    
    modal.className = 'modal';
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}


async function saveExtractedResults(result, originalPdfPath) {
    try {
        const { pageImages, extractedImages, totalImages } = result;
        
        if (totalImages === 0) {
            showError('No images found in the PDF (no pages converted and no embedded images extracted)');
            return;
        }
        
        showSuccess(`Processing complete! Found ${pageImages.length} page(s) and ${extractedImages.length} embedded image(s)`);
        
        // Show combined results
        const resultsSection = document.getElementById('resultsSection');
        const downloadLinks = document.getElementById('downloadLinks');
        
        downloadLinks.innerHTML = '';
        
        // Add save options for combined results
        const saveOptionsDiv = document.createElement('div');
        saveOptionsDiv.innerHTML = `
            <div style="background: #e7f3ff; border: 1px solid #b8daff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <h4 style="color: #004085; margin-bottom: 15px;">
                    <i class="fas fa-images"></i> Processing Results
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 15px;">
                    <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #667eea;">${pageImages.length}</div>
                        <div style="font-size: 0.9em; color: #666;">Page Images</div>
                    </div>
                    <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #28a745;">${extractedImages.length}</div>
                        <div style="font-size: 0.9em; color: #666;">Extracted Images</div>
                    </div>
                    <div style="text-align: center; background: white; padding: 10px; border-radius: 6px;">
                        <div style="font-size: 1.2em; font-weight: bold; color: #fd7e14;">${totalImages}</div>
                        <div style="font-size: 0.9em; color: #666;">Total Images</div>
                    </div>
                </div>
                <div style="display: flex; gap: 15px; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="saveAllExtractedImages()" style="flex: 1; min-width: 200px;">
                        <i class="fas fa-file-image"></i>
                        Save All Images
                    </button>
                    <button class="btn btn-success" onclick="saveExtractedAsZip()" style="flex: 1; min-width: 200px;">
                        <i class="fas fa-file-archive"></i>
                        Save as ZIP Archive
                    </button>
                    <button class="btn btn-info" onclick="showExtractedCompressionOptions()" style="flex: 1; min-width: 200px;">
                        <i class="fas fa-compress-arrows-alt"></i>
                        Optimize & ZIP
                    </button>
                </div>
                <p style="color: #004085; margin-top: 10px; margin-bottom: 0; font-size: 0.9em;">
                    <strong>Page Images:</strong> Converted from PDF pages &nbsp;|&nbsp; 
                    <strong>Extracted:</strong> Images embedded in the PDF
                </p>
            </div>
        `;
        downloadLinks.appendChild(saveOptionsDiv);
        
        // Store for save functions
        window.currentExtractedResult = result;
        window.currentOriginalPath = originalPdfPath;
        
        // Show individual image previews
        const previewDiv = document.createElement('div');
        previewDiv.innerHTML = '<h4 style="margin-bottom: 15px; color: #495057;">All Images Preview:</h4>';
        
        // Show page images
        if (pageImages.length > 0) {
            const pageSection = document.createElement('div');
            pageSection.innerHTML = `
                <h5 style="color: #667eea; margin: 15px 0 10px 0;">
                    <i class="fas fa-file-pdf"></i> Page Images (${pageImages.length})
                </h5>
            `;
            
            pageImages.forEach((imagePath, index) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'download-item';
                imageItem.innerHTML = `
                    <div class="file-info">
                        <div class="file-icon" style="background: #667eea">
                            <i class="fas fa-file-image"></i>
                        </div>
                        <div class="file-details">
                            <h4>Page ${index + 1}</h4>
                            <p>Converted from PDF page</p>
                        </div>
                    </div>
                    <button class="btn btn-outline" onclick="previewImage('${imagePath}')">
                        <i class="fas fa-eye"></i>
                        Preview
                    </button>
                `;
                pageSection.appendChild(imageItem);
            });
            previewDiv.appendChild(pageSection);
        }
        
        // Show extracted images
        if (extractedImages.length > 0) {
            const extractedSection = document.createElement('div');
            extractedSection.innerHTML = `
                <h5 style="color: #28a745; margin: 15px 0 10px 0;">
                    <i class="fas fa-images"></i> Extracted Images (${extractedImages.length})
                </h5>
            `;
            
            extractedImages.forEach((imagePath, index) => {
                const imageItem = document.createElement('div');
                imageItem.className = 'download-item';
                imageItem.innerHTML = `
                    <div class="file-info">
                        <div class="file-icon" style="background: #28a745">
                            <i class="fas fa-image"></i>
                        </div>
                        <div class="file-details">
                            <h4>Embedded Image ${index + 1}</h4>
                            <p>Extracted from PDF content</p>
                        </div>
                    </div>
                    <button class="btn btn-outline" onclick="previewImage('${imagePath}')">
                        <i class="fas fa-eye"></i>
                        Preview
                    </button>
                `;
                extractedSection.appendChild(imageItem);
            });
            previewDiv.appendChild(extractedSection);
        }
        
        downloadLinks.appendChild(previewDiv);
        resultsSection.style.display = 'block';
        
    } catch (error) {
        showError(`Failed to process results: ${error.message}`);
    }
}

async function saveAllExtractedImages() {
    if (!window.currentExtractedResult || !window.currentOriginalPath) {
        showError('No images available to save');
        return;
    }
    
    const { pageImages, extractedImages } = window.currentExtractedResult;
    const allImages = [...pageImages, ...extractedImages];
    
    await saveImageResults(allImages, window.currentOriginalPath);
}

async function saveExtractedAsZip() {
    if (!window.currentExtractedResult || !window.currentOriginalPath) {
        showError('No images available to save');
        return;
    }
    
    const { pageImages, extractedImages } = window.currentExtractedResult;
    const allImages = [...pageImages, ...extractedImages];
    
    await saveAsZip();
}

async function showExtractedCompressionOptions() {
    if (!window.currentExtractedResult || !window.currentOriginalPath) {
        showError('No images available to compress');
        return;
    }
    
    // Use the existing compression options but with combined images
    const { pageImages, extractedImages } = window.currentExtractedResult;
    window.currentImagePaths = [...pageImages, ...extractedImages];
    
    showCompressionOptions();
}

async function showPdfToJpgPreview() {
    if (currentTool !== 'pdf-to-jpg' || selectedFiles.length === 0) {
        return;
    }
    
    const file = selectedFiles[0];
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        return;
    }
    
    try {
        const pageCount = await ipcRenderer.invoke('get-pdf-page-count', file.path);
        const processingMode = getProcessingMode();
        
        if (pageCount > 0) {
            // Show preview section
            let previewContainer = document.getElementById('pdfPreview');
            if (!previewContainer) {
                previewContainer = document.createElement('div');
                previewContainer.id = 'pdfPreview';
                previewContainer.style.marginTop = '20px';
                
                const fileList = document.getElementById('fileList');
                fileList.appendChild(previewContainer);
            }
            
            const modeText = processingMode === 'extract' ? 
                'embedded images will be extracted' : 
                `pages will be converted to JPG files`;
            
            const actionText = processingMode === 'extract' ? 
                'Images to extract' : 
                'JPG files to create';
            
            previewContainer.innerHTML = `
                <div style="background: #e7f3ff; border: 1px solid #b8daff; border-radius: 8px; padding: 20px; margin-top: 15px;">
                    <h4 style="color: #004085; margin-bottom: 15px;">
                        <i class="fas fa-info-circle"></i> Processing Preview
                    </h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                        <div style="text-align: center; background: white; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 2em; font-weight: bold; color: #667eea;">${pageCount}</div>
                            <div style="color: #666; font-size: 0.9em;">PDF Pages</div>
                        </div>
                        <div style="text-align: center; background: white; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 2em; font-weight: bold; color: #28a745;">${pageCount}</div>
                            <div style="color: #666; font-size: 0.9em;">${actionText}</div>
                        </div>
                        <div style="text-align: center; background: white; padding: 15px; border-radius: 8px;">
                            <div style="font-size: 1.2em; font-weight: bold; color: #fd7e14;">
                                ${pageCount > 5 ? 'ZIP File' : 'Individual Files'}
                            </div>
                            <div style="color: #666; font-size: 0.9em;">Output Format</div>
                        </div>
                    </div>
                    <div style="margin-top: 15px; padding: 12px; background: white; border-radius: 6px;">
                        <p style="margin: 0; color: #004085;">
                            <strong>📋 What will happen:</strong> 
                            ${pageCount === 1 ? 
                                `This PDF has 1 page. It will be converted to 1 JPG file.` : 
                                `This PDF has ${pageCount} pages. All ${pageCount} ${modeText}.`
                            }
                            ${pageCount > 5 ? 
                                ' Since there are more than 5 files, they will be automatically compressed into a ZIP archive.' : 
                                ' You can save each file individually.'
                            }
                        </p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.log('Could not show preview:', error);
    }
}

// Processing mode change listeners
document.addEventListener('change', async (e) => {
    if (e.target.name === 'processingMode') {
        await showPdfToJpgPreview();
    }
});

function generateImagesToPDFFilename(files) {
    if (!files || files.length === 0) {
        return 'images-to-pdf.pdf';
    }
    
    if (files.length === 1) {
        // Single file: use the image name with .pdf extension
        const baseName = files[0].name.replace(/\.[^/.]+$/, ''); // Remove extension
        return `${baseName}.pdf`;
    } else if (files.length <= 3) {
        // Few files: combine their names
        const baseNames = files.map(file => 
            file.name.replace(/\.[^/.]+$/, '').substring(0, 10) // Limit length
        );
        return `${baseNames.join('_')}.pdf`;
    } else {
        // Many files: use first file name + count
        const firstName = files[0].name.replace(/\.[^/.]+$/, '');
        return `${firstName}_and_${files.length - 1}_more.pdf`;
    }
}

function generateMergedFilename(files) {
    if (!files || files.length === 0) {
        return 'merged-document.pdf';
    }
    
    if (files.length === 2) {
        // Two files: combine their names
        const name1 = files[0].name.replace(/\.[^/.]+$/, '').substring(0, 15);
        const name2 = files[1].name.replace(/\.[^/.]+$/, '').substring(0, 15);
        return `${name1}_${name2}_merged.pdf`;
    } else if (files.length <= 5) {
        // Few files: use first file name + count
        const firstName = files[0].name.replace(/\.[^/.]+$/, '').substring(0, 20);
        return `${firstName}_merged_${files.length}_files.pdf`;
    } else {
        // Many files: use descriptive name
        const firstName = files[0].name.replace(/\.[^/.]+$/, '').substring(0, 15);
        return `${firstName}_merged_${files.length}_pdfs.pdf`;
    }
}

function generateProcessedFilename(file, operation) {
    if (!file || !file.name) {
        return `${operation}-document.pdf`;
    }
    
    const baseName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    return `${baseName}_${operation}.pdf`;
}

function generateSplitFilename(originalFile) {
    if (!originalFile || !originalFile.name) {
        return 'split-document';
    }
    
    const baseName = originalFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
    return `${baseName}_split`;
}
