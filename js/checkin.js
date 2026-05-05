// ─────────────────────────────────────────────────────────────
//  Casa Paolina — Self Check-in Form
// ─────────────────────────────────────────────────────────────
//
//  SETUP: Replace the URL below with your Google Apps Script
//  Web App URL after deploying it (see setup instructions).
//
const SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyfmbms2JSz0uE_M4L-wtt5xTxVuV2uQTl-fZeE2HE4FdNOx37srtEqzH5wq6Y5ZXlBuA/exec';
// ─────────────────────────────────────────────────────────────

// ─── TRANSLATIONS ────────────────────────────────────────────

const CI_TRANS = {
    it: {
        page_title: 'Check-in Online — Casa Paolina, Salento',
        header_badge: 'Check-in Online',
        hero_title: 'Benvenuto!',
        hero_p: 'Completa il check-in online per rendere il tuo arrivo ancora più semplice. Il modulo richiede circa 5 minuti.',
        step1: 'Soggiorno', step2: 'Referente', step3: 'Accompagnatori', step4: 'Conferma',
        s1_title: 'Dettagli del soggiorno',
        s1_sub: 'Date di arrivo, partenza e composizione del gruppo',
        lbl_checkin: 'Data di arrivo', lbl_checkout: 'Data di partenza',
        lbl_permanenza: 'Permanenza',
        night_suffix: 'notte', nights_suffix: 'notti',
        lbl_adults: 'Adulti', lbl_children: 'Bambini', lbl_apt: 'Appartamento',
        lbl_trip_type: 'Tipo di soggiorno',
        chip_coppia: '💑 Coppia', chip_famiglia: '👨‍👩‍👧 Famiglia',
        chip_gruppo: '🎉 Gruppo amici', chip_singolo: '🧍 Singolo', chip_altro: '✨ Altro',
        lbl_ora: 'Ora di arrivo prevista',
        opt_choose: '— Scegli —', opt_no_time: '— Non so ancora —',
        ora_before_noon: 'Prima di mezzogiorno', ora_after_10pm: 'Dopo le 22:00',
        s2_title: 'Ospite referente', s2_sub: "Dati dell'intestatario della prenotazione",
        card_anagrafica: 'Dati anagrafici',
        lbl_nome: 'Nome', lbl_cognome: 'Cognome', lbl_sesso: 'Sesso',
        lbl_nascita_data: 'Data di nascita', lbl_cittadinanza: 'Cittadinanza',
        lbl_nascita_comune: 'Comune di nascita', lbl_nascita_stato: 'Stato di nascita',
        opt_sesso_m: 'Maschio', opt_sesso_f: 'Femmina',
        card_residenza: 'Residenza',
        lbl_comune: 'Comune', lbl_comune_res: 'Comune di residenza', lbl_paese: 'Stato di residenza',
        card_documento: "Documento d'identità",
        lbl_doc_tipo: 'Tipo documento', lbl_doc_numero: 'Numero documento',
        lbl_doc_emissione: 'Data emissione', lbl_doc_scadenza: 'Data scadenza',
        lbl_doc_rilascio_stato: 'Stato di rilascio',
        lbl_doc_rilascio_comune: 'Comune di rilascio',
        opt_doc_ci: "Carta d'identità", opt_doc_pass: 'Passaporto',
        opt_doc_pat: 'Patente di guida', opt_doc_perm: 'Permesso di soggiorno',
        card_contatti: 'Contatti',
        lbl_email: 'Email', lbl_telefono: 'Telefono',
        s3_title: 'Accompagnatori', s3_sub: 'Aggiungi i dati degli altri ospiti (se presenti)',
        btn_add_guest: 'Aggiungi ospite',
        btn_remove_guest: 'Rimuovi',
        hint_guests: 'Se siete solo voi due (o solo il referente), potete passare direttamente al passo successivo.',
        ospite: 'Ospite',
        s4_title: 'Riepilogo e conferma', s4_sub: 'Controlla i dati prima di inviare',
        privacy_title: 'Privacy e trattamento dati',
        privacy_text: 'I dati forniti saranno trattati esclusivamente per finalità di registrazione degli alloggiati ai sensi del D.Lgs. 30 giugno 2003 n. 196 (Codice Privacy) e del GDPR UE 2016/679. I dati non saranno ceduti a terzi né utilizzati per finalità commerciali.',
        privacy_check1: "Dichiaro di aver letto l'informativa sulla privacy e acconsento al trattamento dei dati personali per la registrazione del soggiorno.",
        privacy_check2: 'Dichiaro che i dati forniti sono veritieri e corrispondono alle generalità degli ospiti presenti.',
        lbl_note: 'Note aggiuntive (richieste speciali, allergie, orario di arrivo più preciso…)',
        btn_next: 'Avanti', btn_back: 'Indietro', btn_submit: 'Invia Check-in',
        sending: 'Invio in corso…',
        success_title: 'Check-in completato!',
        success_greeting: ', abbiamo ricevuto i tuoi dati.',
        success_p2: 'Ti aspettiamo a Casa Paolina. Per qualsiasi necessità contattaci via WhatsApp.',
        btn_whatsapp: '💬 Scrivici su WhatsApp', btn_guest_area: "Vai all'Area Ospiti",
        footer: '© 2026 Casa Paolina · Via Dante De Blasi, 15 · Uggiano la Chiesa (LE)',
        err_required: 'Compila tutti i campi obbligatori contrassegnati con *',
        err_privacy: 'Devi accettare entrambe le dichiarazioni per procedere.',
        err_send: "Si è verificato un errore durante l'invio. Riprova o contattaci via WhatsApp.",
        // Summary labels
        sum_apt: 'Appartamento', sum_arrival: 'Arrivo', sum_departure: 'Partenza',
        sum_permanenza: 'Permanenza',
        sum_guests: 'Ospiti', sum_type: 'Tipo', sum_time: 'Ora arrivo',
        sum_ref: 'Referente', sum_email: 'Email', sum_phone: 'Telefono', sum_doc: 'Documento',
        adults_suffix: 'adulti', children_suffix: 'bambini', doc_num: 'n°',
        // Default field values
        default_country: 'Italia', default_cit: 'Italiana',
    },
    en: {
        page_title: 'Online Check-in — Casa Paolina, Salento',
        header_badge: 'Online Check-in',
        hero_title: 'Welcome!',
        hero_p: 'Complete your online check-in to make your arrival as smooth as possible. The form takes about 5 minutes.',
        step1: 'Stay', step2: 'Main Guest', step3: 'Companions', step4: 'Confirm',
        s1_title: 'Stay details',
        s1_sub: 'Arrival and departure dates and group composition',
        lbl_checkin: 'Arrival date', lbl_checkout: 'Departure date',
        lbl_permanenza: 'Duration',
        night_suffix: 'night', nights_suffix: 'nights',
        lbl_adults: 'Adults', lbl_children: 'Children', lbl_apt: 'Apartment',
        lbl_trip_type: 'Type of stay',
        chip_coppia: '💑 Couple', chip_famiglia: '👨‍👩‍👧 Family',
        chip_gruppo: '🎉 Friends group', chip_singolo: '🧍 Solo', chip_altro: '✨ Other',
        lbl_ora: 'Expected arrival time',
        opt_choose: '— Choose —', opt_no_time: '— Not sure yet —',
        ora_before_noon: 'Before noon', ora_after_10pm: 'After 10pm',
        s2_title: 'Main guest', s2_sub: 'Details of the booking holder',
        card_anagrafica: 'Personal details',
        lbl_nome: 'First name', lbl_cognome: 'Last name', lbl_sesso: 'Gender',
        lbl_nascita_data: 'Date of birth', lbl_cittadinanza: 'Nationality',
        lbl_nascita_comune: 'City of birth', lbl_nascita_stato: 'Country of birth',
        opt_sesso_m: 'Male', opt_sesso_f: 'Female',
        card_residenza: 'Residence',
        lbl_comune: 'City', lbl_comune_res: 'City of residence', lbl_paese: 'Country of residence',
        card_documento: 'Identity document',
        lbl_doc_tipo: 'Document type', lbl_doc_numero: 'Document number',
        lbl_doc_emissione: 'Issue date', lbl_doc_scadenza: 'Expiry date',
        lbl_doc_rilascio_stato: 'Country of issue',
        lbl_doc_rilascio_comune: 'City of issue',
        opt_doc_ci: 'Identity Card', opt_doc_pass: 'Passport',
        opt_doc_pat: 'Driving Licence', opt_doc_perm: 'Residence Permit',
        card_contatti: 'Contact details',
        lbl_email: 'Email', lbl_telefono: 'Phone',
        s3_title: 'Companions', s3_sub: 'Add details of other guests (if any)',
        btn_add_guest: 'Add guest',
        btn_remove_guest: 'Remove',
        hint_guests: "If it's just the two of you (or just the main guest), you can skip to the next step.",
        ospite: 'Guest',
        s4_title: 'Summary and confirmation', s4_sub: 'Review your details before submitting',
        privacy_title: 'Privacy and data processing',
        privacy_text: 'The data provided will be processed exclusively for the purpose of registering guests pursuant to Italian Legislative Decree 30 June 2003 n. 196 and EU GDPR 2016/679. Data will not be shared with third parties or used for commercial purposes.',
        privacy_check1: 'I declare that I have read the privacy policy and consent to the processing of personal data for stay registration.',
        privacy_check2: 'I declare that the data provided is accurate and corresponds to the guests present.',
        lbl_note: 'Additional notes (special requests, allergies, more precise arrival time…)',
        btn_next: 'Next', btn_back: 'Back', btn_submit: 'Submit Check-in',
        sending: 'Submitting…',
        success_title: 'Check-in complete!',
        success_greeting: ', we have received your details.',
        success_p2: 'We look forward to welcoming you at Casa Paolina. For any queries contact us on WhatsApp.',
        btn_whatsapp: '💬 Message us on WhatsApp', btn_guest_area: 'Go to Guest Area',
        footer: '© 2026 Casa Paolina · Via Dante De Blasi, 15 · Uggiano la Chiesa (LE)',
        err_required: 'Please fill in all required fields marked with *',
        err_privacy: 'You must accept both declarations to proceed.',
        err_send: 'An error occurred while submitting. Please try again or contact us via WhatsApp.',
        sum_apt: 'Apartment', sum_arrival: 'Arrival', sum_departure: 'Departure',
        sum_permanenza: 'Duration',
        sum_guests: 'Guests', sum_type: 'Type', sum_time: 'Arrival time',
        sum_ref: 'Main guest', sum_email: 'Email', sum_phone: 'Phone', sum_doc: 'Document',
        adults_suffix: 'adults', children_suffix: 'children', doc_num: 'no.',
        default_country: 'Italy', default_cit: 'Italian',
    }
};

