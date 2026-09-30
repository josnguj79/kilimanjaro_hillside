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

app.post('/api/inquire', async (req, res) => {
    const { name, email, suite, check_in, message } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    try {
        // 1. Insert reservation into Turso Edge DB
        await db.execute({
            sql: 'INSERT INTO inquiries (name, email, suite, check_in, message) VALUES (?, ?, ?, ?, ?)',
            args: [name, email, suite, check_in, message]
        });

        // 2. Dispatch live WhatsApp alert to the resort manager
        await notifyManagerWhatsApp({ name, email, suite, check_in, message });

        res.status(200).json({ success: true, message: 'Inquiry saved & manager notified!' });
    } catch (err) {
        console.error('Database/WhatsApp Error:', err.message);
        res.status(500).json({ success: false, error: 'Internal server error.' });
    }
});

async function notifyManagerWhatsApp(booking) {
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const token = process.env.META_WHATSAPP_TOKEN;
    const recipient = process.env.ADMIN_WHATSAPP_NUMBER;

    if (!phoneId || !token || !recipient) {
        console.log('Skipping WhatsApp notification: Meta credentials missing in environment.');
        return;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    const body = {
        messaging_product: "whatsapp",
        to: recipient,
        type: "template",
        template: {
            name: "new_booking_alert",
            language: { code: "en_US" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: booking.name },
                        { type: "text", text: booking.suite },
                        { type: "text", text: booking.check_in || "N/A" },
                        { type: "text", text: booking.email }
                    ]
                }
            ]
        }
    };

    await axios.post(url, body, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Resort API running on port ${PORT}`));
