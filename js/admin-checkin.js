// ─────────────────────────────────────────────────────────────
//  Casa Paolina — Admin Check-in Dashboard
// ─────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = '__ADMIN_CHECKIN__';
const SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2kYpdep7maP8j8biDP7TZfIp23RuNo1qCfqCMLTuvY1fyuqleHECcjXJdJZmNbP-2-Q/exec';

// ─── DATI STRUTTURA (per PDF conferma) ───────────────────────
const CASA_PAOLINA = {
    nome:     'Casa Paolina',
    cin:      'IT075091C200081350',
    indirizzo:'Via Dante De Blasi, 15 · 73020 Uggiano la Chiesa (LE)',
    telefono: '+39 320 808 6738',
    email:    'casapaolina23@gmail.com',
    website:  'https://casapaolina.netlify.app/',
    logo:     'images/favicon-180.png',
    iban:     'IT25U0357601601010006013412',
    iban_intestatario: 'Salvatore Stefano',
    bonifico_giorni:   3,
};

// ─── STATE ───────────────────────────────────────────────────

let allBookings  = [];
let currentApt   = 'all';

// ─── AUTH ────────────────────────────────────────────────────

function adminLogin() {
    const pwd = document.getElementById('admin-pwd').value;
    const err = document.getElementById('admin-error');
    if (pwd === ADMIN_PASSWORD) {
        err.style.display = 'none';
        sessionStorage.setItem('adminLoggedIn', 'true');
        showPanel();
    } else {
        err.style.display = 'block';
        document.getElementById('admin-pwd').value = '';
        document.getElementById('admin-pwd').focus();
    }
}

function showPanel() {
    document.getElementById('admin-gate').style.display  = 'none';
    document.getElementById('admin-panel').style.display = 'block';
    switchTab('checkin');  // carica il tab default
}

// ─── TABS ────────────────────────────────────────────────────

function switchTab(tab) {
    const tabs    = ['checkin', 'schedine'];
    const btnIds  = { checkin: 'tab-btn-checkin', schedine: 'tab-btn-schedine' };
    const panelIds = { checkin: 'tab-panel-checkin', schedine: 'tab-panel-schedine' };

    tabs.forEach(t => {
        const btn   = document.getElementById(btnIds[t]);
        const panel = document.getElementById(panelIds[t]);
        if (btn)   btn.classList.toggle('tab-btn--active', t === tab);
        if (panel) panel.style.display = t === tab ? 'block' : 'none';
    });

    if (tab === 'checkin'  && !document.getElementById('bookings-list').children.length) loadBookings();
    if (tab === 'schedine' && !document.getElementById('schedine-list').children.length)  loadSchedine();
}

// ─── LOAD BOOKINGS ───────────────────────────────────────────

function loadBookings() {
    const list    = document.getElementById('bookings-list');
    const loading = document.getElementById('bookings-loading');
    const error   = document.getElementById('bookings-error');

    list.innerHTML    = '';
    error.style.display   = 'none';
    loading.style.display = 'block';

    fetch(SHEETS_SCRIPT_URL + '?action=bookings')
        .then(r => r.json())
        .then(json => {
            loading.style.display = 'none';
            if (!json.bookings) throw new Error('No bookings key in response');
            allBookings = json.bookings;
            renderBookings(currentApt);
        })
        .catch(() => {
            loading.style.display = 'none';
            error.style.display   = 'block';
        });
}

// ─── SYNC CALENDAR + RELOAD ──────────────────────────────────
//  Pulsante "Aggiorna": legge i calendari (15, 15A, 17), inserisce
//  nel foglio Booking le nuove prenotazioni e ricarica la lista.

function syncCalendar(btn) {
    const original = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Sincronizzo…'; }

    fetch(SHEETS_SCRIPT_URL + '?action=sync-calendar')
        .then(r => r.json())
        .then(json => {
            if (json.status !== 'ok') throw new Error(json.error || 'Errore sync');
            const ins = (json.inserted || []).length;
            const upd = (json.updated || []).length;
            const canc = (json.cancelled || []).length;
            const skip = (json.skipped || []).length;
            const err = (json.errors || []).length;
            const missing = json.calendarsMissing || [];
            let msg = `✓ ${ins} nuove · ${upd} aggiornate · ${canc} cancellate · ${skip} invariate`;
            if (err) msg += ` · ${err} con errori`;
            if (missing.length) msg += ` · calendari non trovati: ${missing.join(', ')}`;
            showSyncToast(msg, err || missing.length ? 'warn' : 'ok');
        })
        .catch(e => {
            showSyncToast('Errore sincronizzazione: ' + e.message, 'err');
        })
        .finally(() => {
            if (btn) { btn.disabled = false; btn.innerHTML = original; }
            loadBookings();
        });
}

function showSyncToast(message, type) {
    let toast = document.getElementById('sync-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'sync-toast';
        toast.style.cssText =
            'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;' +
            'padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;color:#fff;' +
            'box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90vw;text-align:center;';
        document.body.appendChild(toast);
    }
    const colors = { ok: '#15803d', warn: '#b45309', err: '#dc2626' };
    toast.style.background = colors[type] || colors.ok;
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.transition = 'opacity .5s'; toast.style.opacity = '0'; }, 5000);
}

// ─── FILTER ──────────────────────────────────────────────────

