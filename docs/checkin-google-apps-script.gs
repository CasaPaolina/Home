// ═══════════════════════════════════════════════════════════════
//  CASA PAOLINA — Google Apps Script per Check-in Online
//
//  DEPLOY (una volta sola):
//
//  1. Apri il Google Sheet → Estensioni → Apps Script
//  2. Sostituisci tutto con questo file → Salva (Ctrl+S)
//  3. Imposta NOTIFICATION_EMAIL qui sotto
//  4. Menu a tendina → scegli "setup" → clicca ▶ Esegui
//     → accetta TUTTI i permessi (Gmail incluso)
//     Riceverai una mail di conferma se tutto e' ok.
//  5. Deploy → Nuova distribuzione → Web App
//     - Esegui come: Me  |  Chi puo' accedere: Chiunque
//  6. Copia l'URL e incollalo in js/checkin.js → riga 8
//
//  ⚠️  Dopo ogni modifica fai una NUOVA distribuzione:
//      Deploy → Gestisci distribuzioni → Modifica → Versione: Nuova
// ═══════════════════════════════════════════════════════════════


// ── CONFIGURAZIONE ───────────────────────────────────────────────
var NOTIFICATION_EMAIL = 'casapaolina23@gmail.com';   
// ────────────────────────────────────────────────────────────────


// ════════════════════════════════════════════════════════════════
//  SETUP — esegui una volta sola per autorizzare Gmail
//
//  PERCHE': il web app gira come "Me" con scope Gmail, ma Google
//  richiede che l'utente accetti esplicitamente i permessi almeno
//  una volta eseguendo manualmente una funzione che usa GmailApp.
//  Dopo l'accettazione, doPost() puo' chiamare GmailApp liberamente.
// ════════════════════════════════════════════════════════════════

function setup() {
  GmailApp.sendEmail(
    NOTIFICATION_EMAIL,
    'Casa Paolina - Sistema notifiche attivo',
    'Autorizzazione Gmail completata.\n\n' +
    'Il sistema di notifica check-in e\' pronto.\n' +
    'Ora fai il Deploy della Web App.'
  );
  SpreadsheetApp.getUi().alert(
    'Autorizzazione completata!\n\n' +
    'Hai ricevuto una mail di conferma a:\n' + NOTIFICATION_EMAIL + '\n\n' +
    'Ora esegui il Deploy della Web App.'
  );
}


// ════════════════════════════════════════════════════════════════
//  WEB APP
//  La mail viene inviata direttamente qui, senza trigger.
//
//  PERCHE' NON USO UN TRIGGER onChange:
//  I trigger onChange/onEdit non scattano per modifiche fatte
//  programmaticamente da uno script (come appendRow in doPost).
//  Scattano solo per azioni umane nell'interfaccia del foglio.
//  Quindi l'unico modo affidabile e' chiamare GmailApp da doPost.
// ════════════════════════════════════════════════════════════════

