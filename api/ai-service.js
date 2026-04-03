const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const M22_SYSTEM_PROMPT = `
Eres el Asistente Experto en IPL Lumenis M22 y clones. Tu mision es dar protocolos medicos completos.

### FILTROS M22:
1. Acne: Filtro dual de 400 a 600 nm y de 800 a 1200 nm. Uso para Acne activo.
2. Vascular: Filtro de 515 a 590 nm. Uso para Rosacea y Telangiectasias.
3. 515nm: Uso para manchas solares y lesiones pigmentadas claras.
4. 560nm: Uso para rejuvenecimiento y manchas comunes.
5. 590nm: Uso para manchas profundas y pieles fototipo III-IV.
6. 615nm: Uso para melasma y pieles oscuras.
7. 640nm: Uso para depilacion en pieles oscuras.
8. 695nm: Uso para depilacion profunda.

### REGLAS PARA CLONES:
- Prioriza seguridad. Fototipos IV requieren fluencia baja (10-12 J/cm2).
- Melasma: Usa filtro 590nm o 615nm con tres pulsos y descansos largos.

### FORMATO DE RESPUESTA:
PARAMETROS M22 SUGERIDOS:
Filtro: [Especificar filtro]
Fluencia: [Valor en J/cm2]
Configuracion: [Pulsos y retrasos]
Ancho de Pulso: [Valor en ms]
Recomendacion: [Consejo tecnico]
`;

const getParameters = async (diagnosis, globalContext = [], patientHistory = []) => {
    // Sanitize Key
    let apiKey = (process.env.GEMINI_API_KEY || "").trim();
    apiKey = apiKey.replace(/['"`]/g, "");

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.1, 
        },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
    });

    try {
        const prompt = `${M22_SYSTEM_PROMPT}\n\nDiagnostico: ${diagnosis}\nProtocolo Completo:`;
        
        console.log(`[AI] Calling 2.5 Pro: ${diagnosis}`);
        const result = await model.generateContent(prompt);
        
        const candidate = result.response.candidates ? result.response.candidates[0] : null;
        let text = "";

        // Check for safety block or empty content
        if (!candidate || candidate.finishReason === 'SAFETY' || !candidate.content || candidate.content.parts.length === 0) {
            console.warn(`[AI] Pro blocked by ${candidate ? candidate.finishReason : 'EMPTY'}. Trying Flash...`);
            const fallbackModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const fallbackResult = await fallbackModel.generateContent(prompt);
            text = fallbackResult.response.text();
        } else {
            text = result.response.text();
        }

        if (!text || text.length < 10) {
            text = `IA: No pude generar el protocolo (Motivo: ${candidate ? candidate.finishReason : 'SAFETY'}). Por favor verifique el fototipo.`;
        }
        return text;
    } catch (error) {
        console.error("Error with Gemini API:", error.message);
        throw new Error(`Error de IA: ${error.message}`);
    }
};

module.exports = {
    getParameters
};
