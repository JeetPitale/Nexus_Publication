import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Global MongoDB connection cache for serverless environments
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("Please define the MONGODB_URI environment variable");
        return null;
    }
    const db = await mongoose.connect(uri);
    cachedDb = db;
    return db;
}

// --- Schemas & Models ---
const publicationSchema = new mongoose.Schema({}, { strict: false, collection: 'publications' });
const Publication = mongoose.models.Publication || mongoose.model('Publication', publicationSchema);

const columnSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    label: { type: String, required: true }
}, { collection: 'columns' });
const ColumnDef = mongoose.models.ColumnDef || mongoose.model('ColumnDef', columnSchema);

// --- Middleware ---
const checkAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer admin-token') {
        req.isAdmin = true;
        next();
    } else {
        res.status(403).json({ status: 'error', message: 'Admin access required for CRUD ops.' });
    }
};

// --- Endpoints ---

app.get('/api', async (req, res) => {
    try {
        await connectToDatabase();
        if (req.query.action === 'get_columns') {
            const cols = await ColumnDef.find({}, '-_id key label');
            return res.json({ status: 'success', data: cols });
        }

        const filters = {};
        for (const [key, value] of Object.entries(req.query)) {
            if (key !== 'action' && value) {
                filters[key] = { $regex: value, $options: 'i' };
            }
        }
        
        let results = await Publication.find(filters).lean();
        results = results.map(doc => {
            const result = { id: doc._id.toString(), ...doc };
            delete result._id;
            delete result.__v;
            return result;
        });

        return res.json({ status: 'success', data: results });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

app.post('/api', checkAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        if (req.query.action === 'add_column') {
            if (!req.isAdmin) return res.status(403).json({ status: 'error', message: 'Admin access required.' });
            
            const label = req.body.label ? req.body.label.trim() : '';
            if (!label) return res.json({ status: 'error', message: 'Column label required.' });

            let key = label.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
            key = key.replace(/^_|_$/g, '');

            const existing = await ColumnDef.findOne({ key });
            if (existing) {
                return res.json({ status: 'error', message: 'Column already exists.' });
            }

            await ColumnDef.create({ key, label });
            return res.json({ status: 'success', message: 'Column added successfully.', column: { key, label } });
        }

        if (req.query.action === 'rename_column') {
            if (!req.isAdmin) return res.status(403).json({ status: 'error', message: 'Admin access required.' });

            const oldKey = req.body.old_key ? req.body.old_key.trim() : '';
            const newLabel = req.body.new_label ? req.body.new_label.trim() : '';

            if (!oldKey || !newLabel) {
                return res.json({ status: 'error', message: 'Old key and new label required.' });
            }

            let newKey = newLabel.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_');
            newKey = newKey.replace(/^_|_$/g, '');

            if (newKey !== oldKey) {
                const existing = await ColumnDef.findOne({ key: newKey });
                if (existing) {
                    return res.json({ status: 'error', message: 'Column with this name already exists.' });
                }
            }

            if (newKey !== oldKey) {
                await ColumnDef.findOneAndUpdate({ key: oldKey }, { key: newKey, label: newLabel });
                await Publication.updateMany({}, { $rename: { [oldKey]: newKey } });
            } else {
                await ColumnDef.findOneAndUpdate({ key: oldKey }, { label: newLabel });
            }

            return res.json({ 
                status: 'success', 
                message: 'Column renamed successfully.', 
                column: { old_key: oldKey, new_key: newKey, label: newLabel } 
            });
        }

        if (!req.isAdmin) return res.status(403).json({ status: 'error', message: 'Admin access required.' });
        
        const newPub = await Publication.create(req.body);
        return res.json({ status: 'success', message: 'Record created.', id: newPub._id.toString() });

    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

app.put('/api', checkAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        const id = req.body.id;
        if (!id) return res.status(400).json({ status: 'error', message: 'ID required for update.' });

        const updateData = { ...req.body };
        delete updateData.id;

        await Publication.findByIdAndUpdate(id, updateData);
        return res.json({ status: 'success', message: 'Record updated.' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

app.delete('/api', checkAdmin, async (req, res) => {
    try {
        await connectToDatabase();
        if (req.query.action === 'delete_column') {
            const colKey = req.query.colKey || req.body.colKey;
            if (!colKey) return res.json({ status: 'error', message: 'Column key required.' });

            await ColumnDef.findOneAndDelete({ key: colKey });
            await Publication.updateMany({}, { $unset: { [colKey]: 1 } });
            
            return res.json({ status: 'success', message: 'Column deleted successfully.' });
        }

        const id = req.query.id || req.body.id;
        if (!id) return res.status(400).json({ status: 'error', message: 'ID required for delete.' });

        await Publication.findByIdAndDelete(id);
        return res.json({ status: 'success', message: 'Record deleted.' });
    } catch (err) {
        return res.status(500).json({ status: 'error', message: err.message });
    }
});

// Since we are setting "type": "module" in frontend package.json, Vercel Serverless Functions need to be standard exports if you use ES modules?
// Wait, Vercel supports Express, but if front-end package is "type": "module" we must export the app default.
export default app;
