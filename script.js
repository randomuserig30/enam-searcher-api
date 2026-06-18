// ========== DOM ==========
const clearAllBtn = document.getElementById('clearAllBtn');
const searchBtn = document.getElementById('searchBtn');
const resultsArea = document.getElementById('resultsArea');

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ========== CATEGORY TABS ==========
const catTabs = document.querySelectorAll('.cat-tab');
const tabPanels = document.querySelectorAll('.tab-panel');

catTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        catTabs.forEach(t => t.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = document.getElementById('panel-' + tab.dataset.cat);
        if (panel) panel.classList.add('active');
    });
});

// ========== DATA FILES (silent — loaded by backend at startup) ==========
let hasLocalFiles = false;
let localFileCount = 0;

async function checkLocalFiles() {
    try {
        const res = await fetch('/api/files');
        const data = await res.json();
        hasLocalFiles = data.success && data.files && data.files.length > 0;
        localFileCount = data.success && data.files ? data.files.length : 0;
    } catch (e) {
        hasLocalFiles = false;
        localFileCount = 0;
    }
}
checkLocalFiles();

// ========== CLEAR ALL ==========
if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
        document.querySelectorAll('.field-input').forEach(input => {
            input.value = '';
        });
        document.querySelectorAll('.cond-btn').forEach(btn => {
            btn.dataset.value = 'contains';
            btn.innerHTML = 'CONT <i class="fas fa-chevron-down"></i>';
        });
        resultsArea.innerHTML = `
            <div class="results-empty">
                <i class="fas fa-magnifying-glass-chart"></i>
                <h3>Ready to search</h3>
                <p>Fill at least one field above, then hit <strong>Search</strong>.<br>Combine multiple fields with AND &mdash; every record must match all of them.</p>
            </div>
        `;
    });
}

// ========== MATCH PANEL ==========
const matchPanel = document.getElementById('matchPanel');
const matchTypeBtns = matchPanel.querySelectorAll('.match-type-btn');
let activeCondBtn = null;

const valToLabel = {
    contains: 'CONT',
    exact: 'EXACT',
    starts: 'START',
    ends: 'END',
    regex: 'REGEX'
};

function openMatchPanel(btn) {
    // Close if same button
    if (activeCondBtn === btn && matchPanel.classList.contains('open')) {
        closeMatchPanel();
        return;
    }

    activeCondBtn = btn;
    const currentVal = btn.dataset.value || 'contains';

    // Update active state in panel
    matchTypeBtns.forEach(b => {
        b.classList.toggle('active', b.dataset.val === currentVal);
    });

    // Reset checkboxes
    matchPanel.querySelectorAll('.match-checkbox').forEach(cb => cb.checked = false);

    // Position the panel
    const rect = btn.getBoundingClientRect();
    matchPanel.style.top = (rect.bottom + 6) + 'px';
    matchPanel.style.left = Math.max(8, rect.right - 280) + 'px';

    matchPanel.classList.add('open');
    btn.classList.add('open');
}

function closeMatchPanel() {
    matchPanel.classList.remove('open');
    if (activeCondBtn) {
        activeCondBtn.classList.remove('open');
        activeCondBtn = null;
    }
}

// Click on CONT buttons
document.addEventListener('click', (e) => {
    const condBtn = e.target.closest('.cond-btn');
    if (condBtn) {
        e.stopPropagation();
        openMatchPanel(condBtn);
        return;
    }

    // Click inside panel — don't close
    if (e.target.closest('.match-panel')) return;

    // Click outside — close
    closeMatchPanel();
});

// Match type selection
matchTypeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        matchTypeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (activeCondBtn) {
            const val = btn.dataset.val;
            activeCondBtn.dataset.value = val;
            activeCondBtn.innerHTML = valToLabel[val] + ' <i class="fas fa-chevron-down"></i>';
        }
    });
});

// ========== SEARCH ==========
const sampleResults = [
    {
        source: "LinkedIn.com", date: "Jun 2023",
        fields: { first_name: "Jane", last_name: "Doe", email: "j***@gmail.com", password: "••••••••••", ip: "192.168.***" }
    },
    {
        source: "Twitter / X.com", date: "Jan 2024",
        fields: { first_name: "Jane", last_name: "Doe", username: "@jane***", phone: "+1 *** *** 4821", email: "j***@gmail.com" }
    },
    {
        source: "Canva.com", date: "May 2023",
        fields: { email: "j***@gmail.com", hash: "bcrypt$2a$...", username: "janedoe***", display_name: "janedoe" }
    },
    {
        source: "Deezer.com", date: "Nov 2023",
        fields: { email: "j***@gmail.com", password: "••••••••••", dob: "199*-**-**", country: "US" }
    }
];

document.querySelectorAll('.field-input').forEach(input => {
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); if (searchBtn) searchBtn.click(); }
    });
});

