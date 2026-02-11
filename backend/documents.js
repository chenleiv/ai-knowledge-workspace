import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'documents.json');

export async function loadDocuments() {
    try {
        const raw = await fs.readFile(DATA_FILE, 'utf-8');
        return JSON.parse(raw || '[]');
    } catch {
        return [];
    }
}

export async function saveDocuments(docs) {
    await fs.writeFile(DATA_FILE, JSON.stringify(docs, null, 2), 'utf-8');
}

export function nextId(docs) {
    return (Math.max(0, ...docs.map(d => d.id)) + 1);
}