// ─── LANGUAGE ────────────────────────────────────────────────

let currentLang = 'it';

function applyLang(lang) {
    currentLang = lang;
    const t = CI_TRANS[lang];

    // Update all text-content nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
        if (t[el.dataset.i18n] !== undefined) el.textContent = t[el.dataset.i18n];
    });

    // Update default input values (only if empty or was a known default)
    const knownDefaults = {
        default_country: ['Italia', 'Italy'],
        default_cit:     ['Italiana', 'Italian']
    };
    document.querySelectorAll('[data-i18n-value]').forEach(el => {
        const key = el.dataset.i18nValue;
        const known = knownDefaults[key] || [];
        if (!el.value || known.includes(el.value)) {
            el.value = t[key] || '';
        }
    });

    // Page title
    document.title = t.page_title;

    // Language buttons
    document.querySelectorAll('.ci-lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update guest block labels already on screen
    document.querySelectorAll('.ci-guest-block [data-i18n]').forEach(el => {
        if (t[el.dataset.i18n] !== undefined) el.textContent = t[el.dataset.i18n];
    });

    // Re-render permanenza label
    ciUpdatePermanenzaDisplay();

    // Re-render summary if visible
    if (currentStep === 4) ciBuildSummary();

    localStorage.setItem('ci_lang', lang);
}