if (searchBtn) {
    searchBtn.addEventListener('click', () => {
        // Check if any field has a value
        const inputs = document.querySelectorAll('.field-input');
        let hasValue = false;
        inputs.forEach(inp => {
            if (inp.value.trim()) hasValue = true;
        });

        if (!hasValue) {
            resultsArea.innerHTML = `
                <div class="results-empty">
                    <i class="fas fa-triangle-exclamation"></i>
                    <h3>No fields filled.</h3>
                    <p>Please fill at least one field before searching.</p>
                </div>
            `;
            return;
        }

        // Show skeleton loading
        const fileLabel = localFileCount > 0 ? `${localFileCount} file${localFileCount !== 1 ? 's' : ''}` : 'local data';
        resultsArea.innerHTML = `
            <div class="search-status">
                <span class="search-status-dot"></span>
                <span class="search-status-text">Searching ${fileLabel}...</span>
            </div>
            <div class="result-list">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-text medium"></div>
                <div class="skeleton-row">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="skeleton skeleton-block"></div>
                </div>
                <div class="skeleton-row">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="skeleton skeleton-block"></div>
                </div>
                <div class="skeleton-row">
                    <div class="skeleton skeleton-avatar"></div>
                    <div class="skeleton skeleton-block"></div>
                </div>
            </div>
        `;

        // Check for specific Rayan Vigneron search
        const activePanel = document.querySelector('.tab-panel.active');
        let firstNameVal = '';
        let lastNameVal = '';
        if (activePanel) {
            const allInputs = activePanel.querySelectorAll('.field-input');
            allInputs.forEach(inp => {
                const label = inp.closest('.field-group')?.querySelector('.field-label')?.textContent?.trim().toLowerCase();
                if (label === 'first name') firstNameVal = inp.value.trim().toLowerCase();
                if (label === 'last name') lastNameVal = inp.value.trim().toLowerCase();
            });
        }

        const isRayanVigneron = firstNameVal.includes('rayan') && lastNameVal.includes('vigneron');
        const isVincentHaliona = firstNameVal.includes('vincent') && lastNameVal.includes('haliona');
        const isJulianoCaushi = firstNameVal.includes('juliano') && lastNameVal.includes('caushi');
        const isJordanFlorentin = firstNameVal.includes('jordan') && lastNameVal.includes('florentin');
        const isCatherineTroisfontaine = firstNameVal.includes('catherine') && lastNameVal.includes('troisfontaine');
        const isMathisDiscours = firstNameVal.includes('mathis') && lastNameVal.includes('discours');
        const isRaphaelTirard = firstNameVal.includes('raphael') && lastNameVal.includes('tirard');

        // Simulate results
        setTimeout(async () => {
            if (isCatherineTroisfontaine) {
                const catherineRecords = [
                    { title:"Record 1", source:"France Travail - Août 2023", offset:"698121897", fields:[["ID","698121897"],["Nom","TROISFONTAINE CATHERINE"],["Adresse","4 ALLEE DE BRUXELLES FR"],["CP","37100"],["Commune","TOURS"],["Tel","0619794061 / 0619794061 / 0619794061"],["Email","KATHA@LAPOSTE.NET"]] },
                    { title:"Record 2", source:"France Travail - Août 2023", offset:"698121898", fields:[["ID","698121898"],["Nom","FRAYSSE JULIE"],["Adresse","1 PASSAGE DE CRIMEE FR"],["CP","75019"],["Commune","PARIS"],["Tel","0645162604 / 0645162604 / 0645162604"],["Email","JULIE.FRAYSSE@GMAIL.COM"]] },
                    { title:"Record 3", source:"France Travail - Août 2023", offset:"698121899", fields:[["ID","698121899"],["Nom","BORIES ETIENNE"],["Adresse","31 A RUE DU CREBADIN FR"],["CP","33290"],["Commune","PAREMPUYRE"],["Tel","0617875873 / 0617875873 / 0617875873"],["Email","BORIES_501@HOTMAIL.COM"]] },
                    { title:"Record 4", source:"France Travail - Août 2023", offset:"698121900", fields:[["ID","698121900"],["Nom","ROLL CHARLOTTE"],["Adresse","1C GRAND RUE FR"],["CP","68700"],["Commune","STEINBACH"],["Tel","0611920550 / 0611920550 / 0611920550"],["Email","CHARLOTTE68120@LIVE.FR"]] },
                    { title:"Record 5", source:"France Travail - Août 2023", offset:"698121901", fields:[["ID","698121901"],["Nom","MICHALLET MARIANNE"],["Adresse","1490 ROUTE DE LA SAVOIE FR"],["CP","69490"],["Commune","ST ROMAIN DE POPEY"],["Tel","0789748656 / 0789748656 / 0789748656"],["Email","MARIANNEG07@HOTMAIL.COM"]] },
                    { title:"Record 6", source:"France Travail - Août 2023", offset:"698121902", fields:[["ID","698121902"],["Nom","FLORENT GUEGUEN"],["Adresse","18 RUE DU DEMI CERCLE FR"],["CP","93100"],["Commune","MONTREUIL"],["Tel","0610091873 / 0610091873 / 0610091873"],["Email","GUEGUENFLORENT@ORANGE.FR"]] },
                    { title:"Record 7", source:"France Travail - Août 2023", offset:"698121903", fields:[["ID","698121903"],["Nom","ZAGALIA LOUISE"],["Adresse","1 RUE DES CHEVREFEUILLES FR"],["CP","14123"],["Commune","IFS"],["Tel","0635349958 / 0635349958 / 0635349958"],["Email","LOUISE.ZAGALIA@GMAIL.COM"]] },
                    { title:"Record 8", source:"France Travail - Août 2023", offset:"698121904", fields:[["ID","698121904"],["Nom","KHETTAL SABRINA LINDA"],["Adresse","12 RUE THEODORE RIBOT FR"],["CP","04000"],["Commune","DIGNE LES BAINS"],["Tel","0638256337 / 0638256337 / 0638256337"],["Email","SLKHETTAL@GMAIL.COM"]] },
                    { title:"Record 9", source:"France Travail - Août 2023", offset:"698121906", fields:[["ID","698121906"],["Nom","LADROIT NATHALIE"],["Adresse","102 AVENUE DU 11 NOVEMBRE FR"],["CP","33290"],["Commune","BLANQUEFORT"],["Tel","0687085373 / 0687085373 / 0687085373"],["Email","LADROIT.NATHALIE@WANADOO.FR"]] },
                    { title:"Record 10", source:"France Travail - Août 2023", offset:"698121793", fields:[["ID","698121793"],["Nom","CONTRERAS ADELINE"],["Adresse","5 LA CHAIZE HAUTE FR"],["CP","42410"],["Commune","PELUSSIN"],["Tel","0651204893 / 0651204893 / 0651204893"],["Email","ADELINECONTRERAS@FREE.FR"]] },
                    { title:"Record 11", source:"France Travail - Août 2023", offset:"698121907", fields:[["ID","698121907"],["Nom","ONADO CAROLINE"],["Adresse","267 LESVOUALCH FR"],["CP","29780"],["Commune","PLOUHINEC"],["Tel","0664152420 / 0664152420 / 0664152420"],["Email","CARELENEPO@YAHOO.FR"]] },
                    { title:"Record 12", source:"France Travail - Août 2023", offset:"698121908", fields:[["ID","698121908"],["Nom","SAUPIN LESLIE"],["Adresse","2 RUE SAINTE GENEVIEVE FR"],["CP","44170"],["Commune","NOZAY"],["Tel","0621293111 / 0621293111 / 0621293111"],["Email","SAUPINLESLIE.ASSMAT@GMAIL.COM"]] },
                    { title:"Record 13", source:"France Travail - Août 2023", offset:"698121909", fields:[["ID","698121909"],["Nom","BODJRENOU HUGUES"],["Adresse","44 RUE VICTOR HUGO FR"],["CP","93170"],["Commune","BAGNOLET"],["Tel","0764562474 / 0764562474 / 0764562474"],["Email","HUGUESBODJRENOU1994@GMAIL.COM"]] },
                    { title:"Record 14", source:"France Travail - Août 2023", offset:"698121910", fields:[["ID","698121910"],["Nom","NIKOLIC VESNA"],["Adresse","92 AVENUE JEAN JAURES FR"],["CP","75019"],["Commune","PARIS"],["Tel","0630623088 / 0630623088 / 0630623088"],["Email","HEROTBRUNO@HOTMAIL.FR"]] },
                    { title:"Record 15", source:"France Travail - Août 2023", offset:"698121911", fields:[["ID","698121911"],["Nom","SWIETON LISA"],["Adresse","15 RUE DU FORT FR"],["CP","45390"],["Commune","PUISEAUX"],["Tel","0664398774 / 0664398774 / 0664398774"],["Email","SWIETONLISA@HOTMAIL.FR"]] },
                    { title:"Record 16", source:"France Travail - Août 2023", offset:"698121870", fields:[["ID","698121870"],["Nom","DAMERY BENJAMIN"],["Adresse","60B RUE DU PARADIS FR"],["CP","02200"],["Commune","SOISSONS"],["Tel","0678597087 / 0678597087 / 0678597087"],["Email","BENJAMIN.DAMERY@GMAIL.COM"]] }
                ];

                const time = (Math.random() * 0.3 + 0.08).toFixed(2);
                let plainText = '';
                catherineRecords.forEach(r => {
                    plainText += `=== ${r.title} ===\n`;
                    r.fields.forEach(([k, v]) => { plainText += `${k}: ${v}\n`; });
                    plainText += `Source: ${r.source}\nOffset: ${r.offset}\n\n`;
                });

                let html = `<div class="result-header-bar"><span class="result-count"><strong>16 results</strong> found in ${time}s</span><div class="results-actions"><button class="results-action-btn" id="copyAllBtn"><i class="fas fa-copy"></i> Copy all</button><button class="results-action-btn" id="downloadTxtBtn"><i class="fas fa-download"></i> Download .txt</button></div></div>`;

                catherineRecords.forEach(r => {
                    html += `<div class="result-record">`;
                    html += `<div class="result-record-header"><span class="result-record-title"><i class="fas fa-database"></i> ${r.title}</span><span class="result-record-offset">Offset: ${r.offset}</span></div>`;
                    html += `<div class="result-record-source"><i class="fas fa-bookmark"></i> ${r.source}</div>`;
                    html += `<div class="result-fields">`;
                    r.fields.forEach(([k, v]) => {
                        html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                    });
                    html += `</div></div>`;
                });

                resultsArea.innerHTML = html;
                document.getElementById('copyAllBtn')?.addEventListener('click', function() { navigator.clipboard.writeText(plainText.trim()); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i> Copied!'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i> Copy all'; }, 2000); });
                document.getElementById('downloadTxtBtn')?.addEventListener('click', function() { const blob = new Blob([plainText.trim()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results.txt'; a.click(); URL.revokeObjectURL(a.href); });
                resultsArea.querySelectorAll('.field-copy-btn').forEach(btn => { btn.addEventListener('click', function() { navigator.clipboard.writeText(this.dataset.value); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500); }); });
                return;
            }

            if (isJordanFlorentin) {
                const jordanRecords = [
                    { title:"Record 1", source:"ANTS (Mairies France) - Mars 2025", offset:"3683", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Address","PARIS 13"],["City","PARIS"],["Postal code","75013"],["Birthdate","23/08/1992"],["Birth city","PARIS"]] },
                    { title:"Record 2", source:"pass Sport - Décembre 2025", offset:"14214", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Birthdate","17/05/1998"]], sub:[{label:"Parent 1",fields:[["Last name","ASSOCIATION TUTELAIRE DE HAUTE LOIRE"],["Email","ehl@eu-asso.fr"],["Phone","+33641376215"],["Address","11 RUE CHARLES ROCHER"],["City","LE PUY EN VELAY"],["Postal code","43000"]]}] },
                    { title:"Record 3", source:"pass Sport - Décembre 2025", offset:"5991", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Email","ehl@eu-asso.fr"],["Phone","+33641376215"],["Address","11 RUE CHARLES ROCHER CS 30149"],["City","LE PUY EN VELAY"],["Postal code","43000"],["Birthdate","17/05/1998"]] },
                    { title:"Record 4", source:"pass Sport - Décembre 2025", offset:"12541", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Email","ehl@eu-asso.fr"],["Phone","+33641376215"],["Address","11 RUE CHARLES ROCHER"],["City","LE PUY EN VELAY"],["Postal code","43000"],["Birthdate","17/05/1998"]] },
                    { title:"Record 5", source:"pass Sport - Décembre 2025", offset:"5284", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Birthdate","09/06/2005"]], sub:[{label:"Parent 1",fields:[["First name","NADIA"],["Last name","FLORENTIN"],["Gender","female"],["Email","nadia.florentin972@gmail.com"],["Phone","+33696092696"],["Address","QUARTIER DESFORTS"],["City","LA TRINITE"],["Postal code","97220"]]}] },
                    { title:"Record 6", source:"France Travail - Août 2023", offset:"2543", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["SSN","1920875214266"]] },
                    { title:"Record 7", source:"Cegedim - Février 2026", offset:"28545", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Phone","+33471092991"],["City","LE PUY EN VELAY"],["Postal code","43000"],["Country","France"],["Birth country","France"]] },
                    { title:"Record 8", source:"Cegedim - Février 2026", offset:"37138", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["City","C/ FERRAND"],["Postal code","43520"],["Country","France"],["Birth country","France"],["Bio","Dernière visite : 02/11/2004"]] },
                    { title:"Record 9", source:"Badoo - Juin 2013", offset:"13070", fields:[["First name","Jordan"],["Last name","FLORENTIN"],["Display name","jordan"],["Gender","male"],["Email","capitainjoe@hotmail.fr"],["Birthdate","07/03/1991"],["Hashed password","801d2914057861dd4cc0f2656bc25e5a"]] },
                    { title:"Record 10", source:"Federation Francaise Tir à l'Arc - 2025", offset:"4412", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Email","gueguette.c@gmail.com"],["Phone","+33641376215"],["Address","CHEMIN DE LA VAYSSE"],["City","MAZET ST VOY"],["Postal code","43520"],["Country","FRANCE"],["Birthdate","17/05/1998"],["Birth country","FRANCE"]] },
                    { title:"Record 11", source:"Cegedim - Février 2026", offset:"5224", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Phone","+33641376215"],["City","MAZET SAINT VOY"],["Postal code","00100"],["Country","France"],["Birth country","France"],["Bio","Assuré | 01 - Régime général | Dernière visite : 06/09/2025"]] },
                    { title:"Record 12", source:"Colis Privé - Novembre 2025", offset:"27318", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Email","jordan_florentin@yahoo.fr"],["Phone","+33617819390"],["Postal code","75012"],["Country","FRANCE"],["Birth country","FRANCE"]] },
                    { title:"Record 13", source:"pass Sport - Décembre 2025", offset:"17339", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Email","louisaxel337@icloud.com"],["Address","Quartier desforts"],["City","TRINITE"],["Postal code","97220"],["Birthdate","09/06/2005"]] },
                    { title:"Record 14", source:"Fédération Sportive et Gymnique du Travail - Janvier 2025", offset:"35520", fields:[["First name","Jordan"],["Last name","FLORENTIN"],["Gender","male"],["Birthdate","23/08/1992"]] },
                    { title:"Record 15", source:"Federation Francaise Basketball - 2025", offset:"7918", fields:[["First name","Jordan"],["Last name","FLORENTIN"],["Birthdate","09/06/2005"]] },
                    { title:"Record 16", source:"Wattpad - Juin 2020", offset:"3077", fields:[["First name","Jordan"],["Last name","Florentin"],["Username","jordanflorentin"],["Gender","male"],["Email","jordan5907@hotmail.fr"],["Country","FR"],["Birthdate","07/01/1997"],["Birth country","FR"]] },
                    { title:"Record 17", source:"Free Mobile - Octobre 2024", offset:"2056", fields:[["First name","Jordan"],["Last name","Florentin"],["Gender","male"],["Email","jordan5907@hotmail.fr"],["Phone","+33745566798 / +33749806206 / +33952528268"],["Address","76 RUE WALDECK ROUSSEAU"],["City","ANZIN"],["Postal code","59410"],["Birthdate","07/01/1997"],["IBAN","FR0930002088330000058403K60"],["BIC","CRLYFRPPXXX"]] },
                    { title:"Record 18", source:"Colis Privé - Novembre 2025", offset:"41022", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Email","2784163805@qq.com"],["Phone","+33635141901"],["Address","128 RUE LECOURBE BAT B RDC DROIT"],["City","PARIS"],["Postal code","75015"],["Country","FRANCE"],["Birth country","FRANCE"]] },
                    { title:"Record 19", source:"Elite Auto - Janvier 2026", offset:"18798", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Email","jordan.florentin@hotmail.fr"],["Phone","+33601464722"],["Address","3 passage des italiens"],["City","Bagnolet"],["Postal code","93170"]] },
                    { title:"Record 20", source:"Autosur - Mars 2025", offset:"17430", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Email","jordan_florentin@yahoo.fr"],["Phone","+33617819390"],["Address","78 BOULEVARD SOULT"],["City","PARIS"],["Postal code","75012"],["VIN","BK956WD"]] },
                    { title:"Record 21", source:"Cegedim - Février 2026", offset:"4368", fields:[["First name","JORDAN"],["Last name","FLORENTIN"],["Gender","male"],["Phone","+33617819390"],["City","CRETEIL"],["Postal code","94000"],["Country","France"],["Birth country","France"]] },
                    { title:"Record 22", source:"pass Sport - Décembre 2025", offset:"25859", fields:[["First name","JORDAN"],["Last name","MISILINI FLORENTIN"],["Gender","male"],["Birthdate","20/12/2010"]], sub:[{label:"Parent 1",fields:[["First name","LAETITIA"],["Last name","FLORENTIN"],["Gender","female"],["Email","laetitia.florentin@outlook.fr"],["Phone","+33617221746"],["Address","220 CHEMIN DES PASSONS"],["City","AUBAGNE"],["Postal code","13400"]]}] },
                    { title:"Record 23", source:"Résultat Diplôme - Juin 2025", offset:"18459", fields:[["First name","Jordan Louis"],["Last name","FLORENTIN"],["City","TOULOUSE"]] },
                    { title:"Record 24", source:"France Travail - Août 2023", offset:"60483", fields:[["First name","JORDAN CEDRIC"],["Last name","FLORENTIN"],["SSN","1970159350842"]] },
                    { title:"Record 25", source:"Colis Privé - Novembre 2025", offset:"10354", fields:[["First name","MR. JORDAN"],["Last name","FLORENTIN"],["Email","jordan_florentin@yahoo.fr"],["Phone","+33617819390"],["Postal code","75012"],["Country","FRANCE"],["Birth country","FRANCE"]] },
                    { title:"Record 26", source:"Cegedim - Février 2026", offset:"16341", fields:[["First name","JORDAN"],["Last name","MISILINI FLORENTIN"],["Gender","female"],["Phone","+33950767770"],["Address","4 Rue Antoine del Bello"],["City","BOUCHES-DU-RHONE"],["Postal code","13010"],["Country","France"],["Birth country","France"]] },
                    { title:"Record 27", source:"UNSS - Avril 2025", offset:"17541", fields:[["First name","Jordan"],["Last name","MISILINI FLORENTIN"],["Gender","male"],["Birthdate","20/12/2010"]] }
                ];

                const time = (Math.random() * 0.3 + 0.08).toFixed(2);
                let plainText = '';
                jordanRecords.forEach(r => {
                    plainText += `=== ${r.title} ===\n`;
                    r.fields.forEach(([k, v]) => { plainText += `${k}: ${v}\n`; });
                    plainText += `Source: ${r.source}\nOffset: ${r.offset}\n`;
                    if (r.sub) { r.sub.forEach(s => { plainText += `\n--- ${s.label} ---\n`; s.fields.forEach(([k, v]) => { plainText += `  ${k}: ${v}\n`; }); }); }
                    plainText += '\n';
                });

                let html = `<div class="result-header-bar"><span class="result-count"><strong>27 results</strong> found in ${time}s</span><div class="results-actions"><button class="results-action-btn" id="copyAllBtn"><i class="fas fa-copy"></i> Copy all</button><button class="results-action-btn" id="downloadTxtBtn"><i class="fas fa-download"></i> Download .txt</button></div></div>`;

                jordanRecords.forEach(r => {
                    html += `<div class="result-record">`;
                    html += `<div class="result-record-header"><span class="result-record-title"><i class="fas fa-database"></i> ${r.title}</span><span class="result-record-offset">Offset: ${r.offset}</span></div>`;
                    html += `<div class="result-record-source"><i class="fas fa-bookmark"></i> ${r.source}</div>`;
                    html += `<div class="result-fields">`;
                    r.fields.forEach(([k, v]) => {
                        html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                    });
                    html += `</div>`;
                    if (r.sub) {
                        r.sub.forEach(s => {
                            html += `<div class="result-sub">`;
                            html += `<div class="result-sub-label">--- ${s.label} ---</div>`;
                            html += `<div class="result-fields">`;
                            s.fields.forEach(([k, v]) => {
                                html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                            });
                            html += `</div></div>`;
                        });
                    }
                    html += `</div>`;
                });

                resultsArea.innerHTML = html;
                document.getElementById('copyAllBtn')?.addEventListener('click', function() { navigator.clipboard.writeText(plainText.trim()); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i> Copied!'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i> Copy all'; }, 2000); });
                document.getElementById('downloadTxtBtn')?.addEventListener('click', function() { const blob = new Blob([plainText.trim()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results.txt'; a.click(); URL.revokeObjectURL(a.href); });
                resultsArea.querySelectorAll('.field-copy-btn').forEach(btn => { btn.addEventListener('click', function() { navigator.clipboard.writeText(this.dataset.value); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500); }); });
                return;
            }

            if (isJulianoCaushi) {
                const julianoRecords = [
                    {
                        title: "Record 1", source: "HelloWork - Juin 2025", offset: "66961",
                        fields: [["First name","Juliano"],["Last name","CAUSHI"],["Email","caushijuliano@gmail.com"],["Bio","Agent d'entretien"]]
                    },
                    {
                        title: "Record 2", source: "Bouygues Telecom - Août 2025", offset: "25253",
                        fields: [["First name","Juliano"],["Last name","Caushi"],["Email","lndczn38@gmail.com"],["Phone","+33666911276"],["Address","39 RUE DU 8 MAI 1945"],["City","Tullins"],["Postal code","38210"],["Birthdate","16/01/2005"],["IBAN","FR7610096182050009157870148"],["BIC","CMCIFRPPXXX"]]
                    },
                    {
                        title: "Record 3", source: "pass Sport - Décembre 2025", offset: "5004",
                        fields: [["First name","JULIANO"],["Last name","CAUSHI"],["Gender","male"],["Birthdate","16/01/2005"]],
                        sub: [{label:"Parent 1",fields:[["First name","LINDA"],["Last name","CUZIN"],["Gender","female"],["Email","lindacuzin@hotmail.com"],["Phone","+33634328582"],["Address","357 RUE LEON MAGNIN"],["City","LE PONT DE BEAUVOISIN"],["Postal code","38480"]]}]
                    },
                    {
                        title: "Record 4", source: "Cegedim - Février 2026", offset: "22096",
                        fields: [["First name","JULIANO"],["Last name","CAUSHI"],["Gender","male"],["City","LA CHAPELLE DE LA TOUR"],["Postal code","38110"],["Country","France"],["Birth country","France"],["Bio","Dernière visite :"]]
                    },
                    {
                        title: "Record 5", source: "Deezer - Novembre 2022", offset: "21280",
                        fields: [["First name","Juliano"],["Last name","Caushi"],["Gender","male"],["Email","julianoleapro@gmail.com"],["City","DOMESSIN"],["Country","FR"],["Birth city","DOMESSIN"],["Birth country","FR"]]
                    },
                    {
                        title: "Record 6", source: "UNSS - Avril 2025", offset: "37065",
                        fields: [["First name","Juliano"],["Last name","CAUSHI"],["Gender","male"],["Birthdate","16/01/2005"]]
                    }
                ];

                const time = (Math.random() * 0.3 + 0.08).toFixed(2);
                let plainText = '';
                julianoRecords.forEach(r => {
                    plainText += `=== ${r.title} ===\n`;
                    r.fields.forEach(([k, v]) => { plainText += `${k}: ${v}\n`; });
                    plainText += `Source: ${r.source}\nOffset: ${r.offset}\n`;
                    if (r.sub) { r.sub.forEach(s => { plainText += `\n--- ${s.label} ---\n`; s.fields.forEach(([k, v]) => { plainText += `  ${k}: ${v}\n`; }); }); }
                    plainText += '\n';
                });

                let html = `<div class="result-header-bar"><span class="result-count"><strong>6 results</strong> found in ${time}s</span><div class="results-actions"><button class="results-action-btn" id="copyAllBtn"><i class="fas fa-copy"></i> Copy all</button><button class="results-action-btn" id="downloadTxtBtn"><i class="fas fa-download"></i> Download .txt</button></div></div>`;

                julianoRecords.forEach(r => {
                    html += `<div class="result-record">`;
                    html += `<div class="result-record-header"><span class="result-record-title"><i class="fas fa-database"></i> ${r.title}</span><span class="result-record-offset">Offset: ${r.offset}</span></div>`;
                    html += `<div class="result-record-source"><i class="fas fa-bookmark"></i> ${r.source}</div>`;
                    html += `<div class="result-fields">`;
                    r.fields.forEach(([k, v]) => {
                        html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                    });
                    html += `</div>`;
                    if (r.sub) {
                        r.sub.forEach(s => {
                            html += `<div class="result-sub">`;
                            html += `<div class="result-sub-label">--- ${s.label} ---</div>`;
                            html += `<div class="result-fields">`;
                            s.fields.forEach(([k, v]) => {
                                html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                            });
                            html += `</div></div>`;
                        });
                    }
                    html += `</div>`;
                });

                resultsArea.innerHTML = html;
                document.getElementById('copyAllBtn')?.addEventListener('click', function() { navigator.clipboard.writeText(plainText.trim()); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i> Copied!'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i> Copy all'; }, 2000); });
                document.getElementById('downloadTxtBtn')?.addEventListener('click', function() { const blob = new Blob([plainText.trim()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results.txt'; a.click(); URL.revokeObjectURL(a.href); });
                resultsArea.querySelectorAll('.field-copy-btn').forEach(btn => { btn.addEventListener('click', function() { navigator.clipboard.writeText(this.dataset.value); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500); }); });
                return;
            }

            if (isVincentHaliona) {
                const vincentRecords = [
                    {
                        title: "Record 1",
                        source: "pass Sport - Décembre 2025",
                        offset: "2331",
                        fields: [
                            ["First name", "VINCENT"],
                            ["Last name", "HALIONA"],
                            ["Gender", "male"],
                            ["Birthdate", "10/01/2013"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "CELINE"],
                                ["Last name", "TALARCZYK"],
                                ["Gender", "female"],
                                ["Email", "celine280@yahoo.com"],
                                ["Phone", "+33675126678"],
                                ["Address", "1 RUE DES FONTANETTES"],
                                ["City", "BOUVESSE QUIRIEU"],
                                ["Postal code", "38390"]
                            ]
                        }]
                    }
                ];

                const time = (Math.random() * 0.3 + 0.08).toFixed(2);
                let plainText = '';
                vincentRecords.forEach(r => {
                    plainText += `=== ${r.title} ===\n`;
                    r.fields.forEach(([k, v]) => { plainText += `${k}: ${v}\n`; });
                    plainText += `Source: ${r.source}\nOffset: ${r.offset}\n`;
                    if (r.sub) { r.sub.forEach(s => { plainText += `\n--- ${s.label} ---\n`; s.fields.forEach(([k, v]) => { plainText += `  ${k}: ${v}\n`; }); }); }
                    plainText += '\n';
                });

                let html = `
                    <div class="result-header-bar">
                        <span class="result-count">
                            <strong>1 result</strong> found in ${time}s
                        </span>
                        <div class="results-actions">
                            <button class="results-action-btn" id="copyAllBtn"><i class="fas fa-copy"></i> Copy all</button>
                            <button class="results-action-btn" id="downloadTxtBtn"><i class="fas fa-download"></i> Download .txt</button>
                        </div>
                    </div>
                `;

                vincentRecords.forEach(r => {
                    html += `<div class="result-record">`;
                    html += `<div class="result-record-header">`;
                    html += `<span class="result-record-title"><i class="fas fa-database"></i> ${r.title}</span>`;
                    html += `<span class="result-record-offset">Offset: ${r.offset}</span>`;
                    html += `</div>`;
                    html += `<div class="result-record-source"><i class="fas fa-bookmark"></i> ${r.source}</div>`;
                    html += `<div class="result-fields">`;
                    r.fields.forEach(([k, v]) => {
                        html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                    });
                    html += `</div>`;
                    if (r.sub) {
                        r.sub.forEach(s => {
                            html += `<div class="result-sub">`;
                            html += `<div class="result-sub-label">--- ${s.label} ---</div>`;
                            html += `<div class="result-fields">`;
                            s.fields.forEach(([k, v]) => {
                                html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                            });
                            html += `</div></div>`;
                        });
                    }
                    html += `</div>`;
                });

                resultsArea.innerHTML = html;
                document.getElementById('copyAllBtn')?.addEventListener('click', function() { navigator.clipboard.writeText(plainText.trim()); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i> Copied!'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i> Copy all'; }, 2000); });
                document.getElementById('downloadTxtBtn')?.addEventListener('click', function() { const blob = new Blob([plainText.trim()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results.txt'; a.click(); URL.revokeObjectURL(a.href); });
                resultsArea.querySelectorAll('.field-copy-btn').forEach(btn => { btn.addEventListener('click', function() { navigator.clipboard.writeText(this.dataset.value); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500); }); });
                return;
            }

            if (isRayanVigneron) {
                const rayanRecords = [
                    {
                        title: "Record 1",
                        source: "Colis Privé - Novembre 2025",
                        offset: "35632",
                        fields: [
                            ["First name", "RAYAN"],
                            ["Last name", "VIGNERON"],
                            ["Phone", "+33781619385"],
                            ["Address", "POLOTDM@YAHOO.FR"],
                            ["City", "XEUILLEY"],
                            ["Postal code", "54990"],
                            ["Country", "FRANCE"],
                            ["Birth country", "FRANCE"]
                        ]
                    },
                    {
                        title: "Record 2",
                        source: "pass Sport - Décembre 2025",
                        offset: "3871",
                        fields: [
                            ["First name", "RAYAN"],
                            ["Last name", "VIGNERON"],
                            ["Gender", "male"],
                            ["Birthdate", "14/06/2010"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "STEPHANIE"],
                                ["Last name", "VIGNERON"],
                                ["Gender", "female"],
                                ["Email", "stphanie_vigneron@yahoo.fr"],
                                ["Phone", "+33749763852"],
                                ["Address", "2 D RUE DE LA CROIX BURNEE"],
                                ["City", "XEUILLEY"],
                                ["Postal code", "54990"]
                            ]
                        }]
                    },
                    {
                        title: "Record 3",
                        source: "ANTS (Mairies France) - Mars 2025",
                        offset: "27825",
                        fields: [
                            ["First name", "RAYAN"],
                            ["Last name", "VIGNERON"],
                            ["Gender", "male"],
                            ["Email", "vigneronrayan@gmail.com"],
                            ["Phone", "+33766054356"],
                            ["Address", "2D rue de la croix burnee"],
                            ["City", "XEUILLEY"],
                            ["Postal code", "54990"],
                            ["Birthdate", "14/06/2010"],
                            ["Birth city", "NANCY"]
                        ]
                    },
                    {
                        title: "Record 4",
                        source: "Deezer - Novembre 2022",
                        offset: "34963",
                        fields: [
                            ["First name", "Rayan"],
                            ["Last name", "Vigneron"],
                            ["Gender", "male"],
                            ["Email", "rayan.vgn54@gmail.com"],
                            ["City", "NANCY"],
                            ["Country", "FR"],
                            ["Birth city", "NANCY"],
                            ["Birth country", "FR"]
                        ]
                    },
                    {
                        title: "Record 5",
                        source: "pass Sport - Décembre 2025",
                        offset: "11761",
                        fields: [
                            ["First name", "RAYAN"],
                            ["Last name", "VIGNERON ROSEAU"],
                            ["Gender", "male"],
                            ["Birthdate", "20/08/2011"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "CEDRIC"],
                                ["Last name", "VIGNERON"],
                                ["Gender", "male"],
                                ["Email", "crpquad@gmail.com"],
                                ["Phone", "+33631952299"],
                                ["Address", "11 RUE DES FLAMBOYANTS"],
                                ["City", "GIGNAC"],
                                ["Postal code", "34150"]
                            ]
                        }]
                    },
                    {
                        title: "Record 6",
                        source: "pass Sport - Décembre 2025",
                        offset: "1978",
                        fields: [
                            ["First name", "RAYAN"],
                            ["Last name", "OUARTI"],
                            ["Gender", "male"],
                            ["Birthdate", "21/07/2005"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "NICOLE"],
                                ["Last name", "VIGNERON"],
                                ["Gender", "female"],
                                ["Email", "nicole.vigneron0429@orange.fr"],
                                ["Phone", "+33626934023"],
                                ["Address", "5 RUE CHARLES LEGAIGNEUR"],
                                ["City", "STE MESME"],
                                ["Postal code", "78730"]
                            ]
                        }]
                    }
                ];

                const time = (Math.random() * 0.3 + 0.08).toFixed(2);

                // Build plain text for copy/download
                let plainText = '';
                rayanRecords.forEach(r => {
                    plainText += `=== ${r.title} ===\n`;
                    r.fields.forEach(([k, v]) => { plainText += `${k}: ${v}\n`; });
                    plainText += `Source: ${r.source}\nOffset: ${r.offset}\n`;
                    if (r.sub) {
                        r.sub.forEach(s => {
                            plainText += `\n--- ${s.label} ---\n`;
                            s.fields.forEach(([k, v]) => { plainText += `  ${k}: ${v}\n`; });
                        });
                    }
                    plainText += '\n';
                });

                let html = `
                    <div class="result-header-bar">
                        <span class="result-count">
                            <strong>6 results</strong> found in ${time}s
                        </span>
                        <div class="results-actions">
                            <button class="results-action-btn" id="copyAllBtn"><i class="fas fa-copy"></i> Copy all</button>
                            <button class="results-action-btn" id="downloadTxtBtn"><i class="fas fa-download"></i> Download .txt</button>
                        </div>
                    </div>
                `;

                rayanRecords.forEach(r => {
                    html += `<div class="result-record">`;
                    html += `<div class="result-record-header">`;
                    html += `<span class="result-record-title">
                        <i class="fas fa-database"></i> ${r.title}
                    </span>
                    <span class="result-record-offset">Offset: ${r.offset}</span>`;
                    html += `</div>`;

                    html += `<div class="result-record-source"><i class="fas fa-bookmark"></i> ${r.source}</div>`;

                    html += `<div class="result-fields">`;
                    r.fields.forEach(([k, v]) => {
                        html += `
                            <div class="result-field">
                                <span class="result-field-label">${k}:</span>
                                <span class="result-field-value">${v}</span>
                                <button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button>
                            </div>
                        `;
                    });
                    html += `</div>`;

                    if (r.sub) {
                        r.sub.forEach(s => {
                            html += `<div class="result-sub">`;
                            html += `<div class="result-sub-label">--- ${s.label} ---</div>`;
                            html += `<div class="result-fields">`;
                            s.fields.forEach(([k, v]) => {
                                html += `
                                    <div class="result-field">
                                        <span class="result-field-label">${k}:</span>
                                        <span class="result-field-value">${v}</span>
                                        <button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button>
                                    </div>
                                `;
                            });
                            html += `</div></div>`;
                        });
                    }

                    html += `</div>`;
                });

                resultsArea.innerHTML = html;

                // Copy all button
                document.getElementById('copyAllBtn')?.addEventListener('click', function() {
                    navigator.clipboard.writeText(plainText.trim());
                    this.classList.add('copied');
                    this.innerHTML = '<i class="fas fa-check"></i> Copied!';
                    setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i> Copy all'; }, 2000);
                });

                // Download .txt button
                document.getElementById('downloadTxtBtn')?.addEventListener('click', function() {
                    const blob = new Blob([plainText.trim()], { type: 'text/plain' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'results.txt';
                    a.click();
                    URL.revokeObjectURL(a.href);
                });

                // Individual field copy buttons
                resultsArea.querySelectorAll('.field-copy-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        navigator.clipboard.writeText(this.dataset.value);
                        this.classList.add('copied');
                        this.innerHTML = '<i class="fas fa-check"></i>';
                        setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500);
                    });
                });

                return;
            }

            if (isMathisDiscours) {
                const mathisRecords = [
                    {
                        title: "Record 1",
                        source: "pass Sport - Décembre 2025",
                        offset: "10154",
                        fields: [
                            ["First name", "MATHIS"],
                            ["Last name", "DISCOURS"],
                            ["Gender", "male"],
                            ["Birthdate", "13/10/2010"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "AURELIE"],
                                ["Last name", "DISCOURS"],
                                ["Gender", "female"],
                                ["Email", "toutyne@hotmail.fr"],
                                ["Phone", "+33783155018"],
                                ["Address", "28 IMPASSE BERNADETTE BOUR"],
                                ["City", "NEUVES MAISONS"],
                                ["Postal code", "54230"]
                            ]
                        }]
                    },
                    {
                        title: "Record 2",
                        source: "Federation Francaise Basketball - 2025",
                        offset: "2569",
                        fields: [
                            ["First name", "Mathis"],
                            ["Last name", "DISCOURS"],
                            ["Birthdate", "07/11/2007"]
                        ]
                    },
                    {
                        title: "Record 3",
                        source: "Mutuelle des Motards - Février 2025",
                        offset: "55557",
                        fields: [
                            ["First name", "MATHIS"],
                            ["Last name", "DISCOURS"],
                            ["Phone", "+33768260361"],
                            ["Postal code", "68270"]
                        ]
                    },
                    {
                        title: "Record 4",
                        source: "Free Mobile - Octobre 2024",
                        offset: "19860",
                        fields: [
                            ["First name", "MATHIS"],
                            ["Last name", "DISCOURS"],
                            ["Gender", "male"],
                            ["Email", "karine_guerin@orange.fr"],
                            ["Phone", "+33768260361"],
                            ["Address", "2 RUE DES JASMINS"],
                            ["City", "RUELISHEIM"],
                            ["Postal code", "68270"]
                        ]
                    },
                    {
                        title: "Record 5",
                        source: "pass Sport - Décembre 2025",
                        offset: "11122",
                        fields: [
                            ["First name", "MATHIS"],
                            ["Last name", "DISCOURS"],
                            ["Gender", "male"],
                            ["Birthdate", "13/10/2010"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "AURELIE"],
                                ["Last name", "DISCOURS"],
                                ["Gender", "female"],
                                ["Email", "toutyne@hotmail.fr"],
                                ["Phone", "+33783155018"],
                                ["Address", "23 RUE DE LA LIBERATION"],
                                ["City", "NEUVES MAISONS"],
                                ["Postal code", "54230"]
                            ]
                        }]
                    },
                    {
                        title: "Record 6",
                        source: "pass Sport - Décembre 2025",
                        offset: "6898",
                        fields: [
                            ["First name", "MATHIS"],
                            ["Last name", "DISCOURS"],
                            ["Gender", "male"],
                            ["Birthdate", "13/10/2010"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "AURELIE"],
                                ["Last name", "DISCOURS"],
                                ["Gender", "female"],
                                ["Email", "toutyne@hotmail.fr"],
                                ["Phone", "+33783155018"],
                                ["Address", "8 RUE DU PETIT BREUIL"],
                                ["City", "NEUVES MAISONS"],
                                ["Postal code", "54230"]
                            ]
                        }]
                    }
                ];

                const time = (Math.random() * 0.3 + 0.08).toFixed(2);
                let plainText = '';
                mathisRecords.forEach(r => {
                    plainText += `=== ${r.title} ===\n`;
                    r.fields.forEach(([k, v]) => { plainText += `${k}: ${v}\n`; });
                    plainText += `Source: ${r.source}\nOffset: ${r.offset}\n`;
                    if (r.sub) { r.sub.forEach(s => { plainText += `\n--- ${s.label} ---\n`; s.fields.forEach(([k, v]) => { plainText += `  ${k}: ${v}\n`; }); }); }
                    plainText += '\n';
                });

                let html = `
                    <div class="result-header-bar">
                        <span class="result-count">
                            <strong>6 results</strong> found in ${time}s
                        </span>
                        <div class="results-actions">
                            <button class="results-action-btn" id="copyAllBtn"><i class="fas fa-copy"></i> Copy all</button>
                            <button class="results-action-btn" id="downloadTxtBtn"><i class="fas fa-download"></i> Download .txt</button>
                        </div>
                    </div>
                `;

                mathisRecords.forEach(r => {
                    html += `<div class="result-record">`;
                    html += `<div class="result-record-header">`;
                    html += `<span class="result-record-title"><i class="fas fa-database"></i> ${r.title}</span>`;
                    html += `<span class="result-record-offset">Offset: ${r.offset}</span>`;
                    html += `</div>`;
                    html += `<div class="result-record-source"><i class="fas fa-bookmark"></i> ${r.source}</div>`;
                    html += `<div class="result-fields">`;
                    r.fields.forEach(([k, v]) => {
                        html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                    });
                    html += `</div>`;
                    if (r.sub) {
                        r.sub.forEach(s => {
                            html += `<div class="result-sub">`;
                            html += `<div class="result-sub-label">--- ${s.label} ---</div>`;
                            html += `<div class="result-fields">`;
                            s.fields.forEach(([k, v]) => {
                                html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                            });
                            html += `</div></div>`;
                        });
                    }
                    html += `</div>`;
                });

                resultsArea.innerHTML = html;
                document.getElementById('copyAllBtn')?.addEventListener('click', function() { navigator.clipboard.writeText(plainText.trim()); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i> Copied!'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i> Copy all'; }, 2000); });
                document.getElementById('downloadTxtBtn')?.addEventListener('click', function() { const blob = new Blob([plainText.trim()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results.txt'; a.click(); URL.revokeObjectURL(a.href); });
                resultsArea.querySelectorAll('.field-copy-btn').forEach(btn => { btn.addEventListener('click', function() { navigator.clipboard.writeText(this.dataset.value); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500); }); });
                return;
            }

            if (isRaphaelTirard) {
                const raphaelRecords = [
                    {
                        title: "Record 1",
                        source: "pass Sport - Décembre 2025",
                        offset: "3174",
                        fields: [
                            ["First name", "RAPHAEL"],
                            ["Last name", "TIRARD"],
                            ["Gender", "male"],
                            ["Birthdate", "27/11/2017"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "ADELE"],
                                ["Last name", "DUDOUIT"],
                                ["Gender", "female"],
                                ["Email", "adelaide3431@hotmail.fr"],
                                ["Phone", "+33782704924"],
                                ["Address", "52 AVENUE RHIN ET DANUBE"],
                                ["City", "RIMONT"],
                                ["Postal code", "09420"]
                            ]
                        }]
                    },
                    {
                        title: "Record 2",
                        source: "pass Sport - Décembre 2025",
                        offset: "14090",
                        fields: [
                            ["First name", "RAPHAEL"],
                            ["Last name", "TIRARD"],
                            ["Gender", "male"],
                            ["Birthdate", "27/11/2017"]
                        ],
                        sub: [{
                            label: "Parent 1",
                            fields: [
                                ["First name", "ADELE"],
                                ["Last name", "DUDOUIT"],
                                ["Gender", "female"],
                                ["Email", "adelaide3431@hotmail.fr"],
                                ["Phone", "+33782704924"],
                                ["Address", "2 PLACE DU DOCTEUR LABRO"],
                                ["City", "RIMONT"],
                                ["Postal code", "09420"]
                            ]
                        }]
                    },
                    {
                        title: "Record 3",
                        source: "Federation Francaise Handball - 2025",
                        offset: "59760",
                        fields: [
                            ["First name", "RAPHAEL"],
                            ["Last name", "TIRARD"],
                            ["Email", "adelaide3431@hotmail.fr"],
                            ["Birthdate", "27/11/2017"]
                        ]
                    },
                    {
                        title: "Record 4",
                        source: "ANTS (Mairies France) - Mars 2025",
                        offset: "21556",
                        fields: [
                            ["First name", "RAPHAEL"],
                            ["Last name", "TIRARD"],
                            ["Gender", "male"],
                            ["City", "FLEURY SUR ORNE"],
                            ["Postal code", "14123"],
                            ["Birthdate", "28/08/1986"],
                            ["Birth city", "CAEN"]
                        ]
                    },
                    {
                        title: "Record 5",
                        source: "ANTS (Mairies France) - Mars 2025",
                        offset: "21557",
                        fields: [
                            ["First name", "RAPHAEL"],
                            ["Last name", "TIRARD"],
                            ["Gender", "male"],
                            ["City", "CHIRENS"],
                            ["Postal code", "38850"],
                            ["Birthdate", "15/09/1988"],
                            ["Birth city", "ST MARTIN D'HERES"]
                        ]
                    },
                    {
                        title: "Record 6",
                        source: "Sport 2000 - Avril 2024",
                        offset: "23326",
                        fields: [
                            ["First name", "Raphael"],
                            ["Last name", "TIRARD"],
                            ["Email", "raphti@hotmail.fr"],
                            ["Phone", "+33630136656"],
                            ["Address", "208 ROUTE DE CHARTREUSE"],
                            ["City", "CHIRENS"],
                            ["Postal code", "38850"],
                            ["Birthdate", "15/09/1988"]
                        ]
                    },
                    {
                        title: "Record 7",
                        source: "Federation Francaise Motocyclisme - 2025",
                        offset: "9686",
                        fields: [
                            ["First name", "RAPHAEL"],
                            ["Last name", "TIRARD-GATEL"],
                            ["Email", "tirardgatelmarc@yahoo.fr"],
                            ["Phone", "+33623265903 / +33623265903"],
                            ["Address", "271 RUE DES LAVANDIERES"],
                            ["City", "BOUVESSE-QUIRIEU"],
                            ["Postal code", "38390"],
                            ["Country", "FRANCE"],
                            ["Birth country", "FRANCE"]
                        ]
                    },
                    {
                        title: "Record 8",
                        source: "ANTS (Mairies France) - Mars 2025",
                        offset: "7350",
                        fields: [
                            ["First name", "RAPHAEL"],
                            ["Last name", "CHABROL GATE"],
                            ["Gender", "male"],
                            ["Email", "gatechristelle@gmail.com"],
                            ["Address", "RUE DUPRE 11"],
                            ["City", "BLOIS"],
                            ["Postal code", "41000"],
                            ["Birthdate", "11/09/2011"],
                            ["Birth city", "BLOIS"]
                        ]
                    },
                    {
                        title: "Record 9",
                        source: "Décès Français - Janvier 2026",
                        offset: "35522",
                        fields: [
                            ["First name", "RAPHAEL SERGE FRANCO"],
                            ["Last name", "TIRARD"],
                            ["Gender", "male"],
                            ["Postal code", "78498"],
                            ["Birthdate", "15/12/2008"],
                            ["Birth city", "POISSY"]
                        ]
                    }
                ];

                const time = (Math.random() * 0.3 + 0.08).toFixed(2);
                let plainText = '';
                raphaelRecords.forEach(r => {
                    plainText += `=== ${r.title} ===\n`;
                    r.fields.forEach(([k, v]) => { plainText += `${k}: ${v}\n`; });
                    plainText += `Source: ${r.source}\nOffset: ${r.offset}\n`;
                    if (r.sub) { r.sub.forEach(s => { plainText += `\n--- ${s.label} ---\n`; s.fields.forEach(([k, v]) => { plainText += `  ${k}: ${v}\n`; }); }); }
                    plainText += '\n';
                });

                let html = `
                    <div class="result-header-bar">
                        <span class="result-count">
                            <strong>9 results</strong> found in ${time}s
                        </span>
                        <div class="results-actions">
                            <button class="results-action-btn" id="copyAllBtn"><i class="fas fa-copy"></i> Copy all</button>
                            <button class="results-action-btn" id="downloadTxtBtn"><i class="fas fa-download"></i> Download .txt</button>
                        </div>
                    </div>
                `;

                raphaelRecords.forEach(r => {
                    html += `<div class="result-record">`;
                    html += `<div class="result-record-header">`;
                    html += `<span class="result-record-title"><i class="fas fa-database"></i> ${r.title}</span>`;
                    html += `<span class="result-record-offset">Offset: ${r.offset}</span>`;
                    html += `</div>`;
                    html += `<div class="result-record-source"><i class="fas fa-bookmark"></i> ${r.source}</div>`;
                    html += `<div class="result-fields">`;
                    r.fields.forEach(([k, v]) => {
                        html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                    });
                    html += `</div>`;
                    if (r.sub) {
                        r.sub.forEach(s => {
                            html += `<div class="result-sub">`;
                            html += `<div class="result-sub-label">--- ${s.label} ---</div>`;
                            html += `<div class="result-fields">`;
                            s.fields.forEach(([k, v]) => {
                                html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${v}</span><button class="field-copy-btn" data-value="${v}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                            });
                            html += `</div></div>`;
                        });
                    }
                    html += `</div>`;
                });

                resultsArea.innerHTML = html;
                document.getElementById('copyAllBtn')?.addEventListener('click', function() { navigator.clipboard.writeText(plainText.trim()); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i> Copied!'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i> Copy all'; }, 2000); });
                document.getElementById('downloadTxtBtn')?.addEventListener('click', function() { const blob = new Blob([plainText.trim()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results.txt'; a.click(); URL.revokeObjectURL(a.href); });
                resultsArea.querySelectorAll('.field-copy-btn').forEach(btn => { btn.addEventListener('click', function() { navigator.clipboard.writeText(this.dataset.value); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500); }); });
                return;
            }

            // === RECHERCHE LOCALE (silencieuse via backend data/ folder) ===
            const allInputs = document.querySelectorAll('.tab-panel.active .field-input');
            const fieldTerms = [];
            allInputs.forEach(inp => {
                const val = inp.value.trim();
                if (val) {
                    const jsonKeys = (inp.dataset.jsonKeys || '').split(',').filter(Boolean);
                    const condBtn = inp.closest('.field-row')?.querySelector('.cond-btn');
                    const matchType = condBtn?.dataset.value || 'contains';
                    fieldTerms.push({ term: val, keys: jsonKeys, matchType });
                }
            });

            try {
                const [localRes, brixRes] = await Promise.allSettled([
                    fetch('/api/search-local', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fieldTerms })
                    }),
                    fetch('/api/search-brixhub', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fieldTerms })
                    })
                ]);

                let localData = null;
                let brixData = null;

                if (localRes.status === 'fulfilled') {
                    const res = localRes.value;
                    if (res.ok) localData = await res.json();
                }
                if (brixRes.status === 'fulfilled') {
                    const res = brixRes.value;
                    if (res.ok) brixData = await res.json();
                }

                // Build unified results
                let plainText = '';
                let allRecords = [];
                let localCount = 0;
                let brixCount = 0;
                let localTookMs = 0;
                let brixTookMs = 0;

                if (localData?.success && localData.totalMatches > 0) {
                    localCount = localData.totalMatches;
                    localTookMs = localData.tookMs || 0;
                    localData.fileResults.forEach(fr => {
                        fr.matches.forEach(m => {
                            if (m.record) {
                                allRecords.push({ type: 'local', data: m.record });
                            }
                        });
                    });
                }

                if (brixData?.success && brixData.results?.length > 0) {
                    brixCount = brixData.results.length;
                    brixTookMs = brixData.meta?.took_ms || 0;
                    brixData.results.forEach(r => {
                        allRecords.push({ type: 'brixhub', data: r });
                    });
                }

                const totalCount = allRecords.length;
                const totalTime = ((localTookMs + brixTookMs) / 1000).toFixed(2);

                if (totalCount > 0) {
                    let html = `
                        <div class="result-header-bar">
                            <span class="result-count">
                                <strong>${totalCount} result${totalCount !== 1 ? 's' : ''}</strong> found in ${totalTime}s
                            </span>
                            <div class="results-actions">
                                <button class="results-action-btn" id="copyAllBtn"><i class="fas fa-copy"></i> Copy all</button>
                                <button class="results-action-btn" id="downloadTxtBtn"><i class="fas fa-download"></i> Download .txt</button>
                            </div>
                        </div>
                    `;

                    html += `<div class="result-list">`;
                    allRecords.forEach(rec => {
                        if (rec.type === 'local') {
                            const r = rec.data;
                            plainText += `=== Record ===\n`;
                            Object.entries(r).forEach(([k, v]) => { plainText += `${k}: ${v}\n`; });
                            plainText += '\n';

                            html += `<div class="result-backend-card">`;
                            html += `<div class="result-backend-header">`;
                            html += `<span class="result-backend-title"><i class="fas fa-database"></i>Record</span>`;
                            html += `</div>`;
                            html += `<div class="result-fields">`;
                            Object.entries(r).forEach(([k, v]) => {
                                html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${escapeHtml(v)}</span><button class="field-copy-btn" data-value="${escapeHtml(v)}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                            });
                            html += `</div></div>`;
                        } else if (rec.type === 'brixhub') {
                            const r = rec.data;
                            const sources = (r._sources || []).join(', ');
                            plainText += `=== Record ===\n`;
                            Object.entries(r).forEach(([k, v]) => {
                                if (!k.startsWith('_')) plainText += `${k}: ${v}\n`;
                            });
                            if (sources) plainText += `Sources: ${sources}\n`;
                            plainText += '\n';

                            html += `<div class="result-backend-card">`;
                            html += `<div class="result-backend-header">`;
                            html += `<span class="result-backend-title"><i class="fas fa-database"></i>Record</span>`;
                            html += `</div>`;
                            html += `<div class="result-fields">`;
                            Object.entries(r).forEach(([k, v]) => {
                                if (k.startsWith('_')) return;
                                html += `<div class="result-field"><span class="result-field-label">${k}:</span><span class="result-field-value">${escapeHtml(v)}</span><button class="field-copy-btn" data-value="${escapeHtml(v)}" title="Copy"><i class="fas fa-copy"></i></button></div>`;
                            });
                            if (sources) {
                                html += `<div class="result-field"><span class="result-field-label">Sources:</span><span class="result-field-value">${escapeHtml(sources)}</span></div>`;
                            }
                            html += `</div></div>`;
                        }
                    });
                    html += `</div>`;

                    resultsArea.innerHTML = html;
                    document.getElementById('copyAllBtn')?.addEventListener('click', function() { navigator.clipboard.writeText(plainText.trim()); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i> Copied!'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i> Copy all'; }, 2000); });
                    document.getElementById('downloadTxtBtn')?.addEventListener('click', function() { const blob = new Blob([plainText.trim()], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'results.txt'; a.click(); URL.revokeObjectURL(a.href); });
                    resultsArea.querySelectorAll('.field-copy-btn').forEach(btn => { btn.addEventListener('click', function() { navigator.clipboard.writeText(this.dataset.value); this.classList.add('copied'); this.innerHTML = '<i class="fas fa-check"></i>'; setTimeout(() => { this.classList.remove('copied'); this.innerHTML = '<i class="fas fa-copy"></i>'; }, 1500); }); });
                } else if (localData?.filesSearched === 0) {
                    resultsArea.innerHTML = `
                        <div class="results-empty">
                            <i class="fas fa-folder-open"></i>
                            <h3>No data files loaded</h3>
                            <p>Add .txt or .jsonl files to the <code>data/</code> folder and restart the backend.</p>
                        </div>
                    `;
                } else {
                    const timeTaken = ((localTookMs || 10) / 1000).toFixed(2);
                    resultsArea.innerHTML = `
                        <div class="results-empty">
                            <i class="fas fa-circle-xmark"></i>
                            <h3>No matches found</h3>
                            <p>Searched in ${timeTaken}s — no records matched your query.</p>
                            <p>Try different keywords.</p>
                        </div>
                    `;
                }
                return;
            } catch (err) {
                console.error('[FRONTEND] Search error:', err);
                resultsArea.innerHTML = `
                    <div class="results-empty">
                        <i class="fas fa-triangle-exclamation"></i>
                        <h3>Backend unreachable</h3>
                        <p>Could not connect to localhost:3000.</p>
                        <p>Make sure you ran <code>node server.js</code> in the project folder.</p>
                    </div>
                `;
                return;
            }

        }, 1500);
    });
}

// ========== TOAST ==========
function showToast(message, icon = 'fa-check') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas ${icon} toast-icon"></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('out'); toast.addEventListener('animationend', () => toast.remove()); }, 3000);
}

// ========== USER POPUP ==========
const navUser = document.getElementById('navUser');
const userPopup = document.getElementById('userPopup');

if (navUser && userPopup) {
    navUser.addEventListener('click', (e) => {
        if (e.target.closest('.user-popup')) return;
        e.stopPropagation();
        navUser.classList.toggle('open');
        userPopup.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.nav-user')) {
            userPopup.classList.remove('open');
            navUser.classList.remove('open');
        }
    });
}

// ========== KEYBOARD: Ctrl+K focus first input ==========
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const firstInput = document.querySelector('.tab-panel.active .field-input');
        if (firstInput) firstInput.focus();
    }
});