function filterApt(btn, apt) {
    currentApt = apt;
    document.querySelectorAll('.ci-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderBookings(apt);
}

// ─── RENDER ──────────────────────────────────────────────────

const APT_COLORS = {
    'Verde':   { bg: '#dcfce7', color: '#166534' },
    'Celeste': { bg: '#e0f2fe', color: '#075985' },
    'Suite':   { bg: '#fef9c3', color: '#854d0e' },
};

function bookingStatus(checkin, checkout) {
    const today = new Date(); today.setHours(0,0,0,0);
    const cin   = new Date(checkin);  cin.setHours(0,0,0,0);
    const cout  = new Date(checkout); cout.setHours(0,0,0,0);
    if (cin <= today && today < cout) return 'oggi';
    if (cin > today)                  return 'pros';
    return 'pass';
}

const STATUS_LABELS = { oggi: 'In corso', pros: 'Prossima', pass: 'Passata' };

function renderBookings(aptFilter) {
    const list = document.getElementById('bookings-list');
    list.innerHTML = '';

    const filtered = aptFilter === 'all'
        ? allBookings
        : allBookings.filter(b => (b.appartamento || '').toLowerCase() === aptFilter.toLowerCase());

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="adm-empty">
                <div class="adm-empty-icon">📋</div>
                <p>Nessuna prenotazione trovata.</p>
            </div>`;
        return;
    }

    // Sort: oggi first, then pros ascending, then pass descending
    const order = { oggi: 0, pros: 1, pass: 2 };
    const sorted = [...filtered].sort((a, b) => {
        const sa = bookingStatus(a.checkin, a.checkout);
        const sb = bookingStatus(b.checkin, b.checkout);
        if (order[sa] !== order[sb]) return order[sa] - order[sb];
        return new Date(a.checkin) - new Date(b.checkin);
    });

    sorted.forEach((booking, idx) => {
        const status  = bookingStatus(booking.checkin, booking.checkout);
        const nights  = Math.max(0, Math.round(
            (new Date(booking.checkout) - new Date(booking.checkin)) / 86400000
        ));
        const aptKey  = Object.keys(APT_COLORS).find(
            k => (booking.appartamento || '').toLowerCase().includes(k.toLowerCase())
        );
        const aptStyle = aptKey
            ? `background:${APT_COLORS[aptKey].bg};color:${APT_COLORS[aptKey].color};`
            : 'background:#f1f5f9;color:#475569;';

        const originalIdx = allBookings.indexOf(booking);

        const guestName = [booking.nome, booking.cognome].filter(Boolean).join(' ') || booking.ospite || '—';
        const ospitiLabel = booking.adults_count ? ` · ${booking.adults_count} ospiti` : '';
        const checkinDoneBadge = booking.checkin_done ? '<span class="adm-status" style="background:#dbeafe;color:#1e40af;margin-left:6px">✓ Check-in già fatto</span>' : '';
        const oraArrivoLabel = booking.checkin_done
            ? `<span class="adm-status" style="background:#fef3c7;color:#92400e;margin-left:6px">🕒 ${booking.ora_arrivo ? 'Orario arrivo ' + booking.ora_arrivo : 'Nessun orario di arrivo specificato'}</span>`
            : '';
        
        let buttonHTML = '';
        if (booking.checkin_done) {
            buttonHTML = `<button class="ci-btn ci-btn--next" style="white-space:nowrap;padding:10px 20px;font-size:0.88rem">Visualizza ›</button>`;
        } else if (status !== 'pass') {
            buttonHTML = `<button class="ci-btn ci-btn--next" style="white-space:nowrap;padding:10px 20px;font-size:0.88rem" onclick="avviaCheckin(${originalIdx})">Avvia Check-in ›</button>`;
        }

        const piattaforma = (booking.piattaforma || '').toLowerCase();
        const isExternalPlatform = piattaforma === 'booking' || piattaforma === 'airbnb';
        const confermaBtn = (status !== 'pass' && !isExternalPlatform)
            ? `<button class="ci-btn ci-btn--conferma" style="white-space:nowrap;padding:10px 18px;font-size:0.88rem" onclick="openConfermaForm(${originalIdx})">📄 Genera conferma</button>`
            : '';

        const card = document.createElement('div');
        card.className = 'ci-card';
        card.style.marginBottom = '14px';
        
        // Store reference to click handler on the button
        const html = `
            <div class="adm-booking-row">
                <div class="adm-booking-meta">
                    <span class="adm-apt-badge" style="${aptStyle}">${booking.appartamento || 'N/D'}</span>
                    <span class="adm-status adm-status--${status}">${STATUS_LABELS[status]}</span>
                    ${checkinDoneBadge}
                    ${oraArrivoLabel}
                    <div class="adm-booking-name">${guestName}</div>
                    <div class="adm-booking-dates">
                        ${formatAdminDate(booking.checkin)} → ${formatAdminDate(booking.checkout)}
                        &nbsp;·&nbsp; ${nights} ${nights === 1 ? 'notte' : 'notti'}${ospitiLabel}
                    </div>
                </div>
                <div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
                        ${buttonHTML}
                        ${confermaBtn}
                    </div>
                </div>
            </div>`;
        
        card.innerHTML = html;

        // Add click handler for Visualizza button if needed
        if (booking.checkin_done) {
            const button = card.querySelector('.ci-btn--next');
            if (button) button.onclick = () => viewCheckinDetails(booking.nome, booking.cognome);
        }
        
        list.appendChild(card);
    });
}

// ─── HANDOFF ─────────────────────────────────────────────────

function avviaCheckin(idx) {
    const booking = allBookings[idx];
    if (!booking) return;

    // Nome/Cognome come colonne separate; fallback a split di ospite
    let nome    = booking.nome    || '';
    let cognome = booking.cognome || '';
    if (!nome && !cognome && booking.ospite) {
        const parts = booking.ospite.trim().split(/\s+/);
        nome    = parts[0] || '';
        cognome = parts.slice(1).join(' ') || '';
    }

    const preFill = {
        checkin_date:  booking.checkin  || '',
        checkout_date: booking.checkout || '',
        appartamento:  booking.appartamento || '',
        r_nome:        nome,
        r_cognome:     cognome,
        adults_count:  booking.adults_count || '',
    };

    sessionStorage.setItem('ciAdminPreFill', JSON.stringify(preFill));
    window.location.href = 'checkin.html';
}

// ─── HELPERS ─────────────────────────────────────────────────

function formatAdminDate(str) {
    if (!str) return '—';
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    return str;
}

// ─── DETAILS MODAL ───────────────────────────────────────

function formatDateIT(dateStr) {
    if (!dateStr) return '-';
    const s = String(dateStr);
    // Handles YYYY-MM-DD, YYYY-MM-DDTHH:MM:SS.xxxZ (ISO datetime from GAS)
    const parts = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (parts) return `${parts[3]}/${parts[2]}/${parts[1]}`;
    return s;
}

function viewCheckinDetails(nome, cognome) {
    const modal = document.getElementById('details-modal');
    const content = document.getElementById('details-content');
    
    content.innerHTML = '<p style="text-align:center;color:var(--text-light)">⏳ Caricamento...</p>';
    modal.style.display = 'block';
    
    const url = SHEETS_SCRIPT_URL + '?action=checkin-details&nome=' + encodeURIComponent(nome) + '&cognome=' + encodeURIComponent(cognome);
    
    fetch(url)
        .then(r => r.json())
        .then(json => {
            if (json.status === 'ok' && json.details) {
                const d = json.details;
                
                const nAcc = parseInt(d.n_accompagnatori) || 0;
                let guestsHtml = '';
                if (nAcc > 0) {
                    const guestList = (d.guests && d.guests.length > 0) ? d.guests : [];
                    let guestCards = '';

                    if (guestList.length > 0) {
                        guestList.forEach((guest, idx) => {
                            guestCards += `
                                <div style="background:#f8f9fa;padding:10px 12px;border-radius:6px;font-size:0.85rem;line-height:1.6">
                                    <div style="font-weight:600;margin-bottom:4px">${idx + 1}. ${guest.nome || ''} ${guest.cognome || ''}</div>
                                    <div style="color:#555">
                                        <span style="margin-right:12px"><strong>Sesso:</strong> ${guest.sesso || '-'}</span>
                                        <span><strong>Nato/a il:</strong> ${formatDateIT(guest.data_nascita)} a ${guest.comune_nascita || '-'} (${guest.stato_nascita || '-'})</span>
                                    </div>
                                    <div style="color:#555">
                                        <span style="margin-right:12px"><strong>Cittadinanza:</strong> ${guest.cittadinanza || '-'}</span>
                                        <span><strong>Residenza:</strong> ${guest.comune_res || '-'} (${guest.stato_res || '-'})</span>
                                    </div>
                                </div>
                            `;
                        });
                    } else {
                        guestCards = `<p style="color:#999;font-size:0.85rem;margin:0">${nAcc} accompagnator${nAcc === 1 ? 'e registrato' : 'i registrati'} — dettagli non ancora disponibili nel foglio Ospiti.</p>`;
                    }

                    guestsHtml = `
                        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #e5e7eb">
                            <p style="color:var(--text-light);margin:0 0 12px;font-size:0.8rem;font-weight:600;text-transform:uppercase">Accompagnatori (${nAcc})</p>
                            <div style="display:flex;flex-direction:column;gap:10px">${guestCards}</div>
                        </div>
                    `;
                }

                const html = `
                    <p style="color:var(--text-light);font-size:0.8rem;margin:0 0 16px">Check-in ricevuto il ${formatDateIT(d.data_ricezione)}</p>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:0.9rem;margin-bottom:16px">
                        <div>
                            <p style="color:var(--text-light);margin:0 0 4px;font-size:0.8rem;font-weight:600;text-transform:uppercase">Soggiorno</p>
                            <p style="margin:0;border-bottom:1px solid #e5e7eb;padding-bottom:12px;line-height:1.6">
                                <strong>Appartamento:</strong> ${d.appartamento || '-'}<br>
                                <strong>Arrivo:</strong> ${formatDateIT(d.data_arrivo)} ore ${d.ora_arrivo || '-'}<br>
                                <strong>Partenza:</strong> ${formatDateIT(d.data_partenza)}<br>
                                <strong>Notti:</strong> ${d.notti || '-'}<br>
                                <strong>Ospiti:</strong> ${d.totale_ospiti || '-'} (${d.adulti || '0'} adulti, ${d.bambini || '0'} bambini)<br>
                                <strong>Tipo:</strong> ${d.tipo_soggiorno || '-'}
                            </p>
                        </div>
                        <div>
                            <p style="color:var(--text-light);margin:0 0 4px;font-size:0.8rem;font-weight:600;text-transform:uppercase">Contatti</p>
                            <p style="margin:0;border-bottom:1px solid #e5e7eb;padding-bottom:12px;line-height:1.6">
                                <strong>Email:</strong> <a href="mailto:${d.email}" style="color:#2c7873">${d.email || '-'}</a><br>
                                <strong>Telefono:</strong> <a href="tel:${d.telefono}" style="color:#2c7873">${d.telefono || '-'}</a>
                            </p>
                        </div>
                    </div>
                    <div style="padding-top:16px;border-top:1px solid #e5e7eb">
                        <p style="color:var(--text-light);margin:0 0 8px;font-size:0.8rem;font-weight:600;text-transform:uppercase">Referente</p>
                        <p style="margin:0;line-height:1.6;font-size:0.9rem">
                            <strong>Nome:</strong> ${d.nome || '-'} ${d.cognome || '-'}<br>
                            <strong>Sesso:</strong> ${d.sesso || '-'}<br>
                            <strong>Data nascita:</strong> ${formatDateIT(d.data_nascita)} a ${d.comune_nascita || '-'} (${d.stato_nascita || '-'})<br>
                            <strong>Cittadinanza:</strong> ${d.cittadinanza || '-'}<br>
                            <strong>Residenza:</strong> ${d.comune_residenza || '-'} (${d.paese_residenza || '-'})<br>
                            <strong>Documento:</strong> ${d.tipo_documento || '-'} n. ${d.numero_documento || '-'}<br>
                            <strong style="color:#666">Rilasciato:</strong> ${d.comune_rilascio || '-'} (${d.stato_rilascio || '-'})
                        </p>
                    </div>
                    ${guestsHtml}
                    ${d.note ? '<div style="margin-top:16px;padding:12px;background:#fff9e6;border-left:4px solid #f4a261;border-radius:4px;font-size:0.9rem"><strong style="color:#d97706">Note:</strong> ' + d.note + '</div>' : ''}
                `;
                content.innerHTML = html;
            } else {
                content.innerHTML = '<p style="color:#ef4444">Errore nel caricamento dei dettagli</p>';
            }
        })
        .catch(err => {
            content.innerHTML = '<p style="color:#ef4444">Errore nella richiesta</p>';
        });
}

function closeDetailsModal() {
    document.getElementById('details-modal').style.display = 'none';
}

// ─── GENERA CONFERMA (PDF) ───────────────────────────────────

let confermaBookingIdx = null;

function openConfermaForm(idx) {
    const booking = allBookings[idx];
    if (!booking) return;
    confermaBookingIdx = idx;

    const guestName = [booking.nome, booking.cognome].filter(Boolean).join(' ') || booking.ospite || 'Ospite';
    document.getElementById('conferma-guest').textContent =
        `${guestName} · ${booking.appartamento || ''} · ${formatAdminDate(booking.checkin)} → ${formatAdminDate(booking.checkout)}`;

    const totale  = document.getElementById('conf-totale');
    const acconto = document.getElementById('conf-acconto');
    totale.value  = '';
    acconto.value = '';
    document.getElementById('conferma-error').style.display = 'none';
    updateRestante();

    totale.oninput  = updateRestante;
    acconto.oninput = updateRestante;

    document.getElementById('conferma-modal').style.display = 'block';
    setTimeout(() => totale.focus(), 50);
}

function closeConfermaModal() {
    document.getElementById('conferma-modal').style.display = 'none';
    confermaBookingIdx = null;
}

function updateRestante() {
    const totale  = parseFloat(document.getElementById('conf-totale').value);
    const acconto = parseFloat(document.getElementById('conf-acconto').value);
    const el = document.getElementById('conf-restante');
    if (!isNaN(totale) && !isNaN(acconto) && acconto <= totale) {
        el.textContent = `Saldo restante all'arrivo: € ${formatEuro(totale - acconto)}`;
    } else {
        el.textContent = '';
    }
}