function t(key) {
    return CI_TRANS[currentLang][key] || CI_TRANS.it[key] || key;
}

// ─── STATE ───────────────────────────────────────────────────

let currentStep = 1;
let guestCount = 0;
const MAX_GUESTS = 10;

// ─── STEP NAVIGATION ────────────────────────────────────────

function ciNextStep(from) {
    if (!ciValidateStep(from)) return;
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
    let section, required;

    if (step === 3) {
        // Validate inside guest blocks only if any exist
        const guestBlocks = document.querySelectorAll('.ci-guest-block');
        if (guestBlocks.length === 0) return true;
        let ok = true;
        guestBlocks.forEach(block => {
            block.querySelectorAll('input[required], select[required]').forEach(el => {
                el.classList.remove('ci-invalid');
                if (!el.value.trim()) { el.classList.add('ci-invalid'); ok = false; }
            });
        });
        if (!ok) {
            document.querySelector('.ci-guest-block .ci-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            ciShowStepError(3, t('err_required'));
        } else {
            ciClearStepError(3);
        }
        return ok;
    }

    section = document.querySelector(`#step-${step}`);
    required = section.querySelectorAll('input[required], select[required]');
    let ok = true;

    required.forEach(el => {
        el.classList.remove('ci-invalid');
        if (!el.value.trim()) {
            el.classList.add('ci-invalid');
            ok = false;
        }
    });

    if (!ok) {
        section.querySelector('.ci-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        ciShowStepError(step, t('err_required'));
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

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#trip-type-chips .ci-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#trip-type-chips .ci-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('trip-type').value = btn.dataset.value;
        });
    });
});

