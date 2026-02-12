import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import authRouter, { getCurrentUser, requireAdmin, seedUsersIfEmpty } from './auth.js';
import aiRouter from './ai.js';
import { User, Document } from './models.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
if (!process.env.MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined in environment variables.');
} else {
    mongoose.connect(process.env.MONGODB_URI)
        .then(() => {
            console.log('Connected to MongoDB');
            seedUsersIfEmpty(); // Seed after connection
        })
        .catch(err => console.error('MongoDB connection error:', err));
}

// CORS configuration (mostly for local dev)
const allowOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: allowOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cookieParser());

// Auth routes
app.use('/api/auth', authRouter);

// AI routes
app.use(aiRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ ok: true });
});

// --- Documents CRUD ---

app.get('/api/documents', getCurrentUser, async (req, res) => {
    try {
        const docs = await Document.find().sort({ createdAt: -1 });
        res.json(docs);
    } catch (err) {
        res.status(500).json({ detail: 'Error fetching documents' });
    }
});

app.get('/api/documents/:id', getCurrentUser, async (req, res) => {
    try {
        const doc = await Document.findById(req.params.id);
        if (!doc) {
            return res.status(404).json({ detail: 'Not found' });
        }
        res.json(doc);
    } catch (err) {
        res.status(500).json({ detail: 'Error fetching document' });
    }
});

app.post('/api/documents', requireAdmin, async (req, res) => {
    try {
        const newDoc = await Document.create(req.body);
        res.json(newDoc);
    } catch (err) {
        res.status(500).json({ detail: 'Error creating document' });
    }
});

app.put('/api/documents/:id', requireAdmin, async (req, res) => {
    try {
        const updated = await Document.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updated) {
            return res.status(404).json({ detail: 'Not found' });
        }
        res.json(updated);
    } catch (err) {
        res.status(500).json({ detail: 'Error updating document' });
    }
});

app.delete('/api/documents/:id', requireAdmin, async (req, res) => {
    try {
        const deleted = await Document.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ detail: 'Not found' });
        }
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ detail: 'Error deleting document' });
    }
});

// --- Admin tools (export/import) ---

app.get('/api/documents/export', requireAdmin, async (req, res) => {
    try {
        const docs = await Document.find();
        res.json(docs);
    } catch (err) {
        res.status(500).json({ detail: 'Export failed' });
    }
});

app.post('/api/documents/import-bulk', requireAdmin, async (req, res) => {
    const { mode, documents } = req.body;
    try {
        if (mode === 'replace') {
            await Document.deleteMany({});
        }
        const normalized = documents.map(d => {
            const { _id, id, ...rest } = d;
            return rest;
        });
        await Document.insertMany(normalized);
        const result = await Document.find();
        res.json(result);
    } catch (err) {
        res.status(500).json({ detail: 'Import failed' });
    }
});

// --- Static Hosting (Professional Production Setup) ---
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// Handle SPA routing: return index.html for all non-api routes
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
