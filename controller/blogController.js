const db = require('../config/db');
const slugify = require('slugify');
const { uploadToSpaces } = require('../middleware/upload');
const redis = require('../config/redis');

const createBlog = async (req, res) => {
  try {
    const { 
      title, 
      excerpt, 
      content, 
      author, 
      author_bio, 
      status, 
      read_time, 
      categories, 
      tags, 
      meta_description, 
      is_featured 
    } = req.body;
    
    let featuredImageUrl = null;
    
    // Handle featured image upload
    if (req.file) {
      featuredImageUrl = await uploadToSpaces(req.file);
    }

    const slug = slugify(title, { lower: true, strict: true });

    const result = await db.insert('tbl_blogs', {
      title,
      slug,
      excerpt,
      content, // Use content directly without processing
      category: JSON.stringify(categories ? categories.split(',').map(c => c.trim()) : []),
      image: featuredImageUrl,
      author,
      author_bio,
      status,
      read_time: parseInt(read_time) || 0,
      tags: JSON.stringify(tags ? tags.split(',').map(t => t.trim()) : []),
      is_featured: is_featured ? 1 : 0,
      likes: 0,
      shares: 0,
      comments: 0,
      created_at: new Date(),
      published_at: status === 'published' ? new Date() : null,
      meta_description
    });

    res.status(201).json({ message: 'Blog created successfully', id: result.insertId });
    
    // Invalidate list cache
    try {
      await redis.del('blog:all');
    } catch (err) {
      console.error('Redis cache invalidation error:', err);
    }
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blogId = parseInt(id);
    if (isNaN(blogId)) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const {
      title,
      excerpt,
      content,
      author,
      author_bio,
      status,
      read_time,
      categories,
      tags,
      meta_description,
      is_featured,
    } = req.body;

    let featuredImageUrl = req.body.image;

    // Handle featured image upload
    if (req.file) {
      featuredImageUrl = await uploadToSpaces(req.file);
    }

    const slug = title ? slugify(title, { lower: true, strict: true }) : undefined;

    const updateData = {
      title,
      slug,
      excerpt,
      content,
      category: categories ? JSON.stringify(categories.split(',').map(c => c.trim())) : undefined,
      image: featuredImageUrl,
      author,
      author_bio,
      status,
      read_time: read_time ? parseInt(read_time) : undefined,
      tags: tags ? JSON.stringify(tags.split(',').map(t => t.trim())) : undefined,
      is_featured: is_featured !== undefined ? (is_featured ? 1 : 0) : undefined,
      meta_description,
      published_at: status === 'published' ? new Date() : null,
      updated_at: new Date(),
    };

    // Remove undefined values
    Object.keys(updateData).forEach((key) => updateData[key] === undefined && delete updateData[key]);

    // Use string-based where clause if db.update expects it
    const result = await db.update('tbl_blogs', updateData, 'id = ?', [blogId], true);
    // OR keep the object-based where if db.update supports it
    // const result = await db.update('tbl_blogs', updateData, { id: blogId }, [], true);

    if (result.affected_rows === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ message: 'Blog updated successfully' });
    
    // Invalidate caches
    try {
      await redis.del(`blog:data:${blogId}`);
      await redis.del('blog:all');
    } catch (err) {
      console.error('Redis cache invalidation error:', err);
    }
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    // Delete associated comments first
    await db.delete('tbl_comments', 'blog_id = ?', [id]);

    // Delete the blog
    const result = await db.delete('tbl_blogs', 'id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ message: 'Blog and associated comments deleted successfully' });
    
    // Invalidate caches
    try {
      await redis.del(`blog:data:${id}`);
      await redis.del('blog:all');
    } catch (err) {
      console.error('Redis cache invalidation error:', err);
    }
  } catch (error) {
    console.error('Error deleting blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getAllBlogs = async (req, res) => {
  try {
    // Try to get from cache
    try {
      const cachedBlogs = await redis.get('blog:all');
      if (cachedBlogs) {
        return res.json(cachedBlogs);
      }
    } catch (err) {
      console.error('Redis get all error:', err);
    }

    const blogs = await db.selectAll('tbl_blogs');
    const formattedBlogs = blogs.map((blog) => ({
      ...blog,
      category: JSON.parse(blog.category || '[]'),
      tags: JSON.parse(blog.tags || '[]'),
    }));
   
    res.json(formattedBlogs);

    // Store in cache for 30 minutes
    try {
      await redis.set('blog:all', formattedBlogs, { ex: 1800 });
    } catch (err) {
      console.error('Redis set all error:', err);
    }
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getBlogById = async (req, res) => {
  try {
    const { id } = req.params;
    

    const parsedId = parseInt(id, 10); // Ensure ID is an integer
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    // Try to get from cache (excluding view count)
    const cacheKey = `blog:data:${parsedId}`;
    try {
      const cachedBlog = await redis.get(cacheKey);
      if (cachedBlog) {
        // Increment view count in background
        redis.incr(`blog:views:${parsedId}`).catch(e => console.error(e));
        return res.json({ ...cachedBlog, views: await redis.get(`blog:views:${parsedId}`) || 0 });
      }
    } catch (err) {
      console.error('Redis cache get error:', err);
    }

    const blog = await db.select('tbl_blogs', '*', 'id = ?', [parsedId]);

    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    // Ensure blogData is a single object
    const blogData = blog; // db.select returns a single RowDataPacket or undefined

    // Redis View Counting
    let viewCount = 0;
    try {
      const redisKey = `blog:views:${parsedId}`;
      viewCount = await redis.incr(redisKey);
    } catch (redisError) {
      console.error('Redis view count error:', redisError);
      // Fallback: Continue without view count if Redis fails
    }

    let category = [];
    let tags = [];

    try {
      category = blogData.category ? JSON.parse(blogData.category) : [];
      tags = blogData.tags ? JSON.parse(blogData.tags) : [];
    } catch (parseError) {
      console.error('Error parsing category or tags:', parseError);
    }

    // Fetch comments and ensure it's an array
    const commentsResult = await db.select('tbl_comments', '*', 'blog_id = ?', [parsedId]);
   
    const comments = Array.isArray(commentsResult) ? commentsResult : commentsResult ? [commentsResult] : [];

    const finalResponse = {
      ...blogData,
      category,
      tags,
      views: viewCount,
      comments: comments.map(comment => ({
        ...comment,
        created_at: new Date(comment.created_at),
        updated_at: comment.updated_at ? new Date(comment.updated_at) : null
      }))
    };

    res.json(finalResponse);

    // Cache the response for 1 hour
    try {
      await redis.set(cacheKey, finalResponse, { ex: 3600 });
    } catch (err) {
      console.error('Redis cache set error:', err);
    }
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const incrementLikes = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'UPDATE tbl_blogs SET likes = likes + 1 WHERE id = ?';
    const result = await db.query(sql, [parseInt(id)], true);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ message: 'Likes incremented successfully' });
  } catch (error) {
    console.error('Error incrementing likes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const incrementShares = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = 'UPDATE tbl_blogs SET shares = shares + 1 WHERE id = ?';
    const result = await db.query(sql, [parseInt(id)], true);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    res.json({ message: 'Shares incremented successfully' });
  } catch (error) {
    console.error('Error incrementing shares:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const createComment = async (req, res) => {
  try {
    const { id } = req.params; // blog_id
    const { user_id, user_name, user_email, content } = req.body;

    // Validate input
    if (!content) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Validate email format if provided
    if (user_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if blog exists
    const blog = await db.select('tbl_blogs', 'id', 'id = ?', [id]);
    if (!blog || blog.length === 0) {
      return res.status(404).json({ error: 'Blog not found' });
    }

    const commentData = {
      blog_id: parseInt(id),
      content,
      created_at: new Date(),
      user_name: user_name || 'Anonymous', // Default to Anonymous if no name
      user_email: user_email || null, // Store email if provided, else null
    };

    // Add user_id if provided (for authenticated users)
    if (user_id) {
      commentData.user_id = parseInt(user_id);
    }

    const result = await db.insert('tbl_comments', commentData);

    // Update comments count in tbl_blogs
    const sql = 'UPDATE tbl_blogs SET comments = comments + 1 WHERE id = ?';
    await db.query(sql, [parseInt(id)], true);

    res.status(201).json({ 
      message: 'Comment created successfully', 
      commentId: result.insert_id,
      comment: { ...commentData, id: result.insert_id, created_at: new Date() }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const deleteComment = async (req, res) => {
  try {
    const { id, commentId } = req.params;

    // Delete the comment
    const result = await db.delete('tbl_comments', 'id = ? AND blog_id = ?', [commentId, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Update comments count in tbl_blogs
    const sql = 'UPDATE tbl_blogs SET comments = comments - 1 WHERE id = ?';
    await db.query(sql, [parseInt(id)], true);

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCommentsByBlogId = async (req, res) => {
  try {
    const { id } = req.params;
    const parsedId = parseInt(id, 10); // Ensure ID is an integer
    if (isNaN(parsedId)) {
      return res.status(400).json({ error: 'Invalid blog ID' });
    }

    const comments = await db.select('tbl_comments', '*', 'blog_id = ?', [parsedId]);
    console.log('Query result (comments):', comments); // Debug log

    // Ensure comments is an array
    const commentsArray = Array.isArray(comments) ? comments : comments ? [comments] : [];

    res.json(
      commentsArray.map(comment => ({
        ...comment,
        created_at: new Date(comment.created_at),
        updated_at: comment.updated_at ? new Date(comment.updated_at) : null
      }))
    );
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { 
  createBlog, 
  updateBlog, 
  deleteBlog, 
  getAllBlogs, 
  getBlogById,
  incrementLikes,
  incrementShares,
  createComment,
  deleteComment,
  getCommentsByBlogId
};