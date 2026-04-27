// Questa è l'API che riceve la firma dalla Web App
export default async function handler(req, res) {
    // Permette solo richieste POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo non consentito' });
    }

    try {
        const { signature, report_id, cliente } = req.body;

        if (!signature || !report_id) {
            return res.status(400).json({ error: 'Dati mancanti' });
        }

        // Estrai i dati base64 dall'immagine
        const base64Data = signature.replace(/^data:image\/png;base64,/, '');
        
        // Salva temporaneamente su Drive usando le credenziali
        // ... (completiamo insieme dopo)

        // Per ora restituisci un segnaposto
        return res.status(200).json({
            success: true,
            url: `https://drive.google.com/file/d/TEMP_ID/view`,
            report_id: report_id
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
