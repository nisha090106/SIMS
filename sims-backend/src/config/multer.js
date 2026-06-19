import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define the temporary upload directory for imports
const uploadDir = path.join(process.cwd(), 'src', 'uploads', 'imports');

// Ensure directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage engine configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    // Remove special characters and spaces from the filename
    const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${cleanBaseName}-${Date.now()}${ext}`);
  },
});

// File filter for import files (.csv, .xlsx, .xls)
const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only CSV and Excel files (.csv, .xlsx, .xls) are allowed.'), false);
  }
};

// Multer upload middleware instance definition
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export default upload;
