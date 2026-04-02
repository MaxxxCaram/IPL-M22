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

### LISTA DE FILTROS REALES M22 (IPL):
- Filtros disponibles: 515nm, 560nm, 590nm, 615nm, 640nm, 695nm, 755nm.
- NUNCA uses otros números (ej: 5, 59). Usa el número COMPLETO de arriba seguido de "nm".

### PARÁMETROS OBLIGATORIOS (TODOS SON MANDATORIOS):
1. Filtro: [Filtro de la lista arriba]
2. Fluencia: [Valor exacto en J/cm²]
3. Ancho de Pulso: [Valor exacto en ms]
4. Esquema de Pulsos: [Doble/Triple pulso con retraso]
5. Recomendación: [Consejo clínico]

### EJEMPLO DE RESPUESTA CORRECTA:
Diagnóstico: "Melasma, Fototipo IV"
Respuesta:
[Parametros IPL M22 Sugeridos]
- Filtro: 590nm
- Fluencia: 11 J/cm²
- Ancho de Pulso: 12ms
- Esquema de Pulsos: Triple pulso (4ms / 3ms / 3ms) con 10ms de retraso.
- Recomendación: Sesión suave, control de calor inmediato.
`;

const getParameters = async (diagnosis, context = []) => {
    // Sanitize Key (remove quotes, spaces, and backticks if they accidentally crept in)
    let apiKey = (process.env.GEMINI_API_KEY || "").trim();
    apiKey = apiKey.replace(/['"`]/g, ""); // Remove accidental quotes

    if (!apiKey || apiKey.length < 5) throw new Error("GEMINI_API_KEY is invalid or not configured.");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Using Gemini 2.5 PRO for maximum intelligence and strict formatting
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-pro",
        generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.1,
        }
    });

    try {
        // Disabling historical context for now to avoid bad-imitation habits
        const prompt = `${M22_SYSTEM_PROMPT}\n\nDiagnóstico: ${diagnosis}`;

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
