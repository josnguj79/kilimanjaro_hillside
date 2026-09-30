require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@libsql/client');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Turso Edge Database
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper: Trigger Meta WhatsApp Template Message
async function notifyManagerWhatsApp(booking) {
    const endpoint = `https://graph.facebook.com/v19.0/${process.env.META_PHONE_NUMBER_ID}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to: process.env.MANAGER_WHATSAPP_NUMBER,
        type: "template",
        template: {
            name: "new_booking_alert",
            language: { code: "en_US" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: booking.name },
                        { type: "text", text: booking.check_in || "N/A" },
                        { type: "text", text: booking.suite || "General Inquiry" },
                        { type: "text", text: booking.email }
                    ]
                }
            ]
        }
    };

    return axios.post(endpoint, payload, {
        headers: {
            'Authorization': `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
}

// Endpoint: New Form Inquiries
app.post('/api/inquire', async (req, res) => {
    const { name, email, suite, check_in, message } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    try {
        // 1. Insert into Turso SQLite DB
        const result = await db.execute({
            sql: "INSERT INTO inquiries (name, email, suite, check_in, message) VALUES (?, ?, ?, ?, ?)",
            args: [name, email, suite || 'General Inquiry', check_in || null, message || '']
        });

        // 2. Dispatch WhatsApp Notification to Manager
        try {
            await notifyManagerWhatsApp({ name, email, suite, check_in });
        } catch (waErr) {
            console.error('WhatsApp API Alert Failed:', waErr.response?.data || waErr.message);
        }

        res.status(200).json({
            success: true,
            message: 'Inquiry saved successfully & manager notified!',
            inquiryId: result.lastInsertRowid ? Number(result.lastInsertRowid) : null
        });
    } catch (error) {
        console.error('Database Operation Failed:', error.message);
        res.status(500).json({ success: false, error: 'Database transaction error.' });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Resort API running on port ${PORT}`));