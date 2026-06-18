const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const fetch = globalThis.fetch || ((...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)));

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// ========== LOCAL FILE SCANNER (streaming) ==========
let localFiles = []; // { name, filePath, type, sizeKB, lineCount }

function flattenObjectValues(obj) {
    const values = [];
    function walk(v) {
        if (v === null || v === undefined) return;
        if (typeof v === 'string' || typeof v === 'number') values.push(String(v).toLowerCase());
        else if (Array.isArray(v)) v.forEach(walk);
        else if (typeof v === 'object') Object.values(v).forEach(walk);
    }
    walk(obj);
    return values;
}

function scanDataFolder() {
    localFiles = [];
    if (!fs.existsSync(DATA_DIR)) {
        console.log(`[SCAN] Creating data folder: ${DATA_DIR}`);
        fs.mkdirSync(DATA_DIR, { recursive: true });
        return;
    }

    const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
    const accepted = entries.filter(e => e.isFile() && (e.name.endsWith('.txt') || e.name.endsWith('.jsonl')));

    for (const entry of accepted) {
        const filePath = path.join(DATA_DIR, entry.name);
        const isJsonl = entry.name.endsWith('.jsonl');
        try {
            const stats = fs.statSync(filePath);
            const sizeKB = (stats.size / 1024).toFixed(1);
            localFiles.push({ name: entry.name, filePath, type: isJsonl ? 'jsonl' : 'txt', sizeKB: parseFloat(sizeKB), lineCount: 0 });
            console.log(`[SCAN] Found ${entry.name}: ${sizeKB} KB`);
        } catch (err) {
            console.warn(`[SCAN] Could not scan ${entry.name}:`, err.message);
        }
    }

    console.log(`[SCAN] Total: ${localFiles.length} file(s) from ${DATA_DIR}`);
}

// Scan in background so server starts immediately
scanDataFolder();

// Route: refresh files from disk
app.post('/api/refresh-files', async (req, res) => {
    await scanDataFolder();
    res.json({
        success: true,
        files: localFiles.map(f => ({ name: f.name, lines: f.lineCount, sizeKB: f.sizeKB }))
    });
});

// Route: list currently loaded files
app.get('/api/files', (req, res) => {
    res.json({
        success: true,
        files: localFiles.map(f => ({ name: f.name, lines: f.lineCount, sizeKB: f.sizeKB }))
    });
});

function personKey(record) {
    // Group by person identity: name + phone (or email fallback)
    const nom = (record.nom || record.Nom || record.last_name || '').toLowerCase().trim();
    const prenom = (record.prenom || record.Prenom || record.first_name || '').toLowerCase().trim();
    const telephone = (record.telephone || record.Telephone || record.phone || '').toLowerCase().trim();
    const email = (record.email || record.Email || '').toLowerCase().trim();
    if (nom && prenom && telephone) return `${nom}:${prenom}:${telephone}`;
    if (email) return email;
    return null; // will not deduplicate
}

// Fast case-insensitive includes without creating a new lowercase string
function includesCI(str, term) {
    if (term.length === 0) return true;
    if (term.length > str.length) return false;
    const tlen = term.length;
    const slen = str.length;
    const first = term.charCodeAt(0);
    outer: for (let i = 0; i <= slen - tlen; i++) {
        const c = str.charCodeAt(i);
        if (c !== first && c !== first - 32 && c !== first + 32) continue;
        for (let j = 1; j < tlen; j++) {
            const a = str.charCodeAt(i + j);
            const b = term.charCodeAt(j);
            if (a !== b && a !== b - 32 && a !== b + 32) continue outer;
        }
        return true;
    }
    return false;
}

function matchValue(recordValue, termLower, matchType) {
    const valLower = String(recordValue).toLowerCase().trim();
    switch (matchType) {
        case 'exact': return valLower === termLower;
        case 'starts': return valLower.startsWith(termLower);
        case 'ends': return valLower.endsWith(termLower);
        case 'contains':
        default: return valLower.includes(termLower);
    }
}

async function searchFileStream(file, fieldTerms, seenKeys, maxMatches) {
    const matches = [];
    const stream = fs.createReadStream(file.filePath, { encoding: 'utf-8', highWaterMark: 4 * 1024 * 1024 });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
    let lineNum = 0;

    // Build fast search strings for pre-filter (all terms must appear somewhere)
    const allSearchStrings = fieldTerms.map(ft => ft.term.toLowerCase().trim()).filter(Boolean);

    for await (const line of rl) {
        lineNum++;
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (file.type === 'jsonl') {
            // Fast pre-filter: all terms must appear somewhere in the raw line
            const quickMatch = allSearchStrings.every(term => includesCI(trimmed, term));
            if (!quickMatch) continue;
            try {
                const record = JSON.parse(trimmed);
                // Strict field-aware match with match type
                const allMatch = fieldTerms.every(ft => {
                    const termLower = ft.term.toLowerCase().trim();
                    if (!termLower) return true;
                    if (!ft.keys || ft.keys.length === 0) {
                        // No specific mapping → search in all flattened values
                        const flatValues = flattenObjectValues(record);
                        return flatValues.some(v => {
                            switch (ft.matchType) {
                                case 'exact': return v === termLower;
                                case 'starts': return v.startsWith(termLower);
                                case 'ends': return v.endsWith(termLower);
                                default: return v.includes(termLower);
                            }
                        });
                    }
                    // Search only in specified JSON keys with match type
                    return ft.keys.some(key => {
                        if (record[key] === undefined) return false;
                        return matchValue(record[key], termLower, ft.matchType);
                    });
                });
                if (allMatch) {
                    const pk = personKey(record);
                    if (pk && seenKeys.has(pk)) continue;
                    if (pk) seenKeys.add(pk);
                    matches.push({ record, lineNum });
                    if (maxMatches && matches.length >= maxMatches) break;
                }
            } catch { /* skip invalid JSON line */ }
        } else {
            const allMatch = allSearchStrings.every(term => includesCI(trimmed, term));
            if (allMatch) {
                matches.push({ line: trimmed, lineNum });
                if (maxMatches && matches.length >= maxMatches) break;
            }
        }
    }
    return matches;
}

