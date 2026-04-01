// Pure JS in-memory database to avoid sqlite3 binary issues on Vercel
// This ensures the server NEVER crashes due to database dependencies.
let treatments = [];
let knowledge = [];

const saveTreatment = (data) => {
    return new Promise((resolve) => {
        const { whatsapp_number, diagnosis, recommended_parameters } = data;
        const newId = treatments.length + 1;
        const treatment = {
            id: newId,
            whatsapp_number,
            diagnosis,
            recommended_parameters,
            created_at: new Date().toISOString()
        };
        treatments.push(treatment);
        console.log(`[Storage] Saved treatment ${newId}`);
        resolve(newId);
    });
};

const updateOutcome = (id, outcome, feedback) => {
    return new Promise((resolve) => {
        const treatment = treatments.find(t => t.id === parseInt(id));
        if (treatment) {
            treatment.outcome = outcome;
            treatment.feedback = feedback;
            console.log(`[Storage] Updated outcome for ${id}: ${outcome}`);
        }
        resolve();
    });
};

const getRecentSuccessfulTreatments = () => {
    return new Promise((resolve) => {
        const recent = treatments
            .filter(t => t.outcome === 'success')
            .slice(-10);
        resolve(recent);
    });
};

module.exports = {
    saveTreatment,
    updateOutcome,
    getRecentSuccessfulTreatments
};
