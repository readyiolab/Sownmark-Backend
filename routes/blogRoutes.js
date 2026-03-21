const express = require('express');
const router = express.Router();
const { authenticateToken, isAdmin } = require('../middleware/auth');
const { validateBlog } = require('../middleware/validate');
const { upload } = require('../middleware/upload');
const { 
  createBlog, 
  updateBlog, 
  deleteBlog, 
  getAllBlogs, 
  getBlogById,
  incrementLikes,
  incrementShares,
  createComment,
  deleteComment,
  getCommentsByBlogId,
  getBlogBySlug
} = require('../controller/blogController');

// Public routes
router.get('/', getAllBlogs);
router.get('/:id', getBlogById);
router.get('/slug/:slug', getBlogBySlug);
router.get('/:id/comments', getCommentsByBlogId);
router.post('/:id/likes', incrementLikes);
router.post('/:id/shares', incrementShares);


router.post('/:id/comments', createComment);

// Admin-only routes
router.post('/', 
  authenticateToken, 
  isAdmin, 
  upload.single('featured_image'), // Changed to single image upload
  validateBlog, 
  createBlog
);
router.put('/:id', 
  authenticateToken, 
  isAdmin, 
  upload.single('featured_image'), // Changed to single image upload
  validateBlog, 
  updateBlog
);
router.delete('/:id', authenticateToken, isAdmin, deleteBlog);
router.delete('/:id/comments/:commentId', authenticateToken, isAdmin, deleteComment);

module.exports = router;