const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upload, uploadToCloudinary } = require('../middleware/upload');
const {
  getAllNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getNotesBySeller,
  purchaseNote,
  getPurchasedNotes,
  reviewNote,
  getNoteReviews,
} = require('../controllers/noteController');

// Public routes
router.get('/', getAllNotes);

// Protected routes (MUST be before /:id to prevent 'purchased' being parsed as an ObjectId)
router.get('/purchased', protect, getPurchasedNotes);

// Public routes
router.get('/seller/:sellerId', getNotesBySeller);
router.get('/:id', getNoteById);

// Protected routes
router.post(
  '/',
  protect,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  uploadToCloudinary,
  createNote
);

router.put(
  '/:id',
  protect,
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  uploadToCloudinary,
  updateNote
);

router.delete('/:id', protect, deleteNote);

// PURCHASE ENDPOINT: For free notes only (price = 0)
// Paid notes MUST use Razorpay payment flow via /api/payments/create-order & verify
router.post('/:id/purchase', protect, purchaseNote);

router.post('/:id/review', protect, reviewNote);
router.get('/:id/reviews', getNoteReviews);

module.exports = router;
