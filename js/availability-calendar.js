// ─────────────────────────────────────────────────────────────
//  Casa Paolina — Per-apartment availability (home page)
//
//  Each room card has a "Vedi Disponibilità" button that opens a
//  modal with a month calendar for THAT apartment (booked days in
//  red, free days in green). The guest selects an arrival and a
//  departure day; a small form (number of guests + name) then
//  builds a pre-filled WhatsApp message to request prices/booking.
//
//  Booking data is read from the same Google Apps Script used by
//  the admin dashboard (?action=bookings → foglio "Booking").
// ─────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2kYpdep7maP8j8biDP7TZfIp23RuNo1qCfqCMLTuvY1fyuqleHECcjXJdJZmNbP-2-Q/exec';
    const WHATSAPP_NUMBER = '393208086738';

    // Apartments. `id` is the normalised key, `max` the max guests.
    const APARTMENTS = [
        { id: 'celeste', name: 'Appartamento Celeste', max: 4 },
        { id: 'verde',   name: 'Appartamento Verde',   max: 4 },
        { id: 'suite',   name: 'Suite 17',             max: 2 }
    ];

    // Localised month names and weekday initials (week starts Monday).
    const MONTHS = {
        it: ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'],
        en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
        es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
        de: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
        fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
    };
    const WEEKDAYS = {
        it: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
        en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
        es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
        de: ['M', 'D', 'M', 'D', 'F', 'S', 'S'],
        fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D']
    };

    // Booked nights per apartment id → Set of 'YYYY-MM-DD'.
    const bookedDates = { celeste: new Set(), verde: new Set(), suite: new Set() };
    let dataLoaded = false;
    let loadError = false;
    let loadPromise = null;

    // Calendar view + selection state (for the apartment in the modal).
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth(); // 0-11
    const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 12, 1);

    let currentApt = null; // apartment object currently shown in the modal
    const selection = { start: null, end: null };
    let modalEl = null;

    // ── Helpers ──────────────────────────────────────────────────
    function lang() {
        const l = (typeof currentLang !== 'undefined' && currentLang) ||
                  localStorage.getItem('language') || 'it';
        return MONTHS[l] ? l : 'it';
    }

    function t(key) {
        const l = lang();
        return (typeof translations !== 'undefined' && translations[l] && translations[l][key]) || '';
    }

    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
    function parseYmd(s) { return new Date(s + 'T00:00:00'); }

    // Format 'YYYY-MM-DD' as dd/mm/yyyy for display.
    function prettyDate(s) {
        const d = parseYmd(s);
        return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear();
    }

    // Normalise a booking's apartment value to one of our ids.
    function aptId(raw) {
        const s = String(raw || '').toLowerCase().trim();
        if (s.indexOf('celeste') >= 0 || s === '15a') return 'celeste';
        if (s.indexOf('verde') >= 0 || s === '15') return 'verde';
        if (s.indexOf('suite') >= 0 || s === '17' || s === '1') return 'suite';
        return null;
    }

    // Mark each night from check-in (incl.) to check-out (excl.) as booked.
    // The check-out day itself stays free (available for a new arrival).
    function addRange(id, checkin, checkout) {
        if (!checkin) return;
        const start = new Date(checkin + 'T00:00:00');
        const end = checkout ? new Date(checkout + 'T00:00:00') : new Date(start.getTime() + 86400000);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
        const d = new Date(start.getTime());
        let guard = 0;
        while (d < end && guard < 800) {
            bookedDates[id].add(ymd(d));
            d.setDate(d.getDate() + 1);
            guard++;
        }
    }

    function loadBookings() {
        if (loadPromise) return loadPromise;
        loadPromise = fetch(SHEETS_SCRIPT_URL + '?action=bookings')
            .then(r => r.json())
            .then(json => {
                if (!json || !json.bookings) throw new Error('no bookings');
                json.bookings.forEach(b => {
                    const id = aptId(b.appartamento);
                    if (!id) return;
                    addRange(id, b.checkin, b.checkout);
                });
                dataLoaded = true;
            })
            .catch(() => { loadError = true; });
        return loadPromise;
    }

    // True if every night from `start` (incl.) to `end` (excl.) is free.
    function rangeIsFree(id, startStr, endStr) {
        const d = parseYmd(startStr);
        const end = parseYmd(endStr);
        let guard = 0;
        while (d < end && guard < 800) {
            if (bookedDates[id].has(ymd(d))) return false;
            d.setDate(d.getDate() + 1);
            guard++;
        }
        return true;
    }

    function inSelectedRange(dstr) {
        if (!selection.start) return false;
        if (!selection.end) return dstr === selection.start;
        return dstr >= selection.start && dstr < selection.end;
    }

    function onDayClick(dstr) {
        if (!currentApt) return;
        const id = currentApt.id;
        // Start a new selection on first click, after a full range, or
        // when clicking on/before the current arrival.
        if (!selection.start || selection.end || dstr <= selection.start) {
            selection.start = dstr;
            selection.end = null;
        } else if (rangeIsFree(id, selection.start, dstr)) {
            selection.end = dstr;
        } else {
            // Range would cross a booked night → restart from the new day.
            selection.start = dstr;
            selection.end = null;
        }
        render();
    }

    function clearSelection() {
        selection.start = null;
        selection.end = null;
    }

    // ── Calendar rendering (single apartment in the modal) ───────
    function buildCalendar() {
        const id = currentApt.id;
        const wd = WEEKDAYS[lang()];
        const first = new Date(viewYear, viewMonth, 1);
        const startOffset = (first.getDay() + 6) % 7; // Monday-first
        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const todayStr = ymd(new Date());

        let cells = '';
        for (let i = 0; i < startOffset; i++) {
            cells += '<span class="avail-day empty"></span>';
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dstr = viewYear + '-' + pad(viewMonth + 1) + '-' + pad(day);
            let cls = 'avail-day';
            let attrs = '';
            if (dstr < todayStr) {
                cls += ' past';
            } else if (bookedDates[id].has(dstr)) {
                cls += ' booked';
            } else {
                cls += ' free';
                attrs = ' data-date="' + dstr + '" role="button" tabindex="0"';
            }
            if (inSelectedRange(dstr)) cls += ' selected';
            if (dstr === selection.start) cls += ' range-start';
            if (selection.end && dstr === selection.end) cls += ' range-end';
            cells += '<span class="' + cls + '"' + attrs + '>' + day + '</span>';
        }

        const weekHdr = wd.map(w => '<span>' + w + '</span>').join('');
        return '<div class="avail-weekdays">' + weekHdr + '</div>' +
               '<div class="avail-days">' + cells + '</div>';
    }

    function peopleOptions(max) {
        let opts = '';
        const def = Math.min(2, max);
        for (let i = 1; i <= max; i++) {
            opts += '<option value="' + i + '"' + (i === def ? ' selected' : '') + '>' + i + '</option>';
        }
        return opts;
    }

    function render() {
        if (!modalEl || !currentApt) return;
        const months = MONTHS[lang()];

        const label = modalEl.querySelector('.avail-month-label');
        if (label) label.textContent = months[viewMonth] + ' ' + viewYear;

        const prev = modalEl.querySelector('.avail-prev');
        const next = modalEl.querySelector('.avail-next');
        if (prev) prev.disabled = (viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth());
        if (next) next.disabled = (new Date(viewYear, viewMonth, 1) >= maxDate);

        const cal = modalEl.querySelector('.avail-calendar');
        if (cal) {
            cal.innerHTML = buildCalendar();
            cal.querySelectorAll('.avail-day.free[data-date]').forEach(cell => {
                const handler = () => onDayClick(cell.getAttribute('data-date'));
                cell.addEventListener('click', handler);
                cell.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
                });
            });
        }

        const status = modalEl.querySelector('.avail-status');
        if (status) {
            if (loadError) {
                status.style.display = '';
                status.textContent = t('avail_error') || 'Impossibile caricare la disponibilità.';
            } else if (!dataLoaded) {
                status.style.display = '';
                status.textContent = t('avail_loading') || 'Caricamento disponibilità…';
            } else {
                status.style.display = 'none';
            }
        }

        renderForm();
    }

    // Show the booking form + summary once a full range is selected.
    function renderForm() {
        const cta = modalEl.querySelector('.avail-cta');
        const summary = modalEl.querySelector('.avail-cta-summary');
        if (!cta || !summary) return;

        if (!selection.start || !selection.end) {
            cta.hidden = true;
            return;
        }

        const nights = Math.round((parseYmd(selection.end) - parseYmd(selection.start)) / 86400000);
        const nightWord = nights === 1 ? (t('avail_night') || 'notte') : (t('avail_nights') || 'notti');

        const summaryTpl = t('avail_summary') || '{apt} · dal {in} al {out} · {n} {nights}';
        summary.textContent = summaryTpl
            .replace('{apt}', currentApt.name)
            .replace('{in}', prettyDate(selection.start))
            .replace('{out}', prettyDate(selection.end))
            .replace('{n}', nights)
            .replace('{nights}', nightWord);

        cta.hidden = false;
    }

    function changeMonth(delta) {
        const d = new Date(viewYear, viewMonth + delta, 1);
        if (d < minDate || d >= maxDate) return;
        viewYear = d.getFullYear();
        viewMonth = d.getMonth();
        render();
    }

    function submitWhatsApp() {
        if (!currentApt || !selection.start || !selection.end) return;

        const nameInput = modalEl.querySelector('.avail-name');
        const peopleSel = modalEl.querySelector('.avail-people');
        const name = nameInput ? nameInput.value.trim() : '';
        const people = peopleSel ? peopleSel.value : '';

        if (!name) {
            if (nameInput) {
                nameInput.classList.add('input-error');
                nameInput.focus();
            }
            return;
        }

        const nights = Math.round((parseYmd(selection.end) - parseYmd(selection.start)) / 86400000);
        const nightWord = nights === 1 ? (t('avail_night') || 'notte') : (t('avail_nights') || 'notti');

        const msgTpl = t('avail_wa_message') ||
            'Ciao! Sono {name}. Vorrei richiedere disponibilità e prezzi per {apt} a Casa Paolina dal {in} al {out} ({n} {nights}) per {people} persone.';
        const msg = msgTpl
            .replace('{name}', name)
            .replace('{apt}', currentApt.name)
            .replace('{in}', prettyDate(selection.start))
            .replace('{out}', prettyDate(selection.end))
            .replace('{n}', nights)
            .replace('{nights}', nightWord)
            .replace('{people}', people);

        window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg), '_blank');
    }

    // ── Modal ────────────────────────────────────────────────────
    function buildModalShell() {
        const modal = document.createElement('div');
        modal.className = 'guest-modal avail-modal';
        modal.innerHTML =
            '<div class="guest-modal-content avail-modal-content">' +
                '<button class="guest-modal-close" aria-label="Chiudi">&times;</button>' +
                '<h2 class="avail-modal-title"></h2>' +
                '<div class="avail-nav">' +
                    '<button class="avail-nav-btn avail-prev" aria-label="Mese precedente">&lsaquo;</button>' +
                    '<span class="avail-month-label"></span>' +
                    '<button class="avail-nav-btn avail-next" aria-label="Mese successivo">&rsaquo;</button>' +
                '</div>' +
                '<div class="avail-legend">' +
                    '<span><i class="avail-dot free"></i> <span data-translate="avail_free">Libero</span></span>' +
                    '<span><i class="avail-dot booked"></i> <span data-translate="avail_booked">Occupato</span></span>' +
                    '<span><i class="avail-dot selected"></i> <span data-translate="avail_selected">Selezionato</span></span>' +
                '</div>' +
                '<p class="avail-hint" data-translate="avail_hint">Clicca su una data di arrivo e poi su una di partenza.</p>' +
                '<div class="avail-calendar"></div>' +
                '<p class="avail-status"></p>' +
                '<div class="avail-cta" hidden>' +
                    '<p class="avail-cta-summary"></p>' +
                    '<form class="avail-form">' +
                        '<div class="avail-form-row">' +
                            '<div class="avail-form-group">' +
                                '<label class="avail-people-label" data-translate="avail_people">Numero di persone</label>' +
                                '<select class="avail-people"></select>' +
                            '</div>' +
                            '<div class="avail-form-group">' +
                                '<label class="avail-name-label" data-translate="avail_name">Nome e cognome</label>' +
                                '<input type="text" class="avail-name" required>' +
                            '</div>' +
                        '</div>' +
                        '<button type="submit" class="btn btn-primary avail-whatsapp-btn">' +
                            '<span data-translate="avail_request_btn">Richiedi prezzi e prenota</span>' +
                        '</button>' +
                    '</form>' +
                '</div>' +
            '</div>';
        return modal;
    }

    function closeModal() {
        if (!modalEl) return;
        const el = modalEl;
        modalEl = null;
        currentApt = null;
        clearSelection();
        document.body.style.overflow = '';
        if (el.parentNode) el.parentNode.removeChild(el);
        document.removeEventListener('keydown', onEsc);
    }

    function onEsc(e) {
        if (e.key === 'Escape') closeModal();
    }

    // Re-apply translations to the static labels inside the modal.
    function translateModal() {
        if (!modalEl) return;
        modalEl.querySelector('.avail-modal-title').textContent =
            (t('avail_modal_title') || 'Disponibilità {apt}').replace('{apt}', currentApt.name);
        modalEl.querySelectorAll('[data-translate]').forEach(elm => {
            const val = t(elm.getAttribute('data-translate'));
            if (val) elm.textContent = val;
        });
    }

    function openModal(apt) {
        viewYear = today.getFullYear();
        viewMonth = today.getMonth();
        clearSelection();
        currentApt = apt;

        modalEl = buildModalShell();
        document.body.appendChild(modalEl);
        document.body.style.overflow = 'hidden';

        modalEl.querySelector('.avail-people').innerHTML = peopleOptions(apt.max);
        translateModal();

        modalEl.querySelector('.guest-modal-close').addEventListener('click', closeModal);
        modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeModal(); });
        modalEl.querySelector('.avail-prev').addEventListener('click', () => changeMonth(-1));
        modalEl.querySelector('.avail-next').addEventListener('click', () => changeMonth(1));
        modalEl.querySelector('.avail-form').addEventListener('submit', (e) => {
            e.preventDefault();
            submitWhatsApp();
        });
        const nameInput = modalEl.querySelector('.avail-name');
        if (nameInput) nameInput.addEventListener('input', () => nameInput.classList.remove('input-error'));
        document.addEventListener('keydown', onEsc);

        render();
        loadBookings().then(() => { if (modalEl) render(); });
    }

    // ── Init ─────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', () => {
        const buttons = document.querySelectorAll('.room-avail-btn');
        if (!buttons.length) return;

        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-apt');
                const apt = APARTMENTS.find(a => a.id === id);
                if (apt) openModal(apt);
            });
        });

        // Re-render the open modal when the site language changes.
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(() => {
                if (!modalEl || !currentApt) return;
                translateModal();
                render();
            }, 0));
        });
    });
})();
