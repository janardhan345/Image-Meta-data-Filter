import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ExifParser from 'exif-parser';
import Image from '../models/Image.js';
import requireAuth from '../middleware/requireAuth.js';

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    // Create uploads folder if it does not exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Make filename unique using timestamp
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG and TIFF images are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to extract EXIF metadata
function extractMetadata(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const parser = ExifParser.create(buffer);
    const result = parser.parse();
    const tags = result.tags;

    return {
      date: tags.DateTimeOriginal
        ? new Date(tags.DateTimeOriginal * 1000)
        : null,
      latitude: tags.GPSLatitude || null,
      longitude: tags.GPSLongitude || null,
      camera: tags.Make && tags.Model
        ? `${tags.Make} ${tags.Model}`
        : null,
      ISO: tags.ISO || null,
      focalLength: tags.FocalLength
        ? `${tags.FocalLength}mm`
        : null,
      exposureTime: tags.ExposureTime
        ? `1/${Math.round(1 / tags.ExposureTime)}`
        : null,
      width: result.imageSize?.width || null,
      height: result.imageSize?.height || null
    };
  } catch (err) {
    // If no EXIF data exists return empty metadata
    return {};
  }
}

// POST /api/v1/images — upload image
router.post('/', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No image file provided'
      });
    }

    // Extract EXIF metadata from uploaded file
    const metadata = extractMetadata(req.file.path);

    // Save to database
    const image = await Image.create({
      filename: req.file.filename,
      originalName: req.file.originalname,
      userId: req.user.userId,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      metadata
    });

    res.status(201).json({
      success: true,
      data: image
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/v1/images — get all images with filtering
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const {
      location,
      year,
      camera,
      sort = 'newest',
      page = 1,
      limit = 20
    } = req.query;

    // Base query — only this user's images
    const query = { userId: req.user.userId };

    // Apply filters
    if (location) {
      query['metadata.location'] = new RegExp(location, 'i');
    }

    if (year) {
      query['metadata.date'] = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      };
    }

    if (camera) {
      query['metadata.camera'] = new RegExp(camera, 'i');
    }

    // Sort options
    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      date: { 'metadata.date': -1 },
      name: { originalName: 1 }
    };

    const images = await Image.find(query)
      .sort(sortOptions[sort] || { createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Image.countDocuments(query);

    res.json({
      success: true,
      data: images,
      pagination: {
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/v1/images/:id — get single image
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    // Make sure user owns this image
    if (image.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this image'
      });
    }

    res.json({ success: true, data: image });

  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/images/:id — update image metadata
router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    if (image.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this image'
      });
    }

    const updated = await Image.findByIdAndUpdate(
      req.params.id,
      { metadata: { ...image.metadata, ...req.body.metadata } },
      { new: true }
    );

    res.json({ success: true, data: updated });

  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/images/:id — delete image
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        success: false,
        error: 'Image not found'
      });
    }

    if (image.userId.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this image'
      });
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '..', 'uploads', image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await Image.findByIdAndDelete(req.params.id);

    res.status(204).end();

  } catch (err) {
    next(err);
  }
});

export default router;