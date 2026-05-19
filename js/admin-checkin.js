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
        const buttonHTML = booking.checkin_done 
            ? ''
            : `<button class="ci-btn ci-btn--next"
                       style="white-space:nowrap;padding:10px 20px;font-size:0.88rem"
                       onclick="avviaCheckin(${originalIdx})">
                Avvia Check-in ›
            </button>`;

        const card = document.createElement('div');
        card.className = 'ci-card';
        card.style.marginBottom = '14px';
        card.innerHTML = `
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
