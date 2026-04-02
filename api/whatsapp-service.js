const twilio = require('twilio');
require('dotenv').config();

const sendWhatsAppMessage = async (to, body) => {
    // Lazy initialization to prevent Vercel crash on missing Twilio config
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.error("Twilio credentials missing. Local test mode?");
        return;
    }

    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    try {
        const fromNumber = process.env.TWILIO_PHONE_NUMBER.startsWith('whatsapp:') 
            ? process.env.TWILIO_PHONE_NUMBER 
            : `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`;

        await client.messages.create({
            from: fromNumber,
            to: `whatsapp:${to}`,
            body: body
        });
        console.log(`Message sent to ${to}`);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error.message);
        throw new Error(`Twilio Error: ${error.message}`);
    }
};

module.exports = {
    sendWhatsAppMessage
};
