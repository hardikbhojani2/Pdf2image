const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const AdmZip = require('adm-zip');
const app = express();
const port = 3000;

// PDF.co API Key
const API_KEY = 'hardikbhojani2@gmail.com_sAtTpOqEjbzNcS3Q8Q3UDIefn5kj3TJ951bq3rjrDsLTDhQalCNVcl57rolmsXEw';

// Multer for in-memory uploads
const upload = multer({ 
    storage: multer.memoryStorage(), 
    fileFilter: (req, file, cb) => file.mimetype === 'application/pdf' ? cb(null, true) : cb(new Error('PDF only'), false),
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Serve static files
app.use(express.static('public'));

// Generic PDF.co processor
const processPdf = async (files, endpoint, outputType, outputName, isMulti = false) => {
    const form = new FormData();
    if (isMulti) {
        files.forEach((file, i) => form.append(`file${i}`, file.buffer, file.originalname));
    } else {
        form.append('file', files[0].buffer, files[0].originalname);
    }
    const response = await axios.post(`https://api.pdf.co/v1/pdf${endpoint}`, form, {
        headers: { 'x-api-key': API_KEY, ...form.getHeaders() }
    });
    if (endpoint.includes('split') || endpoint.includes('to/jpg')) {
        const zip = new AdmZip();
        for (let i = 0; i < response.data.urls.length; i++) {
            const data = (await axios.get(response.data.urls[i], { responseType: 'arraybuffer' })).data;
            zip.addFile(`${outputName}-${i + 1}.${outputType === 'zip' ? 'pdf' : 'jpg'}`, data);
        }
        return { buffer: zip.toBuffer(), type: 'application/zip', name: `${outputName}.zip` };
    }
    const data = await axios.get(response.data.url, { responseType: 'arraybuffer' });
    return { buffer: data.data, type: outputType, name: `${outputName}.${outputType.split('/').pop()}` };
};

// API Endpoints
app.post('/merge-pdf', upload.array('pdfs'), async (req, res) => {
    try {
        const { buffer, type, name } = await processPdf(req.files, '/merge', 'application/pdf', 'merged', true);
        res.set('Content-Type', type);
        res.set('Content-Disposition', `attachment; filename=${name}`);
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Error merging PDFs');
    }
});

app.post('/split-pdf', upload.single('pdf'), async (req, res) => {
    try {
        const { buffer, type, name } = await processPdf([req.file], '/split', 'zip', 'split_pdfs');
        res.set('Content-Type', type);
        res.set('Content-Disposition', `attachment; filename=${name}`);
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Error splitting PDF');
    }
});

app.post('/pdf-to-word', upload.single('pdf'), async (req, res) => {
    try {
        const { buffer, type, name } = await processPdf([req.file], '/convert/to/docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'converted');
        res.set('Content-Type', type);
        res.set('Content-Disposition', `attachment; filename=${name}`);
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Error converting to Word');
    }
});

app.post('/compress-pdf', upload.single('pdf'), async (req, res) => {
    try {
        const { buffer, type, name } = await processPdf([req.file], '/optimize', 'application/pdf', 'compressed');
        res.set('Content-Type', type);
        res.set('Content-Disposition', `attachment; filename=${name}`);
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Error compressing PDF');
    }
});

app.post('/pdf-to-image', upload.single('pdf'), async (req, res) => {
    try {
        const { buffer, type, name } = await processPdf([req.file], '/convert/to/jpg', 'zip', 'images');
        res.set('Content-Type', type);
        res.set('Content-Disposition', `attachment; filename=${name}`);
        res.send(buffer);
    } catch (e) {
        res.status(500).send('Error converting to images');
    }
});

app.post('/edit-pdf', upload.single('pdf'), async (req, res) => {
    res.status(200).send('Edit PDF requires Stirling-PDF: https://github.com/Stirling-Tools/Stirling-PDF');
});

app.listen(port, () => console.log(`Server at http://localhost:${port}`));
