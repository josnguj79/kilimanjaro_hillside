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
        await db.execute({
            sql: 'INSERT INTO inquiries (name, email, suite, check_in, message) VALUES (?, ?, ?, ?, ?)',
            args: [name, email, suite, check_in || null, message || '']
        });

        // 2. Dispatch live WhatsApp alert
        try {
            await notifyManagerWhatsApp({ name, email, suite, check_in, message });
        } catch (whatsappErr) {
            console.error('WhatsApp Notification Failed (DB record saved successfully):', 
                whatsappErr.response?.data || whatsappErr.message
            );
        }

        res.status(200).json({ success: true, message: 'Inquiry saved successfully!' });
    } catch (err) {
        console.error('Database Insertion Error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to record reservation.' });
    }
});

/**
 * Sanitizes phone numbers to standard Meta E.164 format for Kenya (254XXXXXXXXX)
 * Strips all non-digit characters (+, spaces, dashes) and converts local prefixes.
 */
function formatWhatsAppNumber(phone) {
    if (!phone) return '254713637987'; // Default fallback
    
    // 1. Remove everything that is NOT a number (removes '+', spaces, dashes)
    let cleaned = String(phone).replace(/\D/g, '');

    // 2. If it starts with local Kenya zero (07... or 01...), convert to 254...
    if (cleaned.startsWith('0') && cleaned.length === 10) {
        cleaned = '254' + cleaned.substring(1);
    }

    return cleaned; // Guarantees pure digits like "254713637987"
}

async function notifyManagerWhatsApp(booking) {
    const phoneId = process.env.META_PHONE_NUMBER_ID || '1378679841991917';
    const token = process.env.META_WHATSAPP_TOKEN;
    
    // Use Render env var with automatic fallback to whitelisted manager number
    const rawRecipient = process.env.MANAGER_WHATSAPP_NUMBER || '254713637987';
    const recipient = formatWhatsAppNumber(rawRecipient);

    if (!token) {
        console.warn('Skipping WhatsApp notification: META_WHATSAPP_TOKEN is missing in environment.');
        return;
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    // Concatenate suite and check-in date into a single text block
    const suiteAndCheckIn = `${booking.suite || 'General Inquiry'} (Check-in: ${booking.check_in || 'N/A'})`;

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
                        { type: "text", text: String(booking.name || 'Guest') },
                        { type: "text", text: `RES-2026 [${String(booking.email || 'N/A')}]` },
                        { type: "text", text: String(suiteAndCheckIn) }
                    ]
                }
            ]
        }
    };

    const response = await axios.post(url, body, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    console.log(`WhatsApp Alert Dispatched Successfully to ${recipient}:`, response.data);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Resort API running on port ${PORT}`));
