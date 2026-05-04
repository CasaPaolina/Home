// ─────────────────────────────────────────────────────────────
//  Casa Paolina — Self Check-in Form
// ─────────────────────────────────────────────────────────────
//
//  SETUP: Replace the URL below with your Google Apps Script
//  Web App URL after deploying it (see setup instructions).
//
const SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzKY0SAHhMQFoQxKifZKfOTcl6NfaD11h08fAoAQJvsKhXD8hIvrGGmaPAK_1ZkqKz6cg/exec';
// ─────────────────────────────────────────────────────────────

let currentStep = 1;
let guestCount = 0;
const MAX_GUESTS = 10;

// ─── STEP NAVIGATION ────────────────────────────────────────

function ciNextStep(from) {
    ciGoToStep(from + 1);
    if (from + 1 === 3) ciSyncGuestsFromAdults();
    if (from + 1 === 4) ciBuildSummary();
}

function ciPrevStep(from) {
    ciGoToStep(from - 1);
}

function ciGoToStep(n) {
    document.querySelectorAll('.ci-section').forEach(s => s.classList.remove('active'));
    document.querySelector(`#step-${n}`)?.classList.add('active');

    document.querySelectorAll('.ci-step').forEach(s => {
        const sn = parseInt(s.dataset.step);
        s.classList.remove('active', 'done');
        if (sn < n) s.classList.add('done');
        if (sn === n) s.classList.add('active');
    });

    currentStep = n;
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── VALIDATION ─────────────────────────────────────────────

function ciValidateStep(step) {
    const section = document.querySelector(`#step-${step}`);
    const required = section.querySelectorAll('[required]');
    let ok = true;

    required.forEach(el => {
        el.classList.remove('ci-invalid');
        if (!el.value.trim()) {
            el.classList.add('ci-invalid');
            ok = false;
        }
    });

    if (!ok) {
        const first = section.querySelector('.ci-invalid');
        first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ciShowStepError(step, 'Compila tutti i campi obbligatori contrassegnati con *');
    } else {
        ciClearStepError(step);
    }

    return ok;
}

function ciShowStepError(step, msg) {
    const section = document.querySelector(`#step-${step}`);
    let err = section.querySelector('.ci-step-error');
    if (!err) {
        err = document.createElement('p');
        err.className = 'ci-step-error';
        section.querySelector('.ci-nav').before(err);
    }
    err.textContent = '⚠ ' + msg;
}

function ciClearStepError(step) {
    document.querySelector(`#step-${step} .ci-step-error`)?.remove();
}

// ─── TRIP TYPE CHIPS ────────────────────────────────────────

document.querySelectorAll('#trip-type-chips .ci-chip').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#trip-type-chips .ci-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('trip-type').value = btn.dataset.value;
    });
});

// ─── GUEST MANAGEMENT ───────────────────────────────────────

// Auto-add guest rows based on adults count when reaching step 3
function ciSyncGuestsFromAdults() {
    const adults = parseInt(document.getElementById('adults-count').value) || 1;
    const needed = adults - 1; // first guest = referente

    // Add rows up to needed (don't remove existing filled ones)
    while (guestCount < needed && guestCount < MAX_GUESTS) {
        ciAddGuest();
    }

    const addBtn = document.getElementById('add-guest-btn');
    if (addBtn) addBtn.style.display = guestCount >= MAX_GUESTS ? 'none' : '';
}

function ciAddGuest() {
    if (guestCount >= MAX_GUESTS) return;
    guestCount++;
    const idx = guestCount;

    const container = document.getElementById('guests-container');
    const block = document.createElement('div');
    block.className = 'ci-guest-block';
    block.id = `guest-block-${idx}`;

    block.innerHTML = `
        <div class="ci-guest-block-header">
            <h3>Ospite ${idx}</h3>
            <button type="button" class="ci-remove-guest" onclick="ciRemoveGuest(${idx})" title="Rimuovi ospite">✕</button>
        </div>
        <div class="ci-card">
            <div class="ci-row ci-row--2">
                <div class="ci-field">
                    <label for="g${idx}-nome">Nome <span class="req">*</span></label>
                    <input type="text" id="g${idx}-nome" name="g${idx}_nome" placeholder="Mario" autocomplete="off">
                </div>
                <div class="ci-field">
                    <label for="g${idx}-cognome">Cognome <span class="req">*</span></label>
                    <input type="text" id="g${idx}-cognome" name="g${idx}_cognome" placeholder="Rossi" autocomplete="off">
                </div>
            </div>
            <div class="ci-row ci-row--3">
                <div class="ci-field">
                    <label for="g${idx}-sesso">Sesso <span class="req">*</span></label>
                    <select id="g${idx}-sesso" name="g${idx}_sesso">
                        <option value="">—</option>
                        <option value="M">Maschio</option>
                        <option value="F">Femmina</option>
                    </select>
                </div>
                <div class="ci-field">
                    <label for="g${idx}-nascita">Data di nascita <span class="req">*</span></label>
                    <input type="date" id="g${idx}-nascita" name="g${idx}_nascita" autocomplete="off">
                </div>
                <div class="ci-field">
                    <label for="g${idx}-cittadinanza">Cittadinanza <span class="req">*</span></label>
                    <input type="text" id="g${idx}-cittadinanza" name="g${idx}_cittadinanza" placeholder="Italiana" autocomplete="off">
                </div>
            </div>
            <div class="ci-row ci-row--2">
                <div class="ci-field">
                    <label for="g${idx}-nascita-comune">Comune di nascita <span class="req">*</span></label>
                    <input type="text" id="g${idx}-nascita-comune" name="g${idx}_nascita_comune" placeholder="Roma" autocomplete="off">
                </div>
                <div class="ci-field">
                    <label for="g${idx}-nascita-stato">Stato di nascita <span class="req">*</span></label>
                    <input type="text" id="g${idx}-nascita-stato" name="g${idx}_nascita_stato" placeholder="Italia" required value="Italia" autocomplete="off">
                </div>
            </div>
        </div>
    `;

    container.appendChild(block);

    const addBtn = document.getElementById('add-guest-btn');
    if (addBtn) addBtn.style.display = guestCount >= MAX_GUESTS ? 'none' : '';
}

