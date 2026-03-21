const express = require('express');
const cors = require('cors');
const contactRoutes = require('./routes/contactRoutes');
const newsletterRoutes = require('./routes/newsletterRoutes');
const blogRoutes = require('./routes/blogRoutes');
const adminRoutes = require('./routes/adminRoutes');
const jobRoutes = require('./routes/jobRoutes'); 
const marketingRoutes = require('./routes/marketingRoutes');
const compression = require('compression');
const helmet = require('helmet');

const app = express();

// Use compression and helmet for better performance and security
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid blocking external scripts for now
}));

// Allowed origins list
const allowedOrigins = [
  'https://sownmark.com',
  'https://www.sownmark.com',
  'http://sownmark.com',
  'http://localhost:5173',
  'http://localhost:3002', // Add if testing locally
];

// CORS setup with better error handling
app.use(cors({
  origin: function (origin, callback) {
   
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
     
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
   
    
    const corsError = new Error(`CORS policy: Origin ${origin} is not allowed`);
    corsError.statusCode = 403;
    callback(corsError);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Alternative simpler CORS setup (uncomment if you want to test with all origins)
// app.use(cors({
//   origin: '*',
//   credentials: false,
// }));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount routes
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/marketing', marketingRoutes);

// CORS error handling middleware (place before general error handler)
app.use((err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({ 
      error: "CORS policy: This origin is not allowed",
      origin: req.headers.origin,
      allowedOrigins: allowedOrigins
    });
  }
  next(err);
});

// General error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.statusCode || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));