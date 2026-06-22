// ─────────────────────────────────────────────────────────────
//  Casa Paolina — Availability Calendars (home page)
//
//  Shows one small month calendar per apartment with the booked
//  days in red and the free days in green. Booking data is read
//  from the same Google Apps Script used by the admin dashboard
//  (?action=bookings → foglio "Booking", popolato dai calendari).
// ─────────────────────────────────────────────────────────────

(function () {
    'use strict';

    const SHEETS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx2kYpdep7maP8j8biDP7TZfIp23RuNo1qCfqCMLTuvY1fyuqleHECcjXJdJZmNbP-2-Q/exec';
    const WHATSAPP_NUMBER = '393208086738';

    // Apartments shown, in display order. `id` is the normalised key.
    const APARTMENTS = [
        { id: 'celeste', name: 'Celeste' },
        { id: 'verde',   name: 'Verde' },
        { id: 'suite',   name: 'Suite 17' }
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

    // Shared month displayed by all three calendars.
    const today = new Date();
    let viewYear = today.getFullYear();
    let viewMonth = today.getMonth(); // 0-11
    const minDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 12, 1);

    // Current date-range selection (one apartment at a time).
    const selection = { apt: null, start: null, end: null };

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

    // Format 'YYYY-MM-DD' as a localised dd/mm/yyyy for display.
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
        return fetch(SHEETS_SCRIPT_URL + '?action=bookings')
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

    // Is this day part of the current selected range (start ≤ day < end)?
    function inSelectedRange(id, dstr) {
        if (selection.apt !== id || !selection.start) return false;
        if (!selection.end) return dstr === selection.start;
        return dstr >= selection.start && dstr < selection.end;
    }

    // Handle a click on a free day cell.
    function onDayClick(id, dstr) {
        // Starting a new selection (different apartment, nothing selected,
        // a full range already chosen, or a click before the current start).
        if (selection.apt !== id || !selection.start || selection.end || dstr <= selection.start) {
            selection.apt = id;
            selection.start = dstr;
            selection.end = null;
        } else {
            // Second click → close the range if the nights in between are free.
            if (rangeIsFree(id, selection.start, dstr)) {
                selection.end = dstr;
            } else {
                // Range crosses a booked night → restart from the new day.
                selection.start = dstr;
                selection.end = null;
            }
        }
        render();
    }

    function clearSelection() {
        selection.apt = null;
        selection.start = null;
        selection.end = null;
    }

    function buildCalendarCard(apt) {
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
            } else if (bookedDates[apt.id].has(dstr)) {
                cls += ' booked';
            } else {
                cls += ' free';
                attrs = ' data-apt="' + apt.id + '" data-date="' + dstr + '" role="button" tabindex="0"';
            }
            if (inSelectedRange(apt.id, dstr)) cls += ' selected';
            if (selection.apt === apt.id && dstr === selection.start) cls += ' range-start';
            if (selection.apt === apt.id && selection.end && dstr === selection.end) cls += ' range-end';
            cells += '<span class="' + cls + '"' + attrs + '>' + day + '</span>';
        }

        const weekHdr = wd.map(w => '<span>' + w + '</span>').join('');
        const activeCls = selection.apt === apt.id ? ' is-active' : '';
        return '<div class="avail-cal' + activeCls + '" data-apt="' + apt.id + '">' +
            '<h3 class="avail-cal-title">' + apt.name + '</h3>' +
            '<div class="avail-weekdays">' + weekHdr + '</div>' +
            '<div class="avail-days">' + cells + '</div>' +
            '</div>';
    }

    function render() {
        const grid = document.getElementById('avail-grid');
        if (!grid) return;

        const months = MONTHS[lang()];
        const label = document.getElementById('avail-month-label');
        if (label) label.textContent = months[viewMonth] + ' ' + viewYear;

        const prev = document.getElementById('avail-prev');
        const next = document.getElementById('avail-next');
        if (prev) prev.disabled = (viewYear === minDate.getFullYear() && viewMonth === minDate.getMonth());
        if (next) next.disabled = (new Date(viewYear, viewMonth, 1) >= maxDate);

        grid.innerHTML = APARTMENTS.map(buildCalendarCard).join('');

        // Wire up clicks on free days.
        grid.querySelectorAll('.avail-day.free[data-date]').forEach(cell => {
            const handler = () => onDayClick(cell.getAttribute('data-apt'), cell.getAttribute('data-date'));
            cell.addEventListener('click', handler);
            cell.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); }
            });
        });

        const status = document.getElementById('avail-status');
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

        renderCta();
    }

    // Build the WhatsApp call-to-action when a full range is selected.
    function renderCta() {
        const cta = document.getElementById('avail-cta');
        const summary = document.getElementById('avail-cta-summary');
        const link = document.getElementById('avail-whatsapp');
        if (!cta || !summary || !link) return;

        if (!selection.apt || !selection.start || !selection.end) {
            cta.hidden = true;
            return;
        }

        const apt = APARTMENTS.find(a => a.id === selection.apt);
        const aptName = apt ? apt.name : selection.apt;
        const nights = Math.round((parseYmd(selection.end) - parseYmd(selection.start)) / 86400000);
        const nightWord = nights === 1
            ? (t('avail_night') || 'notte')
            : (t('avail_nights') || 'notti');

        const summaryTpl = t('avail_summary') ||
            'Appartamento {apt} · dal {in} al {out} · {n} {nights}';
        summary.textContent = summaryTpl
            .replace('{apt}', aptName)
            .replace('{in}', prettyDate(selection.start))
            .replace('{out}', prettyDate(selection.end))
            .replace('{n}', nights)
            .replace('{nights}', nightWord);

        const msgTpl = t('avail_wa_message') ||
            'Ciao! Vorrei richiedere disponibilità e prezzi per l\'Appartamento {apt} a Casa Paolina dal {in} al {out} ({n} {nights}).';
        const msg = msgTpl
            .replace('{apt}', aptName)
            .replace('{in}', prettyDate(selection.start))
            .replace('{out}', prettyDate(selection.end))
            .replace('{n}', nights)
            .replace('{nights}', nightWord);

        link.href = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(msg);
        cta.hidden = false;
    }

    function changeMonth(delta) {
        const d = new Date(viewYear, viewMonth + delta, 1);
        if (d < minDate || d >= maxDate) return;
        viewYear = d.getFullYear();
        viewMonth = d.getMonth();
        render();
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!document.getElementById('availability')) return;

        const panel = document.getElementById('avail-panel');
        const toggle = document.getElementById('avail-toggle');
        let loadStarted = false;

        if (toggle && panel) {
            toggle.addEventListener('click', () => {
                const opening = panel.hidden;
                panel.hidden = !opening;
                toggle.classList.toggle('is-open', opening);
                toggle.textContent = opening
                    ? (t('avail_hide') || 'Nascondi disponibilità')
                    : (t('avail_show') || 'Vedi Disponibilità');
                if (opening) {
                    render();
                    if (!loadStarted) {
                        loadStarted = true;
                        loadBookings().then(render);
                    }
                    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        }

        const prev = document.getElementById('avail-prev');
        const next = document.getElementById('avail-next');
        if (prev) prev.addEventListener('click', () => changeMonth(-1));
        if (next) next.addEventListener('click', () => changeMonth(1));

        // Re-render labels / button text when the site language changes.
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', () => setTimeout(() => {
                if (toggle && panel) {
                    toggle.textContent = panel.hidden
                        ? (t('avail_show') || 'Vedi Disponibilità')
                        : (t('avail_hide') || 'Nascondi disponibilità');
                }
                if (panel && !panel.hidden) render();
            }, 0));
        });
    });
})();
