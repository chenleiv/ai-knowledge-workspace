import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_PATH = path.join(__dirname, 'storage', 'users.json');

export async function ensureFile() {
    try {
        await fs.access(USERS_PATH);
    } catch {
        await fs.mkdir(path.dirname(USERS_PATH), { recursive: true });
        await fs.writeFile(USERS_PATH, '[]', 'utf-8');
    }
}

export async function loadUsers() {
    await ensureFile();
    const raw = await fs.readFile(USERS_PATH, 'utf-8');
    return JSON.parse(raw || '[]');
}

export async function saveUsers(users) {
    await fs.writeFile(USERS_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

export async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

export function findByEmail(users, email) {
    const norm = email.trim().toLowerCase();
    return users.find(u => u.email.toLowerCase() === norm);
}

export async function seedUsersIfEmpty() {
    const users = await loadUsers();
    if (users.length > 0) return;

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@demo.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
    const viewerEmail = process.env.VIEWER_EMAIL || 'viewer@demo.com';
    const viewerPass = process.env.VIEWER_PASSWORD || 'viewer123';

    const seeded = [
        {
            id: 1,
            email: adminEmail,
            password_hash: await hashPassword(adminPass),
            role: 'admin'
        },
        {
            id: 2,
            email: viewerEmail,
            password_hash: await hashPassword(viewerPass),
            role: 'viewer'
        }
    ];
    await saveUsers(seeded);
    console.log('Seeded initial users.');
}