function doPost(e) {
  try {
    var raw  = (e.parameter && e.parameter.data) ? e.parameter.data : e.postData.contents;
    var data = JSON.parse(raw);
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    // ── Foglio PRENOTAZIONI ──────────────────────────────────────
    var sheet = ss.getSheetByName('Prenotazioni') || ss.insertSheet('Prenotazioni');
    if (sheet.getLastRow() === 0) creaIntestazioni(sheet);
    sheet.appendRow(buildMainRow(data));

    // ── Foglio OSPITI ────────────────────────────────────────────
    if (data.guests && data.guests.length > 0) {
      var guestSheet = ss.getSheetByName('Ospiti') || ss.insertSheet('Ospiti');
      if (guestSheet.getLastRow() === 0) creaIntestazioniOspiti(guestSheet);

      var refName = (data.r_nome || '') + ' ' + (data.r_cognome || '');
      data.guests.forEach(function(g) {
        guestSheet.appendRow([
          data.timestamp, refName,
          data.checkin_date, data.checkout_date, data.appartamento,
          g.nome, g.cognome, g.sesso, g.data_nascita,
          g.comune_nascita, g.stato_nascita, g.cittadinanza,
          g.comune_res, g.stato_res
        ]);
      });
    }

    // ── Notifica email ───────────────────────────────────────────
    try {
      inviaEmail_(data, ss.getUrl());
    } catch (mailErr) {
      // L'errore mail non blocca il salvataggio dei dati
      Logger.log('Errore invio email: ' + mailErr.toString());
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : '';

  if (action === 'bookings') {
    return getBookings_();
  }

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Casa Paolina Check-in API' }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ════════════════════════════════════════════════════════════════
//  ADMIN: legge il foglio "Booking" e restituisce le prenotazioni
//
//  Colonne attese (case-insensitive, varianti accettate):
//    CHECK-IN  | CHECKIN  | ARRIVO
//    CHECK-OUT | CHECKOUT | PARTENZA
//    APPARTAMENTO | APPARTMENT | APT
//    NOME | FIRST NAME
//    COGNOME | LAST NAME
//    OSPITE | GUEST           (usato se Nome/Cognome non presenti)
//    N° OSPITI | OSPITI | PAX (→ campo Adulti nel form)
// ════════════════════════════════════════════════════════════════

function getExistingCheckIns_() {
  // Get all completed check-ins from Prenotazioni sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Prenotazioni');
  var existing = {};
  
  if (!sheet) return existing;
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return existing;
  
  // Assuming K=Nome (col 11), L=Cognome (col 12)
  for (var i = 1; i < data.length; i++) {
    var nome = String(data[i][10] || '').trim().toLowerCase();
    var cognome = String(data[i][11] || '').trim().toLowerCase();
    if (nome && cognome) {
      var key = nome + '|' + cognome;
      existing[key] = true;
    }
  }
  
  return existing;
}

function getBookings_() {
  try {
    var ss    = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Booking') || ss.getSheetByName('Prenotazioni Booking') || ss.getSheetByName('booking');

    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', error: 'Foglio "Booking" non trovato' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data    = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', bookings: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = data[0].map(function(h) { return String(h).trim().toLowerCase(); });

    var colCin    = findCol_(headers, ['check-in', 'checkin', 'arrivo', 'data arrivo', 'data-arrivo']);
    var colCout   = findCol_(headers, ['check-out', 'checkout', 'partenza', 'data partenza', 'data-partenza']);
    var colApt    = findCol_(headers, ['appartamento', 'appartment', 'apartment', 'apt', 'alloggio']);
    var colNome   = findCol_(headers, ['nome', 'first name', 'firstname', 'name']);
    var colCogn   = findCol_(headers, ['cognome', 'last name', 'lastname', 'surname']);
    var colOspite = findCol_(headers, ['ospite', 'guest', 'nome ospite', 'guest name', 'cliente']);
    var colN      = findCol_(headers, ['n° ospiti', 'n ospiti', 'ospiti', 'num ospiti', 'guests', 'pax', 'persone']);

    // Get existing check-ins once
    var existingCheckIns = getExistingCheckIns_();

    var bookings = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip fully empty rows
      if (row.every(function(c) { return c === '' || c === null; })) continue;

      var nome = colNome >= 0 ? String(row[colNome] || '').trim() : '';
      var cognome = colCogn >= 0 ? String(row[colCogn] || '').trim() : '';
      var key = nome.toLowerCase() + '|' + cognome.toLowerCase();
      var checkinDone = existingCheckIns[key] || false;

      bookings.push({
        checkin:      colCin    >= 0 ? formatSheetDate_(row[colCin])    : '',
        checkout:     colCout   >= 0 ? formatSheetDate_(row[colCout])   : '',
        appartamento: colApt    >= 0 ? String(row[colApt]    || '').trim() : '',
        nome:         nome,
        cognome:      cognome,
        ospite:       colOspite >= 0 ? String(row[colOspite] || '').trim() : '',
        adults_count: colN      >= 0 ? String(row[colN]      || '').trim() : '',
        checkin_done: checkinDone
      });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', bookings: bookings }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function findCol_(headers, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var idx = headers.indexOf(candidates[i]);
    if (idx >= 0) return idx;
  }
  return -1;
}

function formatSheetDate_(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = String(val.getMonth() + 1).padStart(2, '0');
    var d = String(val.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }
  // Already a string — normalise DD/MM/YYYY → YYYY-MM-DD
  var s = String(val).trim();
  var parts = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (parts) return parts[3] + '-' + parts[2].padStart(2,'0') + '-' + parts[1].padStart(2,'0');
  return s;
}


// ════════════════════════════════════════════════════════════════
//  EMAIL
//  Riceve l'oggetto "data" grezzo dal form (stesse chiavi del JSON).
//  Solo ASCII puro: niente emoji, niente Unicode speciale.
//  I trattini usano entita' HTML (&ndash; &mdash;) nell'HTML,
//  e trattini semplici (-) nel plain text.
// ════════════════════════════════════════════════════════════════

function inviaEmail_(data, sheetUrl) {

  var nome      = (data.r_nome     || '') + ' ' + (data.r_cognome || '');
  var appart    = data.appartamento        || '-';
  var arrivo    = data.checkin_date        || '-';
  var partenza  = data.checkout_date       || '-';
  var notti     = data.permanenza_notti    || '-';
  var oraArr    = data.ora_arrivo          || 'n.d.';
  var adulti    = data.adults_count        || 0;
  var bambini   = data.children_count      || 0;
  var totOspiti = (parseInt(adulti) || 0) + (parseInt(bambini) || 0);
  var tipo      = data.trip_type           || '-';
  var sesso     = data.r_sesso             || '-';
  var nascData  = data.r_nascita_data      || '-';
  var nascCom   = data.r_nascita_comune    || '-';
  var nascSt    = data.r_nascita_stato     || '-';
  var citt      = data.r_cittadinanza      || '-';
  var comune    = data.r_comune            || '-';
  var paese     = data.r_paese             || '-';
  var docTipo   = data.r_doc_tipo               || '-';
  var docNum    = data.r_doc_numero             || '-';
  var docRilSt  = data.r_doc_rilascio_stato     || '-';
  var docRilCom = data.r_doc_rilascio_comune || '-';
  var email     = data.r_email             || '-';
  var telefono  = data.r_telefono          || '-';
  var note      = data.note               || '';
  var ricevuto  = data.timestamp
                    ? new Date(data.timestamp).toLocaleString('it-IT')
                    : new Date().toLocaleString('it-IT');
  var ospiti    = data.guests || [];

  // Oggetto: solo ASCII
  var subject = 'Casa Paolina - Nuovo Check-in: ' + nome +
                ' > ' + appart + ' (' + arrivo + ' / ' + partenza + ')';

  // ── PLAIN TEXT ───────────────────────────────────────────────
  var txt =
    '================================\n' +
    ' NUOVO CHECK-IN - CASA PAOLINA \n' +
    '================================\n\n' +
    'Ricevuto il  : ' + ricevuto  + '\n\n' +
    '-- SOGGIORNO -------------------\n' +
    'Appartamento : ' + appart    + '\n' +
    'Arrivo       : ' + arrivo    + '  ore ' + oraArr + '\n' +
    'Partenza     : ' + partenza  + '\n' +
    'Notti        : ' + notti     + '\n' +
    'Ospiti       : ' + totOspiti + ' (' + adulti + ' adulti, ' + bambini + ' bambini)\n' +
    'Tipo         : ' + tipo      + '\n\n' +
    '-- REFERENTE -------------------\n' +
    'Nome         : ' + nome      + '\n' +
    'Sesso        : ' + sesso     + '\n' +
    'Nato/a il    : ' + nascData  + ' a ' + nascCom + ' (' + nascSt + ')\n' +
    'Cittadinanza : ' + citt      + '\n' +
    'Residenza    : ' + comune    + ' - ' + paese   + '\n' +
    'Documento    : ' + docTipo   + ' n. ' + docNum + '\n' +
    '               Rilasciato da: ' + docRilCom + ' (' + docRilSt + ')\n' +
    'Email        : ' + email     + '\n' +
    'Telefono     : ' + telefono  + '\n';

  if (ospiti.length > 0) {
    txt += '\n-- ACCOMPAGNATORI (' + ospiti.length + ') ------------\n';
    ospiti.forEach(function(g, i) {
      txt += (i + 1) + '. ' + (g.nome || '') + ' ' + (g.cognome || '') +
             '  |  ' + (g.sesso || '') +
             '  |  ' + (g.data_nascita || '-') + ' - ' + (g.comune_nascita || '-') + ' (' + (g.stato_nascita || '-') + ')' +
             '  |  citt. ' + (g.cittadinanza || '-') +
             '  |  res. ' + (g.comune_res || '-') + ' (' + (g.stato_res || '-') + ')\n';
    });
  }

  if (note) txt += '\n-- NOTE ------------------------\n' + note + '\n';
  txt += '\nFoglio Google: ' + sheetUrl + '\n';

  // ── HTML ─────────────────────────────────────────────────────
  function tr(label, val) {
    return '<tr>' +
      '<td style="padding:5px 14px;color:#666;font-size:13px;white-space:nowrap;vertical-align:top;">' + label + '</td>' +
      '<td style="padding:5px 14px;font-size:13px;font-weight:500;">' + (val || '-') + '</td>' +
      '</tr>';
  }

  var ospitiHtml = '';
  if (ospiti.length > 0) {
    ospitiHtml =
      '<h3 style="color:#264653;margin-top:28px;margin-bottom:8px;">Accompagnatori (' + ospiti.length + ')</h3>' +
      '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
      '<tr style="background:#264653;color:#fff;">' +
      '<th style="padding:7px 10px;text-align:left;">Nome</th>' +
      '<th style="padding:7px 10px;text-align:left;">Sesso</th>' +
      '<th style="padding:7px 10px;text-align:left;">Nascita</th>' +
      '<th style="padding:7px 10px;text-align:left;">Cittadinanza</th>' +
      '<th style="padding:7px 10px;text-align:left;">Residenza</th></tr>';
    ospiti.forEach(function(g, i) {
      ospitiHtml +=
        '<tr style="background:' + (i % 2 === 0 ? '#f8f9fa' : '#fff') + ';">' +
        '<td style="padding:6px 10px;">' + (g.nome || '') + ' ' + (g.cognome || '') + '</td>' +
        '<td style="padding:6px 10px;">' + (g.sesso || '-') + '</td>' +
        '<td style="padding:6px 10px;">' + (g.data_nascita || '-') + ' &ndash; ' + (g.comune_nascita || '-') + ' (' + (g.stato_nascita || '-') + ')</td>' +
        '<td style="padding:6px 10px;">' + (g.cittadinanza || '-') + '</td>' +
        '<td style="padding:6px 10px;">' + (g.comune_res || '-') + ' (' + (g.stato_res || '-') + ')</td>' +
        '</tr>';
    });
    ospitiHtml += '</table>';
  }

  var noteHtml = note
    ? '<h3 style="color:#264653;margin-top:28px;margin-bottom:8px;">Note</h3>' +
      '<p style="background:#fff9e6;border-left:4px solid #f4a261;padding:10px 14px;border-radius:4px;margin:0;">' + note + '</p>'
    : '';

  var html =
    '<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;background:#f0f2f4;padding:24px;">' +

      '<div style="background:#2c7873;border-radius:10px 10px 0 0;padding:22px 28px;">' +
        '<h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">Casa Paolina &mdash; Nuovo Check-in</h1>' +
        '<p style="color:#a8d8d2;margin:6px 0 0;font-size:13px;">Ricevuto il ' + ricevuto + '</p>' +
      '</div>' +

      '<div style="background:#fff;padding:28px;border-radius:0 0 10px 10px;box-shadow:0 3px 10px rgba(0,0,0,0.09);">' +

        '<h3 style="color:#2c7873;margin-top:0;margin-bottom:8px;">Soggiorno</h3>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          tr('Appartamento',   appart) +
          tr('Arrivo',         arrivo + '&nbsp;&nbsp;ore ' + oraArr) +
          tr('Partenza',       partenza) +
          tr('Notti',          notti) +
          tr('Ospiti',         totOspiti + ' totali (' + adulti + ' adulti, ' + bambini + ' bambini)') +
          tr('Tipo soggiorno', tipo) +
        '</table>' +

        '<h3 style="color:#264653;margin-top:28px;margin-bottom:8px;">Referente</h3>' +
        '<table style="width:100%;border-collapse:collapse;">' +
          tr('Nome',          nome) +
          tr('Sesso',         sesso) +
          tr('Nato/a il',     nascData + ' a ' + nascCom + ' (' + nascSt + ')') +
          tr('Cittadinanza',  citt) +
          tr('Residenza',     comune + ' &ndash; ' + paese) +
          tr('Documento',     docTipo + ' n. ' + docNum) +
          tr('Rilasciato da', docRilCom + ' (' + docRilSt + ')') +
          tr('Email',         '<a href="mailto:' + email + '" style="color:#2c7873;">' + email + '</a>') +
          tr('Telefono',      '<a href="tel:' + telefono + '" style="color:#2c7873;">' + telefono + '</a>') +
        '</table>' +

        ospitiHtml +
        noteHtml +

        '<div style="margin-top:32px;text-align:center;">' +
          '<a href="' + sheetUrl + '" style="display:inline-block;background:#2c7873;color:#fff;' +
          'padding:13px 32px;border-radius:7px;text-decoration:none;font-size:14px;font-weight:bold;">' +
          'Apri il Foglio Google' +
          '</a>' +
        '</div>' +

      '</div>' +
      '<p style="text-align:center;color:#bbb;font-size:11px;margin-top:14px;">Casa Paolina Check-in System &mdash; notifica automatica</p>' +
    '</div>';

  GmailApp.sendEmail(NOTIFICATION_EMAIL, subject, txt, { htmlBody: html });
}


// ════════════════════════════════════════════════════════════════
//  RIGA PRINCIPALE
// ════════════════════════════════════════════════════════════════

function buildMainRow(d) {
  var totOspiti = (parseInt(d.adults_count) || 0) + (parseInt(d.children_count) || 0);
  return [
    new Date(d.timestamp),       // A: Data/ora ricezione
    d.appartamento,              // B: Appartamento
    d.checkin_date,              // C: Data arrivo
    d.checkout_date,             // D: Data partenza
    d.permanenza_notti,          // E: Notti
    d.adults_count,              // F: N. adulti
    d.children_count,            // G: N. bambini
    totOspiti,                   // H: Totale ospiti
    d.trip_type,                 // I: Tipo soggiorno
    d.ora_arrivo,                // J: Ora arrivo prevista
    d.r_nome,                    // K: Nome
    d.r_cognome,                 // L: Cognome
    d.r_sesso,                   // M: Sesso
    d.r_nascita_data,            // N: Data di nascita
    d.r_nascita_comune   || null, // O: Comune di nascita (null se non italiano)
    d.r_nascita_stato    || null, // P: Stato di nascita
    d.r_cittadinanza     || null, // Q: Cittadinanza
    d.r_comune           || null, // R: Comune di residenza (null se non italiano)
    d.r_paese            || null, // S: Paese di residenza
    d.r_doc_tipo         || null, // T: Tipo documento
    d.r_doc_numero       || null, // U: Numero documento
    d.r_doc_rilascio_stato  || null, // V: Stato rilascio
    d.r_doc_rilascio_comune || null, // W: Comune rilascio (null se non italiano)
    d.r_email,                   // X: Email
    d.r_telefono,                // Y: Telefono
    d.guests_count,              // Z: N. accompagnatori
    d.note                       // AA: Note
  ];
}


// ════════════════════════════════════════════════════════════════
//  INTESTAZIONI
// ════════════════════════════════════════════════════════════════

function creaIntestazioni(sheet) {
  var headers = [
    'Data Ricezione',
    'Appartamento',
    'Data Arrivo', 'Data Partenza', 'Notti',
    'Adulti', 'Bambini', 'Totale Ospiti',
    'Tipo Soggiorno', 'Ora Arrivo Prevista',
    'Nome Referente', 'Cognome Referente',
    'Sesso', 'Data Nascita', 'Comune Nascita', 'Stato Nascita', 'Cittadinanza',
    'Comune Residenza', 'Paese Residenza',
    'Tipo Documento', 'N. Documento',
    'Stato Rilascio Doc.', 'Comune Rilascio Doc.',
    'Email', 'Telefono',
    'N. Accompagnatori',
    'Note'
  ];
  sheet.appendRow(headers);

  var r = sheet.getRange(1, 1, 1, headers.length);
  r.setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(3, 100);
  sheet.setColumnWidth(4, 100);
}

function creaIntestazioniOspiti(sheet) {
  var headers = [
    'Ref. Prenotazione', 'Referente', 'Data Arrivo', 'Data Partenza', 'Appartamento',
    'Nome', 'Cognome', 'Sesso', 'Data Nascita',
    'Comune Nascita', 'Stato Nascita', 'Cittadinanza',
    'Comune Residenza', 'Stato Residenza'
  ];
  sheet.appendRow(headers);

  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#264653').setFontColor('#ffffff').setFontSize(10);
  sheet.setFrozenRows(1);
}


// ════════════════════════════════════════════════════════════════
//  AGGIORNA INTESTAZIONI — esegui UNA VOLTA per correggere
//  le intestazioni di un foglio gia' esistente creato con
//  una versione precedente dello script.
//
//  Seleziona "aggiornaIntestazioni" dal menu a tendina e clicca
//  ▶ Esegui. Non cancella i dati, sovrascrive solo la riga 1.
// ════════════════════════════════════════════════════════════════

function aggiornaIntestazioni() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── Foglio Prenotazioni ──────────────────────────────────────
  var sheet = ss.getSheetByName('Prenotazioni');
  if (sheet) {
    var headers = [
      'Data Ricezione',
      'Appartamento',
      'Data Arrivo', 'Data Partenza', 'Notti',
      'Adulti', 'Bambini', 'Totale Ospiti',
      'Tipo Soggiorno', 'Ora Arrivo Prevista',
      'Nome Referente', 'Cognome Referente',
      'Sesso', 'Data Nascita', 'Comune Nascita', 'Stato Nascita', 'Cittadinanza',
      'Comune Residenza', 'Paese Residenza',
      'Tipo Documento', 'N. Documento',
      'Stato Rilascio Doc.', 'Comune Rilascio Doc.',
      'Email', 'Telefono',
      'N. Accompagnatori',
      'Note'
    ];
    // Sovrascrive solo la riga 1
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    // Cancella eventuali colonne extra a destra (vecchie colonne eliminate)
    var lastCol = sheet.getLastColumn();
    if (lastCol > headers.length) {
      sheet.deleteColumns(headers.length + 1, lastCol - headers.length);
    }
    // Stile
    var r = sheet.getRange(1, 1, 1, headers.length);
    r.setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
    Logger.log('Intestazioni Prenotazioni aggiornate: ' + headers.length + ' colonne.');
  } else {
    Logger.log('Foglio "Prenotazioni" non trovato.');
  }

  // ── Foglio Ospiti ────────────────────────────────────────────
  var guestSheet = ss.getSheetByName('Ospiti');
  if (guestSheet) {
    var gHeaders = [
      'Ref. Prenotazione', 'Referente', 'Data Arrivo', 'Data Partenza', 'Appartamento',
      'Nome', 'Cognome', 'Sesso', 'Data Nascita',
      'Comune Nascita', 'Stato Nascita', 'Cittadinanza',
      'Comune Residenza', 'Stato Residenza'
    ];
    guestSheet.getRange(1, 1, 1, gHeaders.length).setValues([gHeaders]);
    var gLastCol = guestSheet.getLastColumn();
    if (gLastCol > gHeaders.length) {
      guestSheet.deleteColumns(gHeaders.length + 1, gLastCol - gHeaders.length);
    }
    guestSheet.getRange(1, 1, 1, gHeaders.length)
      .setFontWeight('bold').setBackground('#264653').setFontColor('#ffffff').setFontSize(10);
    Logger.log('Intestazioni Ospiti aggiornate: ' + gHeaders.length + ' colonne.');
  }

  SpreadsheetApp.getUi().alert(
    'Intestazioni aggiornate!\n\n' +
    'Le colonne "Data Emissione" e "Data Scadenza" sono state rimosse.\n' +
    'I dati esistenti non sono stati toccati.'
  );
}


// ════════════════════════════════════════════════════════════════
//  TEST — seleziona "testEmail" e clicca ▶ Esegui
// ════════════════════════════════════════════════════════════════

function testEmail() {
  var fakeData = {
    timestamp:        new Date().toISOString(),
    appartamento:     'App. 3 - Primo Piano',
    checkin_date:     '2026-06-15',
    checkout_date:    '2026-06-22',
    permanenza_notti: 7,
    ora_arrivo:       '16:00',
    adults_count:     2,
    children_count:   1,
    trip_type:        'Vacanza',
    r_nome:           'Mario',
    r_cognome:        'Rossi',
    r_sesso:          'M',
    r_nascita_data:   '10/03/1980',
    r_nascita_comune: 'Roma',
    r_nascita_stato:  'Italia',
    r_cittadinanza:   'Italiana',
    r_comune:         'Milano',
    r_paese:          'Italia',
    r_doc_tipo:       "Carta d'Identita'",
    r_doc_numero:     'AA1234567',
    r_doc_rilascio_stato:  'Italia',
    r_doc_rilascio_comune: 'Comune di Milano',
    r_email:    'mario.rossi@email.com',
    r_telefono: '+39 333 1234567',
    guests_count: 1,
    guests: [{
      nome: 'Laura', cognome: 'Rossi', sesso: 'F',
      data_nascita: '20/07/1982', comune_nascita: 'Napoli',
      stato_nascita: 'Italia', cittadinanza: 'Italiana',
      comune_res: 'Milano', stato_res: 'Italia'
    }],
    note: 'Arrivo in serata, possibile ritardo.'
  };

  inviaEmail_(fakeData, SpreadsheetApp.getActiveSpreadsheet().getUrl());
  Logger.log('Email di test inviata a: ' + NOTIFICATION_EMAIL);
}