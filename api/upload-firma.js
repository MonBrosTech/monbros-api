import { google } from 'googleapis';

const getDriveClient = () => {
    try {
        const credentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64;
        const credentials = JSON.parse(Buffer.from(credentialsBase64, 'base64').toString());
        
        const { client_email, private_key } = credentials;
        
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: client_email,
                private_key: private_key
            },
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        
        return google.drive({ version: 'v3', auth });
    } catch (error) {
        console.error('Errore configurazione Drive:', error);
        return null;
    }
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Metodo non consentito. Usa POST.' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { signature, report_id, cliente } = req.body;

        if (!signature || !report_id) {
            return res.status(400).json({ error: 'Dati mancanti.' });
        }

        const base64Data = signature.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        const nomeFile = `FIRMA_${report_id}_${(cliente || 'Cliente').replace(/\s+/g, '_')}.png`;
        const folderId = process.env.DRIVE_FOLDER_ID;

        const drive = getDriveClient();
        if (!drive) {
            return res.status(500).json({ error: 'Configurazione Drive fallita.' });
        }

        // IMPORTANTE: supportAllDrives=true per accedere alla cartella
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
            fields: 'id, webViewLink',
            supportsAllDrives: true  // <-- AGGIUNTO
        });

        // Rendi il file accessibile a chiunque abbia il link
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                type: 'anyone',
                role: 'reader'
            },
            supportsAllDrives: true  // <-- AGGIUNTO
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
