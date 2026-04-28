import { google } from 'googleapis';

const getOAuth2Client = () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        console.error('Variabili d\'ambiente mancanti');
        return null;
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return oauth2Client;
};

// ============================================================
// GESTIONE CORS MIGLIORATA
// ============================================================
const allowCors = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Gestisce la richiesta preflight OPTIONS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
};

export default async function handler(req, res) {
    // Gestione CORS preflight
    if (allowCors(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo non consentito. Usa POST.' });
    }

    try {
        const { signature, report_id, cliente } = req.body;

        if (!signature || !report_id) {
            return res.status(400).json({ error: 'Dati mancanti.' });
        }

        const base64Data = signature.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const nomeFile = `FIRMA_${report_id}_${(cliente || 'Cliente').replace(/\s+/g, '_').substring(0, 30)}.png`;
        const folderId = process.env.DRIVE_FOLDER_ID;

        const auth = getOAuth2Client();
        if (!auth) {
            return res.status(500).json({ error: 'Configurazione OAuth fallita.' });
        }

        const drive = google.drive({ version: 'v3', auth });

        const response = await drive.files.create({
            requestBody: {
                name: nomeFile,
                parents: folderId ? [folderId] : [],
                mimeType: 'image/png'
            },
            media: {
                mimeType: 'image/png',
                body: require('stream').Readable.from(imageBuffer)
            },
            fields: 'id, webViewLink'
        });

        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                type: 'anyone',
                role: 'reader'
            }
        });

        return res.status(200).json({
            success: true,
            url: response.data.webViewLink,
            file_id: response.data.id,
            report_id: report_id
        });

    } catch (error) {
        console.error('Errore upload firma:', error);
        return res.status(500).json({ 
            error: 'Errore durante il caricamento della firma.',
            details: error.message 
        });
    }
}