// ─── PERMANENZA ──────────────────────────────────────────────

function ciComputeNights() {
    const cin = document.getElementById('checkin-date')?.value;
    const cout = document.getElementById('checkout-date')?.value;
    if (!cin || !cout) return 0;
    const ms = new Date(cout) - new Date(cin);
    return Math.max(0, Math.round(ms / 86400000));
}

function ciUpdatePermanenzaDisplay() {
    const el = document.getElementById('permanenza-display');
    if (!el) return;
    const nights = ciComputeNights();
    if (nights <= 0) { el.textContent = '—'; return; }
    const suffix = nights === 1 ? t('night_suffix') : t('nights_suffix');
    el.textContent = `${nights} ${suffix}`;
}

// ─── CITIZENSHIP CONDITIONAL COMUNI ─────────────────────────
// Comune di nascita, comune di residenza, comune di rilascio doc
// are required only for Italian citizens (comune is an Italian concept).

function ciIsItalian(val) {
    return /^italian[aoe]?$/i.test(val.trim());
}

function ciUpdateComuneVisibility(cittadinanzaInput) {
    // Scope: the closest .ci-guest-block, or #step-2 for referente
    const scope = cittadinanzaInput.closest('.ci-guest-block') || document.getElementById('step-2');
    const isItalian = ciIsItalian(cittadinanzaInput.value);

    scope.querySelectorAll('.ci-comune-field').forEach(wrap => {
        const input = wrap.querySelector('input');
        if (isItalian) {
            wrap.style.display = '';
            if (input) input.required = true;
        } else {
            wrap.style.display = 'none';
            if (input) { input.required = false; input.classList.remove('ci-invalid'); }
        }
    });
}

