const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const M22_SYSTEM_PROMPT = `
Eres el Asistente Experto en IPL Lumenis M22. Tu misión es proporcionar siempre el protocolo COMPLETO.
Prohibido dejar campos vacíos o con guiones.

### EJEMPLO DE RESPUESTA CORRECTA:
Diagnóstico: "Manchas solares, fototipo III"
Respuesta:
[Parametros IPL M22 Sugeridos]
- Filtro: 560nm
- Fluencia: 16 J/cm²
- Ancho de Pulso: 5.0ms
- Esquema de Pulsos: Doble pulso (3.0ms / 4.0ms)
- Recomendación: Realizar 3 sesiones cada 4 semanas.

### MANUAL DE PROTOCOLOS M22:
- I-II: Filtro 515-560 | 16-22 J/cm² | 3-4ms.
- III: Filtro 560 | 14-18 J/cm² | 4-6ms.
- IV: Filtro 590-615 | 11-15 J/cm² | 10-15ms.
- V: Filtro 640 | 10-12 J/cm² | 20ms+.

### REGLA PARA MELASMA (Piel IV):
Si detectas MELASMA en Fototipo IV, usa SIEMPRE:
- Filtro: 590nm o 615nm
- Fluencia: 10-12 J/cm²
- Ancho de Pulso: 12ms a 15ms
- Esquema: Triple pulso con 10ms de retraso.

### FORMATO OBLIGATORIO:
[Parametros IPL M22 Sugeridos]
- Filtro: [Valor]
- Fluencia: [Valor]
- Ancho de Pulso: [Valor]
- Esquema de Pulsos: [Valor]
- Recomendación: [Consejo]
`;

const getParameters = async (diagnosis, context = []) => {
    // Sanitize Key (remove quotes, spaces, and backticks if they accidentally crept in)
    let apiKey = (process.env.GEMINI_API_KEY || "").trim();
    apiKey = apiKey.replace(/['"`]/g, ""); // Remove accidental quotes

    if (!apiKey || apiKey.length < 5) throw new Error("GEMINI_API_KEY is invalid or not configured.");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Using Gemini 2.0 Flash for superior instruction following
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: {
            maxOutputTokens: 500,
            temperature: 0.1,
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
        throw new Error(`Error de IA: ${error.message}`);
    }
};

module.exports = {
    getParameters
};
