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

app.post('/api/inquire', async (req, res) => {
    const { name, email, suite, check_in, message } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Name and email are required.' });
    }

    try {
        // 1. Insert reservation into Turso Edge DB
        const dbResult = await db.execute({
            sql: 'INSERT INTO inquiries (name, email, suite, check_in, message) VALUES (?, ?, ?, ?, ?)',
            args: [name, email, suite || 'General Inquiry', check_in || null, message || '']
        });

        console.log(`[DB SUCCESS] Inquiry saved to Turso DB. Row ID: ${dbResult.lastInsertRowid}`);

        // 2. Dispatch live WhatsApp alert
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

async function notifyManagerWhatsApp(booking) {
    const phoneId = process.env.META_PHONE_NUMBER_ID || '1378679841991917';
    const token = process.env.META_WHATSAPP_TOKEN;
    
    // Direct usage of Render environment variable / exact fallback number without stripping or altering
    const recipient = process.env.MANAGER_WHATSAPP_NUMBER || '254713637987';

    if (!token) {
        console.warn('[WHATSAPP SKIP]: META_WHATSAPP_TOKEN is missing in environment.');
        return;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    // Map resort data into the template's 3 required variables:
    // {{1}} -> Guest Name
    // {{2}} -> Reservation Reference & Guest Email
    // {{3}} -> Suite, Check-In Date, and Message details
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