function formatEuro(n) {
    return Number(n).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function loadImageDataURL(src) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width  = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext('2d').drawImage(img, 0, 0);
                resolve({ dataUrl: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
            } catch (e) { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

async function generateConfermaPdf() {
    const booking = allBookings[confermaBookingIdx];
    if (!booking) return;

    const totale  = parseFloat(document.getElementById('conf-totale').value);
    const acconto = parseFloat(document.getElementById('conf-acconto').value);
    const errBox  = document.getElementById('conferma-error');

    if (isNaN(totale) || isNaN(acconto) || totale < 0 || acconto < 0 || acconto > totale) {
        errBox.style.display = 'block';
        return;
    }
    errBox.style.display = 'none';

    if (!window.jspdf || !window.jspdf.jsPDF) {
        alert('Libreria PDF non caricata. Riprova tra qualche secondo.');
        return;
    }

    const restante = totale - acconto;
    const lang = (document.getElementById('conf-lingua') || {}).value === 'en' ? 'en' : 'it';
    const guestName = [booking.nome, booking.cognome].filter(Boolean).join(' ') || booking.ospite || (lang === 'en' ? 'Guest' : 'Ospite');
    const nights = Math.max(0, Math.round(
        (new Date(booking.checkout) - new Date(booking.checkin)) / 86400000
    ));
    const ospiti = booking.adults_count || '—';

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + CASA_PAOLINA.bonifico_giorni);
    const deadlineStr = formatAdminDate(deadline.toISOString().slice(0, 10));

    // ── Testi bilingue (IT / EN) ──
    const T = {
        it: {
            subtitle:   'Casa vacanze · Salento, Puglia',
            tel:        'Tel / WhatsApp: ',
            email:      '    Email: ',
            title:      'Conferma di Prenotazione',
            greeting:   'Gentile ' + guestName + ',',
            intro:      'confermiamo la Sua prenotazione presso Casa Paolina. Di seguito i dettagli del soggiorno.',
            rApart:     'Appartamento',
            rCheckin:   'Check-in',
            rCheckout:  'Check-out',
            rNights:    'Numero di notti',
            rGuests:    'Numero di ospiti',
            costTitle:  'Riepilogo costi',
            costTotal:  'Costo totale del soggiorno:',
            acconto:    'Acconto:',
            accNote:    'Da versare tramite bonifico bancario entro il ' + deadlineStr + '.',
            ibanLabel:  'IBAN:',
            holder:     'Intestatario: ' + CASA_PAOLINA.iban_intestatario,
            restante:   'Saldo restante:',
            resNote:    'Da pagare possibilmente in contanti all\u2019arrivo in struttura.',
            closing:    'La ringraziamo per aver scelto Casa Paolina. Le auguriamo un buon soggiorno!',
        },
        en: {
            subtitle:   'Holiday home · Salento, Apulia',
            tel:        'Phone / WhatsApp: ',
            email:      '    Email: ',
            title:      'Booking Confirmation',
            greeting:   'Dear ' + guestName + ',',
            intro:      'we are pleased to confirm your booking at Casa Paolina. Please find the details of your stay below.',
            rApart:     'Apartment',
            rCheckin:   'Check-in',
            rCheckout:  'Check-out',
            rNights:    'Number of nights',
            rGuests:    'Number of guests',
            costTitle:  'Cost summary',
            costTotal:  'Total cost of stay:',
            acconto:    'Deposit:',
            accNote:    'To be paid by bank transfer within ' + deadlineStr + '.',
            ibanLabel:  'IBAN:',
            holder:     'Account holder: ' + CASA_PAOLINA.iban_intestatario,
            restante:   'Balance due:',
            resNote:    'Preferably to be paid in cash upon arrival at the property.',
            closing:    'Thank you for choosing Casa Paolina. We wish you a pleasant stay!',
        }
    };
    const t = T[lang];

    const logo = await loadImageDataURL(CASA_PAOLINA.logo);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 18;
    const contentW = pageW - margin * 2;
    const teal = [44, 120, 115];
    const dark = [38, 70, 73];
    const gray = [110, 110, 110];

    // ── Header band ──
    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.rect(0, 0, pageW, 34, 'F');

    if (logo) {
        const logoSize = 20;
        doc.addImage(logo.dataUrl, 'PNG', margin, 7, logoSize, logoSize);
    }
    const textX = logo ? margin + 26 : margin;
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text(CASA_PAOLINA.nome, textX, 17);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(t.subtitle, textX, 24);
    doc.text('CIN ' + CASA_PAOLINA.cin, textX, 29);

    // ── Struttura info row ──
    let y = 42;
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(8.5);
    doc.text(CASA_PAOLINA.indirizzo, margin, y);
    y += 4.5;
    doc.text(t.tel + CASA_PAOLINA.telefono + t.email + CASA_PAOLINA.email, margin, y);

    // ── Title ──
    y += 12;
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(t.title, margin, y);
    doc.setDrawColor(teal[0], teal[1], teal[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, y + 2.5, margin + contentW, y + 2.5);

    // ── Body intro ──
    y += 12;
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(t.greeting, margin, y);
    y += 7;
    const intro = doc.splitTextToSize(t.intro, contentW);
    doc.text(intro, margin, y);
    y += intro.length * 5.5 + 4;

    // ── Dettagli box ──
    const rows = [
        [t.rApart,    booking.appartamento || '—'],
        [t.rCheckin,  formatAdminDate(booking.checkin)],
        [t.rCheckout, formatAdminDate(booking.checkout)],
        [t.rNights,   String(nights)],
        [t.rGuests,   String(ospiti)],
    ];
    const rowH = 9;
    const boxH = rows.length * rowH;
    doc.setDrawColor(225, 225, 225);
    doc.setLineWidth(0.3);
    doc.setFillColor(247, 250, 249);
    doc.rect(margin, y, contentW, boxH, 'F');
    rows.forEach((r, i) => {
        const ry = y + i * rowH;
        if (i > 0) doc.line(margin, ry, margin + contentW, ry);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.text(r[0], margin + 5, ry + 6);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.text(r[1], margin + contentW - 5, ry + 6, { align: 'right' });
    });
    doc.setDrawColor(225, 225, 225);
    doc.rect(margin, y, contentW, boxH, 'S');
    y += boxH + 12;

    // ── Costi ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(t.costTitle, margin, y);
    y += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text(t.costTotal, margin, y);
    doc.text('\u20AC ' + formatEuro(totale), margin + contentW, y, { align: 'right' });
    y += 9;

    // Acconto block
    doc.setDrawColor(225, 225, 225);
    doc.line(margin, y - 3, margin + contentW, y - 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(t.acconto, margin, y + 2);
    doc.text('\u20AC ' + formatEuro(acconto), margin + contentW, y + 2, { align: 'right' });
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    const accNote = doc.splitTextToSize(t.accNote, contentW);
    doc.text(accNote, margin, y + 2);
    y += accNote.length * 4.8 + 3;
    // IBAN in evidenza (piu' grande)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(t.ibanLabel + ' ' + CASA_PAOLINA.iban, margin, y + 3);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(t.holder, margin, y + 2);
    y += 8;

    // Restante block
    doc.setDrawColor(225, 225, 225);
    doc.line(margin, y - 3, margin + contentW, y - 3);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(40, 40, 40);
    doc.text(t.restante, margin, y + 2);
    doc.text('\u20AC ' + formatEuro(restante), margin + contentW, y + 2, { align: 'right' });
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(t.resNote, margin, y + 2);
    y += 14;

    // ── Closing ──
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.text(t.closing, margin, y);

    // ── Footer ──
    const footY = 285;
    doc.setDrawColor(teal[0], teal[1], teal[2]);
    doc.setLineWidth(0.5);
    doc.line(margin, footY - 6, margin + contentW, footY - 6);
    doc.setFontSize(9);
    doc.setTextColor(teal[0], teal[1], teal[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(CASA_PAOLINA.website, margin, footY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(t.tel + CASA_PAOLINA.telefono, margin + contentW, footY, { align: 'right' });

    const safeName = guestName.replace(/[^a-z0-9]+/gi, '_');
    doc.save('Conferma_Casa_Paolina_' + safeName + '_' + lang + '.pdf');

    closeConfermaModal();
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('details-modal');
    if (e.target === modal) {
        closeDetailsModal();
    }
    const conf = document.getElementById('conferma-modal');
    if (e.target === conf) {
        closeConfermaModal();
    }
    const sched = document.getElementById('schedina-modal');
    if (e.target === sched) {
        closeSchedinModal();
    }
});


// ════════════════════════════════════════════════════════════════
//  SCHEDINE ALLOGGIATI WEB — Polizia di Stato
// ════════════════════════════════════════════════════════════════

let currentSchedina = null;  // dati dell'anteprima attiva

// ─── CARICA SCHEDINE ─────────────────────────────────────────

function loadSchedine() {
    const list    = document.getElementById('schedine-list');
    const loading = document.getElementById('schedine-loading');
    const errEl   = document.getElementById('schedine-error');

    list.innerHTML    = '';
    errEl.style.display   = 'none';
    loading.style.display = 'block';

    fetch(SHEETS_SCRIPT_URL + '?action=alloggiati-due')
        .then(r => r.json())
        .then(json => {
            loading.style.display = 'none';
            if (json.status !== 'ok') throw new Error(json.error || 'Errore caricamento');
            renderSchedine(json.due || []);
        })
        .catch(err => {
            loading.style.display = 'none';
            errEl.style.display   = 'block';
            errEl.textContent     = '⚠ ' + (err.message || 'Errore caricamento schedine');
        });
}

// ─── RENDER ──────────────────────────────────────────────────

function renderSchedine(items) {
    const list = document.getElementById('schedine-list');
    list.innerHTML = '';

    if (items.length === 0) {
        list.innerHTML = `
            <div class="adm-empty">
                <div style="font-size:2rem;margin-bottom:8px">✅</div>
                <p style="margin:0;font-size:0.88rem">Nessuna schedina in attesa di invio.</p>
            </div>`;
        return;
    }

    // Separa le già inviate da quelle pendenti
    const pending = items.filter(x => !x.already_sent);
    const sent    = items.filter(x =>  x.already_sent);

    if (pending.length === 0 && sent.length === 0) {
        list.innerHTML = `<div class="adm-empty"><p>Nessuna prenotazione.</p></div>`;
        return;
    }

    if (pending.length > 0) {
        const header = document.createElement('p');
        header.style.cssText = 'font-size:0.8rem;font-weight:700;color:#b45309;text-transform:uppercase;margin:0 0 10px;letter-spacing:0.04em';
        header.textContent = `⏳ Da inviare (${pending.length})`;
        list.appendChild(header);
        pending.forEach(item => list.appendChild(createSchedinCard(item, false)));
    }

    if (sent.length > 0) {
        const header = document.createElement('p');
        header.style.cssText = 'font-size:0.8rem;font-weight:700;color:#15803d;text-transform:uppercase;margin:16px 0 10px;letter-spacing:0.04em';
        header.textContent = `✅ Già inviate (${sent.length})`;
        list.appendChild(header);
        sent.forEach(item => list.appendChild(createSchedinCard(item, true)));
    }
}

function createSchedinCard(item, alreadySent) {
    const card = document.createElement('div');
    card.className = 'ci-card';
    card.style.marginBottom = '10px';

    const notti = item.notti || '?';
    const guests = (item.adulti || 0) + (item.bambini || 0);
    const guestsLabel = guests ? ` · ${guests} ospiti` : '';
    const accLabel = item.n_acc > 0
        ? ` · ${item.n_acc} accompagnator${item.n_acc === 1 ? 'e' : 'i'}`
        : '';

    const badge = alreadySent
        ? `<span class="adm-status" style="background:#dcfce7;color:#15803d">✅ Inviata</span>`
        : `<span class="adm-status" style="background:#fef3c7;color:#92400e">⏳ Da inviare</span>`;

    const btnHtml = alreadySent
        ? `<button class="ci-btn" style="background:#f1f5f9;color:var(--text-dark);border:none;padding:8px 16px;font-size:0.83rem;white-space:nowrap"
                   onclick="previewSchedina('${escAttr(item.key)}')">🔍 Rivedi</button>`
        : `<button class="ci-btn ci-btn--next" style="padding:8px 18px;font-size:0.85rem;white-space:nowrap;background:#1e3a5f"
                   onclick="previewSchedina('${escAttr(item.key)}')">🚔 Anteprima &amp; Invia</button>`;

    card.innerHTML = `
        <div class="adm-booking-row">
            <div class="adm-booking-meta">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                    <span class="adm-apt-badge" style="background:#e0f2fe;color:#075985">${escHtml(item.appartamento)}</span>
                    ${badge}
                </div>
                <div class="adm-booking-name">${escHtml(item.cognome)} ${escHtml(item.nome)}</div>
                <div class="adm-booking-dates">
                    Arrivo ${formatAdminDate(item.data_arrivo)} · ${notti} nott${notti === 1 ? 'e' : 'i'}${guestsLabel}${accLabel}
                </div>
            </div>
            <div>${btnHtml}</div>
        </div>`;
    return card;
}

// ─── ANTEPRIMA ────────────────────────────────────────────────

function previewSchedina(key) {
    currentSchedina = null;
    const modal    = document.getElementById('schedina-modal');
    const preText  = document.getElementById('schedina-preview-text');
    const guestDiv = document.getElementById('schedina-guest-info');
    const warnDiv  = document.getElementById('schedina-warnings');
    const errEl    = document.getElementById('schedina-send-error');
    const btn      = document.getElementById('btn-send-schedina');
    const subtitle = document.getElementById('schedina-modal-subtitle');

    preText.textContent  = '⏳ Caricamento…';
    guestDiv.innerHTML   = '';
    warnDiv.style.display = 'none';
    warnDiv.innerHTML    = '';
    errEl.style.display  = 'none';
    btn.disabled         = true;   // rimane disabilitato fino ad abilitazione manuale
    btn.textContent      = '🚔 Invia alla Questura';
    const validateResult = document.getElementById('schedina-validate-result');
    if (validateResult) { validateResult.style.display = 'none'; validateResult.innerHTML = ''; }
    const btnValidate = document.getElementById('btn-validate-schedina');
    if (btnValidate) { btnValidate.disabled = false; btnValidate.textContent = '🔍 Verifica formato'; }
    modal.style.display  = 'block';

    const url = SHEETS_SCRIPT_URL + '?action=alloggiati-preview&key=' + encodeURIComponent(key);
    fetch(url)
        .then(r => r.json())
        .then(json => {
            if (json.status !== 'ok') throw new Error(json.error || 'Errore preview');
            currentSchedina = json.data;
            const d = json.data;

            subtitle.textContent = `${d.appartamento} · Arrivo ${formatAdminDate(d.data_arrivo)}`;

            const notti  = d.notti || '?';
            const guests = (d.adulti || 0) + (d.bambini || 0);
            const accNr  = d.n_acc || 0;
            const accHtml = d.guests && d.guests.length > 0
                ? d.guests.map(g => `<span style="display:block;margin-left:12px;color:#555">↳ ${escHtml(g.cognome)} ${escHtml(g.nome)} · ${escHtml(g.cittadinanza || '-')}</span>`).join('')
                : (accNr > 0 ? `<span style="display:block;margin-left:12px;color:#999">(${accNr} accompagnator${accNr===1?'e':'i'} — dati non disponibili nel foglio Ospiti)</span>` : '');

            guestDiv.innerHTML = `
                <div style="font-weight:600;margin-bottom:6px;color:var(--text-dark);font-size:0.95rem">
                    ${escHtml(d.cognome)} ${escHtml(d.nome)}
                </div>
                <div style="color:#555;font-size:0.85rem;line-height:1.7">
                    <span style="margin-right:14px"><strong>Nascita:</strong> ${formatDateIT(d.data_nascita)} · ${escHtml(d.comune_nascita || '-')} (${escHtml(d.stato_nascita || '-')})</span>
                    <span style="margin-right:14px"><strong>Cittadinanza:</strong> ${escHtml(d.cittadinanza || '-')}</span>
                    <span><strong>Documento:</strong> ${escHtml(d.tipo_doc || '-')} n. ${escHtml(d.num_doc || '-')}</span>
                </div>
                ${accHtml}
            `;

            preText.textContent = json.preview || '';

            // Avvisi per campi potenzialmente mancanti
            const warnings = [];
            checkAlloggiatiField_(d.stato_nascita,  'Stato di nascita', warnings);
            checkAlloggiatiField_(d.comune_nascita, 'Comune di nascita', warnings);
            checkAlloggiatiField_(d.cittadinanza,   'Cittadinanza', warnings);
            checkAlloggiatiField_(d.tipo_doc,       'Tipo documento', warnings);
            checkAlloggiatiField_(d.num_doc,        'Numero documento', warnings);
            (d.guests || []).forEach((g, i) => {
                const p = `Accompagnatore ${i+1} (${g.cognome || '?'})`;
                checkAlloggiatiField_(g.stato_nascita,  `${p} — stato nascita`, warnings);
                checkAlloggiatiField_(g.comune_nascita, `${p} — comune nascita`, warnings);
            });
            if (warnings.length > 0) {
                warnDiv.style.display = 'block';
                warnDiv.innerHTML = `
                    <div style="background:#fffbeb;border:1.5px solid #f59e0b;border-radius:8px;padding:12px 14px;font-size:0.83rem;color:#92400e">
                        <strong>⚠ Campi da verificare prima dell'invio:</strong>
                        <ul style="margin:6px 0 0 16px;padding:0;line-height:1.8">
                            ${warnings.map(w => `<li>${escHtml(w)}</li>`).join('')}
                        </ul>
                    </div>`;
            }

            if (d.already_sent) {
                btn.disabled    = true;
                btn.textContent = '✅ Già inviata';
                btn.style.background = '#6b7280';
            }
        })
        .catch(err => {
            preText.textContent = 'Errore: ' + (err.message || 'Impossibile caricare la preview');
        });
}

function checkAlloggiatiField_(val, label, warnings) {
    if (!val || String(val).trim() === '') {
        warnings.push(`${label}: campo vuoto`);
    }
}

function closeSchedinModal() {
    document.getElementById('schedina-modal').style.display = 'none';
    currentSchedina = null;
}

// ─── VALIDA SCHEDINA (SOAP Test) ───────────────────────────────

function validateSchedina() {
    if (!currentSchedina) return;

    const btn    = document.getElementById('btn-validate-schedina');
    const result = document.getElementById('schedina-validate-result');
    const errEl  = document.getElementById('schedina-send-error');

    btn.disabled    = true;
    btn.textContent = '⏳ Verifica in corso…';
    result.style.display = 'none';
    errEl.style.display  = 'none';

    const url = SHEETS_SCRIPT_URL + '?action=alloggiati-validate&key=' + encodeURIComponent(currentSchedina.key);
    fetch(url)
        .then(r => r.json())
        .then(json => {
            btn.disabled    = false;
            btn.textContent = '🔍 Verifica formato';

            if (json.status !== 'ok') throw new Error(json.error || 'Errore validazione');

            const allOk  = json.genEsito && json.valide === json.totale;
            const color  = allOk ? '#dcfce7' : '#fef2f2';
            const border = allOk ? '#86efac' : '#fca5a5';
            const icon   = allOk ? '✅' : '❌';

            let righeHtml = '';
            (json.righe || []).forEach((r, i) => {
                const ico    = r.ok ? '✅' : '❌';
                const detail = r.det ? ` — ${escHtml(r.det)}` : (r.des ? ` — ${escHtml(r.des)}` : '');
                righeHtml += `<div style="padding:3px 0;font-size:0.82rem">${ico} Riga ${i + 1}${detail}</div>`;
            });

            result.style.display = 'block';
            result.innerHTML = `
                <div style="background:${color};border:1.5px solid ${border};border-radius:8px;padding:12px 14px">
                    <div style="font-weight:700;font-size:0.9rem;margin-bottom:8px">
                        ${icon} ${allOk ? "Formato valido — schedina pronta per l'invio" : 'Errori di formato rilevati'}
                        <span style="font-weight:400;color:#666;font-size:0.8rem;margin-left:8px">${json.valide}/${json.totale} righe OK</span>
                    </div>
                    ${righeHtml}
                </div>`;
        })
        .catch(err => {
            btn.disabled    = false;
            btn.textContent = '🔍 Verifica formato';
            errEl.style.display = 'block';
            errEl.textContent   = '⚠ ' + (err.message || 'Errore durante la validazione.');
        });
}

// ─── INVIA ───────────────────────────────────────────────────

function sendSchedina() {
    if (!currentSchedina) return;

    const btn   = document.getElementById('btn-send-schedina');
    const errEl = document.getElementById('schedina-send-error');

    btn.disabled    = true;
    btn.textContent = '⏳ Invio in corso…';
    errEl.style.display = 'none';

    fetch(SHEETS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(JSON.stringify({
            action: 'alloggiati-send',
            key:    currentSchedina.key
        }))
    })
        .then(r => r.json())
        .then(json => {
            if (json.status !== 'ok') throw new Error(json.error || 'Invio fallito');

            closeSchedinModal();
            const okModal = document.getElementById('schedina-ok-modal');
            document.getElementById('schedina-ok-ricevuta').textContent =
                json.ricevuta
                    ? `N° ricevuta: ${json.ricevuta}`
                    : (json.message || 'Schedina trasmessa con successo.');
            okModal.style.display = 'flex';
        })
        .catch(err => {
            btn.disabled    = false;
            btn.textContent = '🚔 Invia alla Questura';
            errEl.style.display = 'block';
            errEl.textContent   = '⚠ ' + (err.message || 'Errore durante l\'invio.');
        });
}

// ─── HELPERS ─────────────────────────────────────────────────

function escHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escAttr(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showPanel();
    }

    // Allow pressing Enter on password field
    document.getElementById('admin-pwd')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') adminLogin();
    });
});