// ─── GUEST MANAGEMENT ───────────────────────────────────────

function ciSyncGuestsFromAdults() {
    const adults = parseInt(document.getElementById('adults-count').value) || 1;
    const needed = adults - 1;
    while (guestCount < needed && guestCount < MAX_GUESTS) ciAddGuest();
    const addBtn = document.getElementById('add-guest-btn');
    if (addBtn) addBtn.style.display = guestCount >= MAX_GUESTS ? 'none' : '';
}

function ciAddGuest() {
    if (guestCount >= MAX_GUESTS) return;
    guestCount++;
    const idx = guestCount;
    const tr = CI_TRANS[currentLang];

    const container = document.getElementById('guests-container');
    const block = document.createElement('div');
    block.className = 'ci-guest-block';
    block.id = `guest-block-${idx}`;

    block.innerHTML = `
        <div class="ci-guest-block-header">
            <h3><span data-i18n="ospite">${tr.ospite}</span> ${idx}</h3>
            <button type="button" class="ci-remove-guest" onclick="ciRemoveGuest(${idx})">✕ <span data-i18n="btn_remove_guest">${tr.btn_remove_guest}</span></button>
        </div>
        <div class="ci-card">
            <div class="ci-row ci-row--2">
                <div class="ci-field">
                    <label for="g${idx}-nome"><span data-i18n="lbl_nome">${tr.lbl_nome}</span> <span class="req">*</span></label>
                    <input type="text" id="g${idx}-nome" name="g${idx}_nome" required autocomplete="off">
                </div>
                <div class="ci-field">
                    <label for="g${idx}-cognome"><span data-i18n="lbl_cognome">${tr.lbl_cognome}</span> <span class="req">*</span></label>
                    <input type="text" id="g${idx}-cognome" name="g${idx}_cognome" required autocomplete="off">
                </div>
            </div>
            <div class="ci-row ci-row--3">
                <div class="ci-field">
                    <label for="g${idx}-sesso"><span data-i18n="lbl_sesso">${tr.lbl_sesso}</span> <span class="req">*</span></label>
                    <select id="g${idx}-sesso" name="g${idx}_sesso" required>
                        <option value="">—</option>
                        <option value="M" data-i18n="opt_sesso_m">${tr.opt_sesso_m}</option>
                        <option value="F" data-i18n="opt_sesso_f">${tr.opt_sesso_f}</option>
                    </select>
                </div>
                <div class="ci-field">
                    <label for="g${idx}-nascita"><span data-i18n="lbl_nascita_data">${tr.lbl_nascita_data}</span> <span class="req">*</span></label>
                    <input type="date" id="g${idx}-nascita" name="g${idx}_nascita" required autocomplete="off">
                </div>
                <div class="ci-field">
                    <label for="g${idx}-cittadinanza"><span data-i18n="lbl_cittadinanza">${tr.lbl_cittadinanza}</span> <span class="req">*</span></label>
                    <input type="text" id="g${idx}-cittadinanza" name="g${idx}_cittadinanza" value="${tr.default_cit}" data-i18n-value="default_cit" required autocomplete="off">
                </div>
            </div>
            <div class="ci-row ci-row--2">
                <div class="ci-field ci-comune-field">
                    <label for="g${idx}-nascita-comune"><span data-i18n="lbl_nascita_comune">${tr.lbl_nascita_comune}</span> <span class="req">*</span></label>
                    <input type="text" id="g${idx}-nascita-comune" name="g${idx}_nascita_comune" required autocomplete="off">
                </div>
                <div class="ci-field">
                    <label for="g${idx}-nascita-stato"><span data-i18n="lbl_nascita_stato">${tr.lbl_nascita_stato}</span> <span class="req">*</span></label>
                    <input type="text" id="g${idx}-nascita-stato" name="g${idx}_nascita_stato" value="${tr.default_country}" data-i18n-value="default_country" required autocomplete="off">
                </div>
            </div>
            <div class="ci-row ci-row--2">
                <div class="ci-field ci-comune-field">
                    <label for="g${idx}-comune-res"><span data-i18n="lbl_comune_res">${tr.lbl_comune_res}</span> <span class="req">*</span></label>
                    <input type="text" id="g${idx}-comune-res" name="g${idx}_comune_res" required autocomplete="off">
                </div>
                <div class="ci-field">
                    <label for="g${idx}-stato-res"><span data-i18n="lbl_paese">${tr.lbl_paese}</span> <span class="req">*</span></label>
                    <input type="text" id="g${idx}-stato-res" name="g${idx}_stato_res" value="${tr.default_country}" data-i18n-value="default_country" required autocomplete="off">
                </div>
            </div>
        </div>`;

    container.appendChild(block);

    // Remove invalid on input
    block.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => el.classList.remove('ci-invalid'));
    });

    // Citizenship listener for this guest
    const citInput = document.getElementById(`g${idx}-cittadinanza`);
    if (citInput) {
        citInput.addEventListener('input', () => ciUpdateComuneVisibility(citInput));
        ciUpdateComuneVisibility(citInput); // initialize based on default
    }

    const addBtn = document.getElementById('add-guest-btn');
    if (addBtn) addBtn.style.display = guestCount >= MAX_GUESTS ? 'none' : '';
}

