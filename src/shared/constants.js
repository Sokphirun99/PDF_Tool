// Application constants shared between main and renderer processes

const APP_CONFIG = {
  name: 'PDF Tools',
  version: '1.0.0',
  author: 'phirun'
};

const SUPPORTED_FORMATS = {
  PDF: ['pdf'],
  IMAGES: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'],
  DOCUMENTS: ['doc', 'docx'],
  SPREADSHEETS: ['xls', 'xlsx'],
  PRESENTATIONS: ['ppt', 'pptx']
};

const QUALITY_PRESETS = {
  LOW: { quality: 30, dpi: 72 },
  MEDIUM: { quality: 60, dpi: 150 },
  HIGH: { quality: 85, dpi: 200 },
  ULTRA: { quality: 100, dpi: 300 }
};

const PROCESSING_MODES = {
  PAGES_ONLY: 'pages',
  IMAGES_ONLY: 'images',
  BOTH: 'both'
};

const DEFAULT_SETTINGS = {
  watermarkOpacity: 0.5,
  rotationAngle: 90,
  compressionLevel: 'medium',
  outputFormat: 'pdf',
  imageQuality: QUALITY_PRESETS.HIGH,
  processingMode: PROCESSING_MODES.PAGES_ONLY
};

const ERRORS = {
  FILE_NOT_FOUND: 'File not found',
  INVALID_FORMAT: 'Invalid file format',
  PROCESSING_FAILED: 'Processing failed',
  SAVE_FAILED: 'Failed to save file',
  PERMISSION_DENIED: 'Permission denied',
  UNKNOWN_ERROR: 'An unknown error occurred'
};

const SUCCESS_MESSAGES = {
  FILE_PROCESSED: 'File processed successfully',
  FILES_MERGED: 'Files merged successfully',
  PDF_SPLIT: 'PDF split successfully',
  PDF_COMPRESSED: 'PDF compressed successfully',
  WATERMARK_ADDED: 'Watermark added successfully',
  PDF_ROTATED: 'PDF rotated successfully'
};

module.exports = {
  APP_CONFIG,
  SUPPORTED_FORMATS,
  QUALITY_PRESETS,
  PROCESSING_MODES,
  DEFAULT_SETTINGS,
  ERRORS,
  SUCCESS_MESSAGES
};
