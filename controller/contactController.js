const db = require('../config/db');

const submitContactForm = async (req, res) => {
    try {
        const { name, email, phone, subject, message } = req.body;

        // Validate required fields
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'All required fields must be filled' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Validate subject
        if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
            return res.status(400).json({ error: 'Valid subject is required' });
        }

        // Insert form data into database
        const result = await db.insert('tbl_contact_messages', {
            name: name.trim(),
            email: email.trim(),
            phone: phone ? phone.trim() : '',
            subject: subject.trim().slice(0, 255),
            message: message.trim(),
            created_at: new Date()
        });

        res.status(201).json({
            message: 'Form submitted successfully',
            id: result.insertId
        });
    } catch (error) {
        console.error('Error processing form:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { submitContactForm };