const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Sanitize Environment Variables (Crucial to avoid "must start with AC" and 404 errors)
if (process.env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY.trim();
if (process.env.TWILIO_ACCOUNT_SID) process.env.TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID.trim();
if (process.env.TWILIO_AUTH_TOKEN) process.env.TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN.trim();
if (process.env.TWILIO_PHONE_NUMBER) process.env.TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER.trim();

// Verify essential environment variables
const checkEnv = () => {
    const missing = [];
    if (!process.env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
    if (!process.env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
    if (!process.env.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
    if (!process.env.TWILIO_PHONE_NUMBER) missing.push('TWILIO_PHONE_NUMBER');
    return missing;
};

console.log("[Boot] Server initialization starting...");
const missingEnv = checkEnv();
if (missingEnv.length > 0) {
    console.error("[Boot] Critical: Missing Env Vars:", missingEnv.join(", "));
}

const { getParameters, listModels } = require('./ai-service');
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
app.get('/api/models', async (req, res) => {
    try {
        const models = await listModels();
        res.json(models);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Simple health check as default route
app.get('*', (req, res) => {
    res.send(`
        <html>
            <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding: 50px; background: #f4f7f6; color: #333;">
                <div style="background: white; max-width: 500px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                    <h1 style="color: #2c3e50; margin-bottom: 5px;">M22 Assistant ✅</h1>
                    <p style="color: #27ae60; font-weight: bold; margin-bottom: 25px;">Engine: ONLINE | Model: Gemini-1.5-Flash</p>
                    
                    <div style="background: #fdfdfd; padding: 15px; border: 1px solid #eee; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin: 5px 0;"><strong>Twilio:</strong> ${process.env.TWILIO_PHONE_NUMBER ? "🟢 Connected" : "🔴 Missing"}</p>
                        <p style="margin: 5px 0;"><strong>Gemini IA:</strong> ${process.env.GEMINI_API_KEY ? "🟢 Connected" : "🔴 Missing"}</p>
                    </div>
                    
                    <p style="color: #7f8c8d; font-size: 11px;">Deployment ID: ${new Date().toLocaleTimeString()} (UTC)</p>
                </div>
            </body>
        </html>
    `);
});

module.exports = app;
