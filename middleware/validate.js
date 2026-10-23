const validateContactForm = (req, res, next) => {
    const { name, email, subject, message } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All required fields must be filled' });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    if (typeof subject !== 'string' || subject.trim().length === 0) {
        return res.status(400).json({ error: 'Valid subject is required' });
    }

    next();
};

const validateNewsletter = (req, res, next) => {
    const { email } = req.body;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }

    next();
};

const validateBlog = (req, res, next) => {
  if (!req.body) {
    return res.status(400).json({ error: 'Request body is missing' });
  }

  const { title, content, author, status, categories } = req.body;

  if (!title || !content || !author || !status) {
    return res.status(400).json({ error: 'Title, content, author, and status are required' });
  }

  if (!['draft', 'published', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  // Adjust categories validation to handle string input (since form-data sends categories as a string)
  if (categories && typeof categories !== 'string') {
    return res.status(400).json({ error: 'Categories must be a comma-separated string' });
  }

  next();
};

module.exports = { validateContactForm, validateNewsletter, validateBlog };