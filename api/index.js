const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

// Sanitize Environment Variables (Crucial to avoid "must start with AC" and 404 errors)
if (process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY.trim();
if (process.env.TWILIO_ACCOUNT_SID) process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID.trim();
if (process.env.TWILIO_AUTH_TOKEN) process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN.trim();
if (process.env.TWILIO_PHONE_NUMBER) process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER.trim();

// Critical Check: Verify essential environment variables
const checkEnv = () => {
    const missing = [];
    if (!process.env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
    if (!process.env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
    if (!process.env.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
    if (!process.env.TWILIO_PHONE_NUMBER) missing.push('TWILIO_PHONE_NUMBER');
    return missing;
};

const { getParameters } = require('./ai-service');
const { sendWhatsAppMessage } = require('./whatsapp-service');
const { saveTreatment, updateOutcome, getRecentSuccessfulTreatments } = require('./database');

const app = express();
app.use(cors());

// Vercel pre-parses the body. If it's already an object, use it directly.
app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) {
        return next();
    }
    next();
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Log helper for debugging
app.use((req, res, next) => {
    console.log(`[Request Log] ${req.method} ${req.url}`);
    next();
});

// Diagnostic GET for testing in browser (explicit paths)
app.get(['/', '/api/health', '/api/whatsapp', '/webhook/whatsapp'], (req, res) => {
    res.send("<h1>M22 Webhook Ready! ✅</h1><p>Versión: <b>Gemini-1.5-Flash-Update</b></p><p>Vercel está enviando bien los datos a Express.</p>");
});

// Webhook handler logic - SYNC FOR VERCEL COMPATIBILITY
const whatsappHandler = async (req, res) => {
    console.log("--- WEBHOOK HIT (POST) ---");
    console.log("Body Received:", JSON.stringify(req.body));
    
    const { From, Body } = req.body;
    const body = Body ? Body.toLowerCase() : "";
    
    if (!From || !body) {
        console.warn("Empty From or Body in request");
        return res.status(200).send('OK');
    }

    try {
        if (body.includes('resultado') || body.includes('feedback')) {
            const match = body.match(/resultado (\d+): (\w+) (.*)/);
            if (match) {
                const treatmentId = match[1];
                const outcome = match[2];
                const feedback = match[3];
                await updateOutcome(treatmentId, outcome, feedback);
                await sendWhatsAppMessage(From.replace('whatsapp:', ''), '✅ Gracias. He guardado el resultado para mejorar mis próximas recomendaciones.');
            } else {
                await sendWhatsAppMessage(From.replace('whatsapp:', ''), 'Por favor envía el resultado en formato: "Resultado [ID]: [exito/fallo] [comentarios]"');
            }
        } else {
            console.log(`Analyzing: ${body}`);
            const context = await getRecentSuccessfulTreatments();
            
            // We AWAIT here to ensure Gemini finishes BEFORE Vercel suspends the function
            const response = await getParameters(body, context);
            
            console.log("Saving treatment diagnosis...");
            const treatmentId = await saveTreatment({
                whatsapp_number: From,
                diagnosis: body,
                recommended_parameters: response
            });

            console.log(`Sending response to ${From}...`);
            const finalMessage = `${response}\n\n🆔 ID de tratamiento: ${treatmentId}\nPara mejorar, envía: "Resultado ${treatmentId}: exito/fallo [comentarios]"`;
            await sendWhatsAppMessage(From.replace('whatsapp:', ''), finalMessage);
        }
    } catch (error) {
        console.error('Error in webhook handler:', error.message);
        try {
            await sendWhatsAppMessage(From.replace('whatsapp:', ''), `Ups, hubo un error técnico: ${error.message}. Por favor intenta de nuevo en un momento.`);
        } catch (msgErr) {
            console.error("Critical error sending fail message", msgErr);
        }
    }

    // Vercel requires the response to be sent ONLY after all work is done
    res.status(200).send('OK');
};

// Register routes to handle Vercel rewrite issues
app.post('/', whatsappHandler);
app.post('/api/whatsapp', whatsappHandler);
app.post('/webhook/whatsapp', whatsappHandler);
app.post('/api/webhook/whatsapp', whatsappHandler);
app.post('*', whatsappHandler); // Catch-all for Vercel rewrites

app.get('/api/treatments', async (req, res) => {
    try {
        const treatments = await getRecentSuccessfulTreatments();
        res.json(treatments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start local server if not on Vercel
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running local on port ${PORT}`);
    });
}

module.exports = app;
