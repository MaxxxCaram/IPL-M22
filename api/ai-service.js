const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

const M22_SYSTEM_PROMPT = `
Eres el Asistente Experto en IPL Lumenis M22 y clones de alta gama. Tu misión es proporcionar protocolos médicos precisos.

### SET DE FILTROS M22 (IPL):
1. **Acne:** Filtro dual (400-600 & 800-1200nm). Uso: Acné inflamatorio activo.
2. **Vascular:** Filtro específico (515-590nm). Uso: Telangiectasias, Rosácea, puntos rubí.
3. **515nm:** Uso: Lentigos solares, lesiones pigmentadas epidérmicas (I-III).
4. **560nm:** Uso: Fotorejuvenecimiento general, lesiones vasculares superficiales.
5. **590nm:** Uso: Lesiones vasculares profundas, fototipos III-IV.
6. **615nm:** Uso: Pieles oscuras, lesiones vasculares en piernas, Melasma.
7. **640nm:** Uso: Depilación láser (LHR), fototipos oscuros (IV-V).
8. **695nm:** Uso: Depilación láser profunda, fototipo V.

### REGLAS DE ORO PARA CLONES CHINOS:
- Los clones chinos suelen ser menos potentes pero más inestables térmicamente.
- **Seguridad:** En fototipos IV+, usa siempre fluencias bajas (10-14 J/cm²) y filtros largos (590+).
- **Melasma:** Nunca uses filtros cortos (515/560) en melasma; usa 590nm o 615nm con pulsos triples y tiempos de retraso largos (20-40ms).
- **Acné:** Usa el filtro de Acné solo en pacientes con lesiones inflamatorias. Fluencia baja (8-12 J/cm²).

### FORMATO DE SALIDA OBLIGATORIO:
[Parametros IPL M22 Sugeridos]
- Filtro Sugerido: [Nombre o longitud de onda]
- Fluencia: [Valor en J/cm²]
- Configuración de Pulso: [Simple/Doble/Triple]
- Ancho de Pulso: [Valor en ms]
- Tiempo de Retraso: [Valor en ms entre pulsos]
- Recomendación Clínica: [Breve y técnica]
`;

const getParameters = async (diagnosis, globalContext = [], patientHistory = []) => {
    // Sanitize Key (remove quotes, spaces, and backticks if they accidentally crept in)
    let apiKey = (process.env.GEMINI_API_KEY || "").trim();
    apiKey = apiKey.replace(/['"`]/g, ""); // Remove accidental quotes

    if (!apiKey || apiKey.length < 5) throw new Error("GEMINI_API_KEY is invalid or not configured.");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Using Gemini 2.5 Flash (Modern stable version)
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.4, // Increased temperature for better flow
        },
        // Relax safety settings to prevent blocking of medical/laser content
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
    });

    try {
        const globalRef = (globalContext && globalContext.length > 0)
            ? "\n### ÉXITOS RECIENTES (REFERENCIA):\n" + globalContext.map(c => `- ${c.diagnosis} -> ${c.recommended_parameters}`).join("\n")
            : "";
        
        const patientRef = (patientHistory && patientHistory.length > 0)
            ? "\n### HISTORIAL DEL PACIENTE (CRÍTICO):\n" + patientHistory.map(h => `- ${h.created_at.split('T')[0]}: ${h.diagnosis} -> ${h.recommended_parameters} (${h.outcome || 'pendiente'})`).join("\n")
            : "";

        const prompt = `${M22_SYSTEM_PROMPT}${globalRef}${patientRef}\n\n### CONSULTA ACTUAL:\nAnaliza este caso y dame el protocolo M22 completo: ${diagnosis}`;

        const result = await model.generateContent(prompt);
        let text = result.response.text();
        
        // Fallback for empty responses
        if (!text || text.length < 5) {
            text = "IA: No pude generar el protocolo exacto. Por favor verifique el diagnóstico.";
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
