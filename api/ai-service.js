const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const M22_SYSTEM_PROMPT = `
You are the IPL M22 AI Assistant, a specialist in medical laser protocols for the Lumenis M22 system.
Provide precise treatment parameters based on the patient's diagnosis and skin type.

### M22 PROTOCOLS:
Fitzpatrick I-II: 515-560nm | 14-20 J/cm² | 3-5ms.
Fitzpatrick III: 560-590nm | 12-16 J/cm² | 6-10ms.
Fitzpatrick IV: 590-615nm | 10-14 J/cm² | 12-16ms.
Fitzpatrick V-VI: 640-695nm | 8-12 J/cm² | 20ms+.

### OUTPUT FORMAT:
[Parametros IPL M22 Sugeridos]
- Filtro: 
- Fluencia: 
- Ancho de Pulso: 
- Pulsos/Retraso: 
- Recomendación: 
`;

const getParameters = async (diagnosis, context = []) => {
    // Sanitize Key
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Using gemini-1.5-flash with a timeout safety
    // We'll reduce the prompt length to ensure faster response
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
            maxOutputTokens: 250, // Keep it short for speed
            temperature: 0.1,    // More deterministic
        }
    });

    try {
        const historicalContext = context.length > 0 
            ? "Contexto reciente:\n" + context.slice(-2).map(c => `${c.diagnosis} -> ${c.outcome}`).join("\n") 
            : "";
        
        const prompt = `${M22_SYSTEM_PROMPT}\n\n${historicalContext}\nDiagnóstico: ${diagnosis}`;
        
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Error with Gemini API:", error.message);
        // Fallback message if AI fails to respond in time
        throw new Error(`Error de IA (posible saturación): ${error.message}`);
    }
};

module.exports = {
    getParameters
};
