require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { createClient } = require('@libsql/client');

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint for Render monitoring
app.get('/health', (req, res) => res.status(200).json({ status: 'OK' }));

// Connect to Turso Edge Database
const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

/**
 * 1. RESERVATION INQUIRY ENDPOINT
 */
app.post('/api/inquire', async (req, res) => {
    const { name, email, suite, check_in, message } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    try {
        // Insert reservation into Turso Edge DB
        const dbResult = await db.execute({
            sql: 'INSERT INTO inquiries (name, email, suite, check_in, message) VALUES (?, ?, ?, ?, ?)',
            args: [name, email, suite || 'General Inquiry', check_in || null, message || '']
        });

        console.log(`[DB SUCCESS] Inquiry saved to Turso DB. Row ID: ${dbResult.lastInsertRowid}`);

        // Dispatch live WhatsApp alert
        try {
            await notifyManagerWhatsApp({ name, email, suite, check_in, message });
        } catch (whatsappErr) {
            console.error('[WHATSAPP ERROR]: Notification Failed!');
            if (whatsappErr.response) {
                console.error('Meta API Error Details:', JSON.stringify(whatsappErr.response.data, null, 2));
            } else {
                console.error('Network/Internal Error:', whatsappErr.message);
            }
        }

        res.status(200).json({ success: true, message: 'Inquiry saved successfully!' });
    } catch (err) {
        console.error('[DB FATAL ERROR]: Database Insertion Error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to record reservation.' });
    }
});

/**
 * 2. SEND A MESSAGE / CONTACT FORM ENDPOINT
 */
app.post('/api/message', async (req, res) => {
    const { full_name, email, inquiry_type, message } = req.body;

    if (!full_name || !email || !message) {
        return res.status(400).json({ 
            success: false, 
            error: 'Full name, email address, and message are required.' 
        });
    }

    try {
        // Insert message into contact_messages table
        const dbResult = await db.execute({
            sql: 'INSERT INTO contact_messages (full_name, email, inquiry_type, message) VALUES (?, ?, ?, ?)',
            args: [
                full_name, 
                email, 
                inquiry_type || 'General Reservation', 
                message
            ]
        });

        console.log(`[DB SUCCESS] Contact message saved to Turso DB. Row ID: ${dbResult.lastInsertRowid}`);

        // Dispatch WhatsApp alert to manager
        try {
            await notifyManagerWhatsApp({
                name: full_name,
                email: email,
                suite: inquiry_type || 'General Reservation',
                check_in: 'Contact Form Message',
                message: message
            });
        } catch (whatsappErr) {
            console.error('[WHATSAPP ERROR]: Notification Failed for contact message!');
            if (whatsappErr.response) {
                console.error('Meta API Error Details:', JSON.stringify(whatsappErr.response.data, null, 2));
            } else {
                console.error('Network/Internal Error:', whatsappErr.message);
            }
        }

        res.status(200).json({ success: true, message: 'Your message has been sent successfully!' });
    } catch (err) {
        console.error('[DB FATAL ERROR]: Failed to insert contact message:', err.message);
        res.status(500).json({ success: false, error: 'Failed to send message.' });
    }
});

/**
 * 3. NEWSLETTER SUBSCRIPTION ENDPOINT
 */
app.post('/api/newsletter', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email address is required.' });
    }

    try {
        await db.execute({
            sql: 'INSERT INTO newsletter_subscribers (email) VALUES (?)',
            args: [email]
        });

        console.log(`[DB SUCCESS] Newsletter subscriber added: ${email}`);
        res.status(200).json({ success: true, message: 'Subscribed to newsletter successfully!' });
    } catch (err) {
        if (err.message && err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ success: false, error: 'Email is already subscribed.' });
        }
        console.error('[DB ERROR] Newsletter Subscription Failed:', err.message);
        res.status(500).json({ success: false, error: 'Failed to subscribe to newsletter.' });
    }
});

/**
 * WHATSAPP NOTIFICATION HELPER
 */
async function notifyManagerWhatsApp(booking) {
    const phoneId = process.env.META_PHONE_NUMBER_ID || '1378679841991917';
    const token = process.env.META_WHATSAPP_TOKEN;
    
    const recipient = process.env.MANAGER_WHATSAPP_NUMBER || '254713637987';

    if (!token) {
        console.warn('[WHATSAPP SKIP]: META_WHATSAPP_TOKEN is missing in environment.');
        return;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    const param1_Name = String(booking.name || 'Guest Manager');
    const param2_OrderRef = `RES-2026 [${String(booking.email || 'N/A')}]`;
    const param3_DeliveryInfo = `${booking.suite || 'General Suite'} | Check-In: ${booking.check_in || 'TBD'} | Note: ${booking.message || 'None'}`;

    const body = {
        messaging_product: "whatsapp",
        to: recipient,
        type: "template",
        template: {
            name: "jaspers_market_order_confirmation_v1",
            language: { code: "en_US" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: param1_Name },         // Maps to {{1}}
                        { type: "text", text: param2_OrderRef },     // Maps to {{2}}
                        { type: "text", text: param3_DeliveryInfo }  // Maps to {{3}}
                    ]
                }
            ]
        }
    };

    console.log(`[WHATSAPP ATTEMPT]: Sending alert to target ${recipient}...`);

    const response = await axios.post(url, body, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    console.log(`[WHATSAPP SUCCESS]: Alert dispatched to ${recipient}. Payload Message ID:`, response.data?.messages?.[0]?.id || 'N/A');
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Resort API running on port ${PORT}`));
