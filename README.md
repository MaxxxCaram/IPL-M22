# M22 IPL AI Assistant - Live 🚀
---
Asistente clínico inteligente impulsado por IA para el sistema de láser **Lumenis M22**. Este proyecto integra la potencia de **Google Gemini 1.5 Flash** con la accesibilidad de **WhatsApp** para proporcionar sugerencias de parámetros instantáneas y precisas.

## 📋 Características
- **Cálculo de Parámetros**: Sugerencias basadas en protocolos clínicos de M22 (Filtro, Fluencia, Ancho de pulso, etc.).
- **Integración WhatsApp**: Interfaz conversacional vía Twilio para uso en clínica.
- **Feedback Loop**: Aprendizaje continuo basado en los resultados reales de los tratamientos.
- **Dashboard Premium**: Monitoreo en tiempo real de éxitos y estadísticas del sistema.
- **Cumplimiento Legal**: Términos de servicio integrados para seguridad médica.

## 🛠️ Tecnologías
- **Backend**: Node.js + Express (Serverless en Vercel).
- **AI**: Google Gemini API.
- **Mensajería**: Twilio API (WhatsApp).
- **Frontend**: React + Glassmorphism CSS.

## 🚀 Despliegue en Vercel
1. Conecta este repositorio a Vercel.
2. Configura las variables de entorno (`GEMINI_API_KEY`, `TWILIO_ACCOUNT_SID`, etc.).
3. ¡Listo! El webhook se activa automáticamente en `/api/webhook/whatsapp`.

---
*Desarrollado para la optimización de tratamientos IPL y seguridad del paciente.*