function ciRemoveGuest(idx) {
    document.getElementById(`guest-block-${idx}`)?.remove();
    guestCount = document.querySelectorAll('.ci-guest-block').length;
    document.querySelectorAll('.ci-guest-block').forEach((b, i) => {
        const h3 = b.querySelector('h3');
        if (h3) {
            const ospiteSpan = h3.querySelector('[data-i18n="ospite"]');
            if (ospiteSpan) ospiteSpan.textContent = t('ospite');
            h3.childNodes.forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) node.textContent = ` ${i + 1}`;
            });
        }
    });
    const addBtn = document.getElementById('add-guest-btn');
    if (addBtn) addBtn.style.display = guestCount >= MAX_GUESTS ? 'none' : '';
}

// ─── SUMMARY BUILDER ────────────────────────────────────────

function ciBuildSummary() {
    const v = id => document.getElementById(id)?.value || '—';
    const tr = CI_TRANS[currentLang];

    const tripTypeMap = {
        coppia: tr.chip_coppia, famiglia: tr.chip_famiglia,
        gruppo_amici: tr.chip_gruppo, singolo: tr.chip_singolo, altro: tr.chip_altro
    };

    const nights = ciComputeNights();
    const nightLabel = nights === 1 ? t('night_suffix') : t('nights_suffix');

    let guestsHTML = '';
    document.querySelectorAll('.ci-guest-block').forEach((block, i) => {
        const nome = block.querySelector(`[id$="-nome"]`)?.value || '—';
        const cognome = block.querySelector(`[id$="-cognome"]`)?.value || '—';
        const nascita = block.querySelector(`[id$="-nascita"]:not([id*="comune"]):not([id*="stato"])`)?.value || '—';
        const cit = block.querySelector(`[id$="-cittadinanza"]`)?.value || '—';
        guestsHTML += `<div class="summary-guest"><strong>${tr.ospite} ${i + 1}:</strong> ${nome} ${cognome} · ${ciFormatDate(nascita)} · ${cit}</div>`;
    });

    document.getElementById('summary-card').innerHTML = `
        <h3 class="ci-card-title">📋 ${tr.s4_title}</h3>
        <div class="summary-grid">
            <div class="summary-row"><span class="summary-label">${tr.sum_apt}</span><span class="summary-value">${v('appartamento') || '—'}</span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_arrival}</span><span class="summary-value">${ciFormatDate(v('checkin-date'))}</span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_departure}</span><span class="summary-value">${ciFormatDate(v('checkout-date'))}</span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_permanenza}</span><span class="summary-value">${nights > 0 ? nights + ' ' + nightLabel : '—'}</span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_guests}</span><span class="summary-value">${v('adults-count')} ${tr.adults_suffix} · ${v('children-count')} ${tr.children_suffix}</span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_type}</span><span class="summary-value">${tripTypeMap[v('trip-type')] || v('trip-type')}</span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_time}</span><span class="summary-value">${v('ora-arrivo') || '—'}</span></div>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-grid">
            <div class="summary-row"><span class="summary-label">${tr.sum_ref}</span><span class="summary-value"><strong>${v('r-nome')} ${v('r-cognome')}</strong></span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_email}</span><span class="summary-value">${v('r-email')}</span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_phone}</span><span class="summary-value">${v('r-telefono')}</span></div>
            <div class="summary-row"><span class="summary-label">${tr.sum_doc}</span><span class="summary-value">${v('r-doc-tipo')} ${tr.doc_num} ${v('r-doc-numero')}</span></div>
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

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('checkin-form').addEventListener('submit', (e) => {
        e.preventDefault();

        const privacyOk = document.getElementById('privacy-consent').checked;
        const veritaOk = document.getElementById('verita-consent').checked;
        if (!privacyOk || !veritaOk) {
            ciShowFormError(t('err_privacy'));
            return;
        }

        const submitBtn = document.getElementById('submit-btn');
        submitBtn.disabled = true;
        submitBtn.querySelector('[data-i18n]').textContent = t('sending');

        const payload = ciCollectFormData();
        ciSubmitViaIframe(payload);
        setTimeout(() => ciShowSuccess(payload), 800);
    });
});

function ciSubmitViaIframe(payload) {
    let iframe = document.getElementById('ci-hidden-iframe');
    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'ci-hidden-iframe';
        iframe.name = 'ci-hidden-iframe';
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
    }

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
    const input = document.createElement('textarea');
    input.name = 'data';
    input.value = JSON.stringify(payload);
    form.appendChild(input);
    form.submit();
}

function ciCollectFormData() {
    const v = id => document.getElementById(id)?.value.trim() || '';

    const guests = [];
    document.querySelectorAll('.ci-guest-block').forEach((block) => {
        guests.push({
            nome:           block.querySelector(`[id$="-nome"]`)?.value.trim() || '',
            cognome:        block.querySelector(`[id$="-cognome"]`)?.value.trim() || '',
            sesso:          block.querySelector(`[id$="-sesso"]`)?.value || '',
            data_nascita:   block.querySelector(`[id$="-nascita"]:not([id*="comune"]):not([id*="stato"])`)?.value || '',
            comune_nascita: block.querySelector(`[id$="-nascita-comune"]`)?.value.trim() || '',
            stato_nascita:  block.querySelector(`[id$="-nascita-stato"]`)?.value.trim() || '',
            cittadinanza:   block.querySelector(`[id$="-cittadinanza"]`)?.value.trim() || '',
            comune_res:     block.querySelector(`[id$="-comune-res"]`)?.value.trim() || '',
            stato_res:      block.querySelector(`[id$="-stato-res"]`)?.value.trim() || ''
        });
    });

    return {
        timestamp:           new Date().toISOString(),
        permanenza_notti:    ciComputeNights(),
        appartamento:        v('appartamento'),
        checkin_date:        v('checkin-date'),
        checkout_date:       v('checkout-date'),
        adults_count:        v('adults-count'),
        children_count:      v('children-count'),
        trip_type:           v('trip-type'),
        ora_arrivo:          v('ora-arrivo'),
        r_nome:              v('r-nome'),
        r_cognome:           v('r-cognome'),
        r_sesso:             v('r-sesso'),
        r_nascita_data:      v('r-nascita-data'),
        r_nascita_comune:    v('r-nascita-comune'),
        r_nascita_stato:     v('r-nascita-stato'),
        r_cittadinanza:      v('r-cittadinanza'),
        r_comune:            v('r-comune'),
        r_paese:             v('r-paese'),
        r_doc_tipo:          v('r-doc-tipo'),
        r_doc_numero:        v('r-doc-numero'),
        r_doc_emissione:     v('r-doc-emissione'),
        r_doc_scadenza:      v('r-doc-scadenza'),
        r_doc_rilascio_stato: v('r-doc-rilascio-stato'),
        r_doc_rilascio_comune: v('r-doc-rilascio-comune'),
        r_email:             v('r-email'),
        r_telefono:          v('r-telefono'),
        guests_count:        guests.length,
        guests:              guests,
        note:                v('note')
    };
}

function ciShowSuccess(data) {
    document.getElementById('checkin-form').style.display = 'none';
    document.querySelector('.ci-steps-bar').style.display = 'none';
    const screen = document.getElementById('success-screen');
    screen.style.display = 'block';

    const tr = CI_TRANS[currentLang];
    const greeting = document.getElementById('success-greeting');
    if (greeting) greeting.innerHTML = `${currentLang === 'it' ? 'Grazie' : 'Thank you'} <strong>${data.r_nome || ''}</strong>${tr.success_greeting}`;

    const nights = data.permanenza_notti || 0;
    const nightLabel = nights === 1 ? t('night_suffix') : t('nights_suffix');
    document.getElementById('success-summary').innerHTML = `
        <div class="success-detail">
            <span>🏠 ${data.appartamento || 'Casa Paolina'}</span>
            <span>📅 ${ciFormatDate(data.checkin_date)} → ${ciFormatDate(data.checkout_date)}</span>
            <span>🌙 ${nights} ${nightLabel}</span>
            <span>👥 ${parseInt(data.adults_count || 0) + parseInt(data.children_count || 0)} ${tr.adults_suffix}</span>
        </div>`;
}

function ciShowFormError(msg) {
    const el = document.getElementById('form-error');
    el.textContent = '⚠ ' + msg;
    el.style.display = 'block';
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Detect language
    const saved = localStorage.getItem('ci_lang');
    const browser = navigator.language?.startsWith('it') ? 'it' : 'en';
    applyLang(saved || browser);

    // Default dates
    const today = new Date();
    const fmt = d => d.toISOString().split('T')[0];
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 8);
    const cin = document.getElementById('checkin-date');
    const cout = document.getElementById('checkout-date');
    if (cin && !cin.value) cin.value = fmt(tomorrow);
    if (cout && !cout.value) cout.value = fmt(nextWeek);
    if (cin) cin.min = fmt(today);

    // Permanenza init
    ciUpdatePermanenzaDisplay();

    const updateDates = () => {
        const cinVal = new Date(cin.value);
        const coutVal = new Date(cout.value);
        if (cout && cinVal >= coutVal) {
            const d = new Date(cinVal); d.setDate(d.getDate() + 7);
            cout.value = fmt(d);
        }
        if (cout) cout.min = cin.value;
        ciUpdatePermanenzaDisplay();
    };

    cin?.addEventListener('change', updateDates);
    cout?.addEventListener('change', ciUpdatePermanenzaDisplay);

    // Citizenship conditional comuni for referente
    const rCit = document.getElementById('r-cittadinanza');
    if (rCit) {
        rCit.addEventListener('input', () => ciUpdateComuneVisibility(rCit));
        ciUpdateComuneVisibility(rCit); // init with default "Italiana"
    }

    // Auto-uppercase document number
    document.getElementById('r-doc-numero')?.addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });

    // Remove invalid highlight on input
    document.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', () => el.classList.remove('ci-invalid'));
    });
});