// Route: search locally in loaded files (.txt and .jsonl)
app.post('/api/search-local', async (req, res) => {
    try {
        const { fieldTerms, terms } = req.body;
        let ft = fieldTerms;
        // Backwards compatibility: convert old terms array to fieldTerms
        if (!ft && Array.isArray(terms)) {
            ft = terms.map(t => ({ term: t, keys: [] }));
        }
        if (!Array.isArray(ft) || ft.length === 0) {
            return res.status(400).json({ success: false, error: 'fieldTerms array required' });
        }

        const validTerms = ft.filter(f => f.term && f.term.trim().length > 0);
        if (validTerms.length === 0) {
            return res.status(400).json({ success: false, error: 'empty terms' });
        }

        const MAX_MATCHES = 100;
        const seenKeys = new Set();
        let totalMatches = 0;
        const fileResults = [];
        const startTime = Date.now();

        for (const file of localFiles) {
            const remaining = MAX_MATCHES - totalMatches;
            if (remaining <= 0) break;
            const matches = await searchFileStream(file, validTerms, seenKeys, remaining);
            if (matches.length > 0) {
                fileResults.push({ name: file.name, matches });
                totalMatches += matches.length;
            }
        }

        const tookMs = Date.now() - startTime;

        res.json({
            success: true,
            totalMatches,
            filesSearched: localFiles.length,
            fileResults,
            tookMs,
            capped: totalMatches >= MAX_MATCHES
        });
    } catch (error) {
        console.error('[SEARCH-LOCAL ERROR]', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== BRIXHUB API PROXY ==========
const BRIXHUB_BASE = 'https://brixhub.net/api/v1';
const BRIXHUB_KEY = 'brix_TOqwj-ofmKNHqNGG1J-DmuJhmbuoq73_bV956H0MoMn35_0U';

function mapToBrixHubFields(fieldTerms) {
    const body = {};
    for (const ft of (fieldTerms || [])) {
        const val = ft.term?.trim();
        if (!val) continue;
        const keys = ft.keys || [];
        // Map json keys to BrixHub field names
        if (keys.some(k => ['prenom','first_name'].includes(k))) body.prenom = val;
        if (keys.some(k => ['nom','last_name'].includes(k))) body.nom_famille = val;
        if (keys.some(k => ['nom_naissance','birth_name'].includes(k))) body.nom_naissance = val;
        if (keys.some(k => ['display_name','pseudo'].includes(k))) body.nom_affichage = val;
        if (keys.some(k => ['username','login'].includes(k))) body.nom_utilisateur = val;
        if (keys.some(k => ['gender','sexe'].includes(k))) body.genre = val;
        if (keys.some(k => ['email','Email'].includes(k))) body.email = val;
        if (keys.some(k => ['telephone','phone','tel'].includes(k))) body.telephone = val;
        if (keys.some(k => ['ville','city'].includes(k))) body.ville = val;
        if (keys.some(k => ['state','region','departement'].includes(k))) body.region = val;
        if (keys.some(k => ['cp','code_postal','zip'].includes(k))) body.code_postal = val;
        if (keys.some(k => ['pays','country'].includes(k))) body.pays = val;
        if (keys.some(k => ['birthdate','date_naissance'].includes(k))) body.date_naissance = val;
        if (keys.some(k => ['ip','ip_address'].includes(k))) body.adresse_ip = val;
        if (keys.some(k => ['ssn','social_security','numero_securite_sociale'].includes(k))) body.nir = val;
    }
    return body;
}

app.post('/api/search-brixhub', async (req, res) => {
    try {
        const { fieldTerms } = req.body;
        const body = mapToBrixHubFields(fieldTerms);
        if (Object.keys(body).length === 0) {
            return res.status(400).json({ success: false, error: 'No searchable fields mapped' });
        }

        body.flexible = true; // Allow partial matches
        body.per_page = 10;

        const response = await fetch(`${BRIXHUB_BASE}/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': BRIXHUB_KEY,
                'User-Agent': 'LeakSearch/1.0'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.error('[BRIXHUB] HTTP', response.status, text.slice(0, 200));
            return res.status(502).json({ success: false, error: `BrixHub returned ${response.status}` });
        }

        const brixData = await response.json();
        res.json({
            success: true,
            results: brixData.data?.results || [],
            meta: brixData.meta || null,
            status: brixData.status
        });
    } catch (error) {
        console.error('[BRIXHUB ERROR]', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log('Press Ctrl+C to stop');
});