function ciRemoveGuest(idx) {
    const block = document.getElementById(`guest-block-${idx}`);
    if (block) block.remove();
    guestCount = document.querySelectorAll('.ci-guest-block').length;

    // Re-number headers
    document.querySelectorAll('.ci-guest-block').forEach((b, i) => {
        const h3 = b.querySelector('h3');
        if (h3) h3.textContent = `Ospite ${i + 1}`;
    });

    const addBtn = document.getElementById('add-guest-btn');
    if (addBtn) addBtn.style.display = guestCount >= MAX_GUESTS ? 'none' : '';
}

// ─── SUMMARY BUILDER ────────────────────────────────────────

function ciBuildSummary() {
    const v = id => document.getElementById(id)?.value || '—';

    const tripTypeLabels = {
        coppia: '💑 Coppia', famiglia: '👨‍👩‍👧 Famiglia',
        gruppo_amici: '🎉 Gruppo amici', singolo: '🧍 Singolo', altro: '✨ Altro'
    };

    let guestsHTML = '';
    document.querySelectorAll('.ci-guest-block').forEach((block, i) => {
        const inputs = block.querySelectorAll('input, select');
        const data = {};
        inputs.forEach(inp => {
            const key = inp.id.replace(/^g\d+-/, '');
            data[key] = inp.value || '—';
        });
        guestsHTML += `
            <div class="summary-guest">
                <strong>Ospite ${i + 1}:</strong>
                ${data.nome} ${data.cognome} · ${data['nascita'] || '—'} · ${data.cittadinanza}
            </div>`;
    });

    document.getElementById('summary-card').innerHTML = `
        <h3 class="ci-card-title">📋 Riepilogo</h3>
        <div class="summary-grid">
            <div class="summary-row">
                <span class="summary-label">Appartamento</span>
                <span class="summary-value">${v('appartamento') || '—'}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Arrivo</span>
                <span class="summary-value">${ciFormatDate(v('checkin-date'))}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Partenza</span>
                <span class="summary-value">${ciFormatDate(v('checkout-date'))}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Ospiti</span>
                <span class="summary-value">${v('adults-count')} adulti · ${v('children-count')} bambini</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Tipo</span>
                <span class="summary-value">${tripTypeLabels[v('trip-type')] || v('trip-type')}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Ora arrivo</span>
                <span class="summary-value">${v('ora-arrivo') || '—'}</span>
            </div>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-grid">
            <div class="summary-row">
                <span class="summary-label">Referente</span>
                <span class="summary-value"><strong>${v('r-nome')} ${v('r-cognome')}</strong></span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Email</span>
                <span class="summary-value">${v('r-email')}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Telefono</span>
                <span class="summary-value">${v('r-telefono')}</span>
            </div>
            <div class="summary-row">
                <span class="summary-label">Documento</span>
                <span class="summary-value">${v('r-doc-tipo')} n° ${v('r-doc-numero')}</span>
            </div>
        </div>
        ${guestsHTML ? `<div class="summary-divider"></div><div class="summary-guests">${guestsHTML}</div>` : ''}
    `;
}

function ciFormatDate(dateStr) {
    if (!dateStr || dateStr === '—') return '—';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
}

// ─── FORM SUBMISSION ────────────────────────────────────────

document.getElementById('checkin-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="submit-icon">⏳</span> Invio in corso…';

    const payload = ciCollectFormData();

    // ── If script URL not configured, just show success (test mode) ──
    if (SHEETS_SCRIPT_URL === 'REPLACE_WITH_YOUR_GOOGLE_APPS_SCRIPT_URL') {
        console.log('TEST MODE — dati che sarebbero inviati:', payload);
        ciShowSuccess(payload);
        return;
    }

    // Google Apps Script redirects POST requests internally, which causes browsers
    // to drop the request body (fetch loses data on redirect). The reliable fix is
    // a hidden form submitted to a hidden iframe — form submissions follow redirects
    // correctly and are not subject to CORS restrictions.
    ciSubmitViaIframe(payload);
    // Give the iframe submit a moment, then show success
    setTimeout(() => ciShowSuccess(payload), 800);
});

