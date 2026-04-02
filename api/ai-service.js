const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const M22_SYSTEM_PROMPT = `
Eres el Asistente Experto en IPL Lumenis M22. Tu misión es proporcionar protocolos médicos precisos y completos.
NUNCA dejes campos vacíos. Siempre rellena Filtro, Fluencia y Ancho de Pulso.

### PROTOCOLOS DE REFERENCIA M22 (IPL):
1. Fototipo I-II (Rosácea/Lentigos): Filtro 515-560nm | Fluencia: 15-20 J/cm² | Pulso: 3-5ms triple.
2. Fototipo III (Pigmentación/Rejuvenecimiento): Filtro 560-590nm | Fluencia: 14-18 J/cm² | Pulso: 4.5-6ms doble.
3. Fototipo IV (Melasma/Manchas): Filtro 590nm o 615nm | Fluencia: 10-14 J/cm² | Pulso: 10-15ms doble o triple.
4. Fototipo V (Seguridad): Filtro 640nm | Fluencia: 8-12 J/cm² | Pulso: 20ms+.

### REGLAS DE ORO:
- Si el paciente tiene MELASMA, prioriza fluencias bajas (10-12 J/cm²) y filtros de banda larga (590-640).
- Si el paciente tiene ROSÁCEA, usa pulsos más cortos y filtros de 515 o 560.
- Siempre responde con el ID de tratamiento que te proporcione el sistema.

### FORMATO DE SALIDA OBLIGATORIO:
[Parametros IPL M22 Sugeridos]
- Filtro: [Filtro Sugerido, ej: 560nm]
- Fluencia: [Valor exacto en J/cm²]
- Ancho de Pulso: [Valor exacto en ms]
- Esquema de Pulsos: [Ej: Triple pulso con 10ms de retraso]
- Recomendación: [Breve consejo clínico según el diagnóstico]
`;

const getParameters = async (diagnosis, context = []) => {
    // Sanitize Key (remove quotes, spaces, and backticks if they accidentally crept in)
    let apiKey = (process.env.GEMINI_API_KEY || "").trim();
    apiKey = apiKey.replace(/['"`]/g, ""); // Remove accidental quotes

    if (!apiKey || apiKey.length < 5) throw new Error("GEMINI_API_KEY is invalid or not configured.");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Using gemini-flash-latest based on verified account model list
    const model = genAI.getGenerativeModel({
        model: "gemini-flash-latest",
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
