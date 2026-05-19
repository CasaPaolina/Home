// ─────────────────────────────────────────────────────────────
//  Casa Paolina — Admin Check-in Dashboard
// ─────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = 'salvatore';
const SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2kYpdep7maP8j8biDP7TZfIp23RuNo1qCfqCMLTuvY1fyuqleHECcjXJdJZmNbP-2-Q/exec';

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
    loadBookings();
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
        
        let buttonHTML = '';
        if (booking.checkin_done) {
            buttonHTML = `<button class="ci-btn ci-btn--next" style="white-space:nowrap;padding:10px 20px;font-size:0.88rem">Visualizza ›</button>`;
        } else {
            buttonHTML = `<button class="ci-btn ci-btn--next" style="white-space:nowrap;padding:10px 20px;font-size:0.88rem" onclick="avviaCheckin(${originalIdx})">Avvia Check-in ›</button>`;
        }

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
                    <div class="adm-booking-name">${guestName}</div>
                    <div class="adm-booking-dates">
                        ${formatAdminDate(booking.checkin)} → ${formatAdminDate(booking.checkout)}
                        &nbsp;·&nbsp; ${nights} ${nights === 1 ? 'notte' : 'notti'}${ospitiLabel}
                    </div>
                </div>
                <div>
                    ${buttonHTML}
                </div>
            </div>`;
        
        card.innerHTML = html;
        
        // Add click handler for Visualizza button if needed
        if (booking.checkin_done) {
            const button = card.querySelector('button');
            button.onclick = () => viewCheckinDetails(booking.nome, booking.cognome);
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

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('details-modal');
    if (e.target === modal) {
        closeDetailsModal();
    }
});

// ─── INIT ────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Auto-show panel if already logged in this session
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showPanel();
    }

    // Allow pressing Enter on password field
    document.getElementById('admin-pwd')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') adminLogin();
    });
});