function ciSubmitViaIframe(payload) {
    // Create a hidden iframe so the form submission doesn't navigate the page
    let iframe = document.getElementById('ci-hidden-iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'ci-hidden-iframe';
        iframe.name = 'ci-hidden-iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

    // Create a hidden form targeting the iframe
    let form = document.getElementById('ci-hidden-form');
    if (!form) {
        form = document.createElement('form');
        form.id = 'ci-hidden-form';
        form.method = 'POST';
        form.target = 'ci-hidden-iframe';
        form.style.display = 'none';
        document.body.appendChild(form);
    }

    form.action = SHEETS_SCRIPT_URL;
    form.innerHTML = '';

    // Send payload as a single JSON field named "data"
    const input = document.createElement('textarea');
    input.name = 'data';
    input.value = JSON.stringify(payload);
    form.appendChild(input);

    form.submit();
}

function ciCollectFormData() {
    const v = id => document.getElementById(id)?.value.trim() || '';

    const guests = [];
    document.querySelectorAll('.ci-guest-block').forEach((block, i) => {
        const idx = i + 1;
        guests.push({
            nome: block.querySelector(`[id$="-nome"]`)?.value.trim() || '',
            cognome: block.querySelector(`[id$="-cognome"]`)?.value.trim() || '',
            sesso: block.querySelector(`[id$="-sesso"]`)?.value || '',
            data_nascita: block.querySelector(`[id$="-nascita"]:not([id*="comune"]):not([id*="stato"])`)?.value || '',
            comune_nascita: block.querySelector(`[id$="-nascita-comune"]`)?.value.trim() || '',
            stato_nascita: block.querySelector(`[id$="-nascita-stato"]`)?.value.trim() || '',
            cittadinanza: block.querySelector(`[id$="-cittadinanza"]`)?.value.trim() || ''
        });
    });

    return {
        timestamp: new Date().toISOString(),
        // Soggiorno
        appartamento: v('appartamento'),
        checkin_date: v('checkin-date'),
        checkout_date: v('checkout-date'),
        adults_count: v('adults-count'),
        children_count: v('children-count'),
        trip_type: v('trip-type'),
        ora_arrivo: v('ora-arrivo'),
        // Referente
        r_nome: v('r-nome'),
        r_cognome: v('r-cognome'),
        r_sesso: v('r-sesso'),
        r_nascita_data: v('r-nascita-data'),
        r_nascita_comune: v('r-nascita-comune'),
        r_nascita_stato: v('r-nascita-stato'),
        r_cittadinanza: v('r-cittadinanza'),
        r_indirizzo: v('r-indirizzo'),
        r_comune: v('r-comune'),
        r_cap: v('r-cap'),
        r_paese: v('r-paese'),
        r_doc_tipo: v('r-doc-tipo'),
        r_doc_numero: v('r-doc-numero'),
        r_doc_emissione: v('r-doc-emissione'),
        r_doc_scadenza: v('r-doc-scadenza'),
        r_doc_rilascio: v('r-doc-rilascio'),
        r_email: v('r-email'),
        r_telefono: v('r-telefono'),
        // Accompagnatori
        guests_count: guests.length,
        guests: guests,
        // Note
        note: v('note')
    };
}

function ciShowSuccess(data) {
    document.getElementById('checkin-form').style.display = 'none';
    document.querySelector('.ci-steps-bar').style.display = 'none';
    const successScreen = document.getElementById('success-screen');
    successScreen.style.display = 'block';

    document.getElementById('success-name').textContent = data.r_nome || 'Ospite';
    document.getElementById('success-summary').innerHTML = `
        <div class="success-detail">
            <span>🏠 ${data.appartamento || 'Casa Paolina'}</span>
            <span>📅 ${ciFormatDate(data.checkin_date)} → ${ciFormatDate(data.checkout_date)}</span>
            <span>👥 ${parseInt(data.adults_count) + parseInt(data.children_count || 0)} ospiti</span>
        </div>
    `;
}

function ciShowFormError(msg) {
    const el = document.getElementById('form-error');
    el.textContent = '⚠ ' + msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Set default checkin to today + 1 day, checkout to today + 8 days
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 8);

    const fmt = d => d.toISOString().split('T')[0];
    const cin = document.getElementById('checkin-date');
    const cout = document.getElementById('checkout-date');
    if (cin && !cin.value) cin.value = fmt(tomorrow);
    if (cout && !cout.value) cout.value = fmt(nextWeek);
    if (cin) cin.min = fmt(today);

    // Keep checkout after checkin
    cin?.addEventListener('change', () => {
        const cinVal = new Date(cin.value);
        const coutVal = new Date(cout.value);
        if (cout && cinVal >= coutVal) {
            const d = new Date(cinVal);
            d.setDate(d.getDate() + 7);
            cout.value = fmt(d);
        }
        if (cout) cout.min = cin.value;
    });

    // Auto-uppercase document number
    document.getElementById('r-doc-numero')?.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Remove invalid highlight on input
    document.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', () => el.classList.remove('ci-invalid'));
    });
});
