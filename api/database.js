const { createClient } = require('@supabase/supabase-js');

// Supabase Configuration from Environment Variables
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("[Storage] Supabase client initialized.");
} else {
    console.warn("[Storage] Supabase Env Vars missing. Falling back to in-memory (TEMPORARY).");
}

// In-memory fallback (only used if Supabase is not configured)
let treatments = [];

const saveTreatment = async (data) => {
    const { whatsapp_number, diagnosis, recommended_parameters } = data;
    
    if (supabase) {
        const { data: inserted, error } = await supabase
            .from('treatments')
            .insert([{ whatsapp_number, diagnosis, recommended_parameters, created_at: new Date().toISOString() }])
            .select();
        
        if (error) {
            console.error("[Storage Error] Save failed:", error.message);
            return null;
        }
        return inserted[0].id;
    } else {
        const newId = treatments.length + 1;
        treatments.push({ id: newId, ...data, created_at: new Date().toISOString() });
        return newId;
    }
};

const updateOutcome = async (id, outcome, feedback) => {
    if (supabase) {
        const { error } = await supabase
            .from('treatments')
            .update({ outcome, feedback })
            .eq('id', id);
        
        if (error) console.error("[Storage Error] Update failed:", error.message);
    } else {
        const treatment = treatments.find(t => t.id === parseInt(id));
        if (treatment) {
            treatment.outcome = outcome;
            treatment.feedback = feedback;
        }
    }
};

const getRecentSuccessfulTreatments = async () => {
    if (supabase) {
        const { data, error } = await supabase
            .from('treatments')
            .select('*')
            .eq('outcome', 'success')
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (error) {
            console.error("[Storage Error] Fetch failed:", error.message);
            return [];
        }
        return data || [];
    } else {
        return treatments.filter(t => t.outcome === 'success').slice(-10);
    }
};

const getPatientHistory = async (whatsappNumber) => {
    if (supabase) {
        const { data, error } = await supabase
            .from('treatments')
            .select('*')
            .eq('whatsapp_number', whatsappNumber)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (error) {
            console.error("[Storage Error] History fetch failed:", error.message);
            return [];
        }
        return data || [];
    } else {
        return treatments.filter(t => t.whatsapp_number === whatsappNumber).slice(-5);
    }
};

module.exports = {
    saveTreatment,
    updateOutcome,
    getRecentSuccessfulTreatments,
    getPatientHistory
};
