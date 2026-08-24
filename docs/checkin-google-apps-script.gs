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

// ── CONFIGURAZIONE PORTAFOGLIO ───────────────────────────────────
//  Foglio dove vengono inserite le prenotazioni dal calendario.
var PORTAFOGLIO_SHEET = 'Portafoglio';
//  Codice appartamento (ultima riga dell'evento) → nome appartamento.
var APARTMENT_MAP = { '15A': 'celeste', '1': 'suite', '15': 'verde' };
//  Lettera dopo il nome → canale di prenotazione.
var CHANNEL_MAP   = { 'B': 'Booking.com', 'A': 'Airbnb' };
//  Lettera dopo il nome → Piattaforma (colonna del foglio Booking).
//  B = booking, P = privato, A = airbnb.
var PLATFORM_MAP  = { 'B': 'booking', 'P': 'privato', 'A': 'airbnb' };
//  Metti a true per aggiungere una colonna "Canale" in fondo.
var INCLUDE_CHANNEL_COLUMN = false;
//  Mesi italiani → indice (0 = gennaio).
var MESI_IT = {
  gennaio:0, febbraio:1, marzo:2, aprile:3, maggio:4, giugno:5,
  luglio:6, agosto:7, settembre:8, ottobre:9, novembre:10, dicembre:11
};
//  Mesi italiani abbreviati (prime 3 lettere) → indice.
var MESI_ABBR = {
  gen:0, feb:1, mar:2, apr:3, mag:4, giu:5,
  lug:6, ago:7, set:8, ott:9, nov:10, dic:11
};
// ────────────────────────────────────────────────────────────────

// ── CONFIGURAZIONE CALENDARIO ────────────────────────────────────
//  Un calendario Google per appartamento. La chiave e' il NOME del
//  calendario in Google Calendar, il valore e' il nome appartamento.
//  ⚠️ Verifica che "17" sia davvero la Suite (in precedenza era "1").
var CALENDAR_APARTMENT_MAP = {
  '15':  'verde',
  '15A': 'celeste',
  '17':  'suite'
};
//  Quanti mesi in avanti scansionare dalla data odierna.
var CALENDAR_MONTHS_AHEAD = 12;
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

    // ── Azione Alloggiati Web ────────────────────────────────────
    if (data.action === 'alloggiati-send') {
      return doPostAlloggiatiSend_(data);
    }

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

  if (action === 'sync-calendar') {
    return syncCalendarToBooking_();
  }

  if (action === 'portafoglio') {
    return HtmlService.createHtmlOutput(getPortafoglioFormHtml_())
      .setTitle('Casa Paolina — Aggiorna Portafoglio')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  if (action === 'checkin-details') {
    var nome = (e && e.parameter && e.parameter.nome) ? e.parameter.nome : '';
    var cognome = (e && e.parameter && e.parameter.cognome) ? e.parameter.cognome : '';
    return getCheckinDetails_(nome, cognome);
  }

  if (action === 'alloggiati-due') {
    return doGetAlloggiatiDue_();
  }

  if (action === 'alloggiati-preview') {
    return doGetAlloggiatiPreview_(e);
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

function getCheckinDetails_(nome, cognome) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('Prenotazioni');
    
    if (!sheet) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', error: 'Foglio Prenotazioni non trovato' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return ContentService
        .createTextOutput(JSON.stringify({ status: 'error', error: 'Nessun dato trovato' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Search for matching nome/cognome — return the most recent (last row)
    var lastMatch = null;
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowNome = String(row[10] || '').trim();
      var rowCognome = String(row[11] || '').trim();
      
      if (rowNome.toLowerCase() === nome.toLowerCase() && rowCognome.toLowerCase() === cognome.toLowerCase()) {
        lastMatch = row; // Keep updating to get the last/most recent match
      }
    }
    
    if (lastMatch) {
      // Get guests from Ospiti sheet
      var guestSheet = ss.getSheetByName('Ospiti');
      var guests = [];
      
      if (guestSheet) {
        var guestData = guestSheet.getDataRange().getValues();
        var refName = String(lastMatch[10] || '').trim() + ' ' + String(lastMatch[11] || '').trim();
        
        for (var i = 1; i < guestData.length; i++) {
          if (String(guestData[i][1] || '').trim() === refName.trim()) {
            guests.push({
              nome: guestData[i][5] || '',
              cognome: guestData[i][6] || '',
              sesso: guestData[i][7] || '',
              data_nascita: formatSheetDate_(guestData[i][8]) || '',
              comune_nascita: guestData[i][9] || '',
              stato_nascita: guestData[i][10] || '',
              cittadinanza: guestData[i][11] || '',
              comune_res: guestData[i][12] || '',
              stato_res: guestData[i][13] || ''
            });
          }
        }
      }
      
      return ContentService
        .createTextOutput(JSON.stringify({
          status: 'ok',
          details: {
            data_ricezione: lastMatch[0],
            appartamento: lastMatch[1],
            data_arrivo: formatSheetDate_(lastMatch[2]),
            data_partenza: formatSheetDate_(lastMatch[3]),
            notti: lastMatch[4],
            adulti: lastMatch[5],
            bambini: lastMatch[6],
            totale_ospiti: lastMatch[7],
            tipo_soggiorno: lastMatch[8],
            ora_arrivo: lastMatch[9],
            nome: lastMatch[10],
            cognome: lastMatch[11],
            sesso: lastMatch[12],
            data_nascita: formatSheetDate_(lastMatch[13]),
            comune_nascita: lastMatch[14],
            stato_nascita: lastMatch[15],
            cittadinanza: lastMatch[16],
            comune_residenza: lastMatch[17],
            paese_residenza: lastMatch[18],
            tipo_documento: lastMatch[19],
            numero_documento: lastMatch[20],
            stato_rilascio: lastMatch[21],
            comune_rilascio: lastMatch[22],
            email: lastMatch[23],
            telefono: lastMatch[24],
            n_accompagnatori: lastMatch[25],
            note: lastMatch[26],
            guests: guests
          }
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: 'Check-in non trovato' }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getExistingCheckIns_() {
  // Get all completed check-ins from Prenotazioni sheet
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Prenotazioni');
  var existing = {};
  
  if (!sheet) return existing;
  
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return existing;
  
  // Assuming K=Nome (col 11), L=Cognome (col 12), J=Ora Arrivo (col 10)
  for (var i = 1; i < data.length; i++) {
    var nome = String(data[i][10] || '').trim().toLowerCase();
    var cognome = String(data[i][11] || '').trim().toLowerCase();
    if (nome && cognome) {
      var key = nome + '|' + cognome;
      existing[key] = { oraArrivo: String(data[i][9] || '').trim() };
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
    var colPiat   = findCol_(headers, ['piattaforma', 'platform', 'canale', 'channel']);

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
      var ciInfo = existingCheckIns[key];
      var checkinDone = !!ciInfo;

      bookings.push({
        checkin:      colCin    >= 0 ? formatSheetDate_(row[colCin])    : '',
        checkout:     colCout   >= 0 ? formatSheetDate_(row[colCout])   : '',
        appartamento: colApt    >= 0 ? String(row[colApt]    || '').trim() : '',
        nome:         nome,
        cognome:      cognome,
        ospite:       colOspite >= 0 ? String(row[colOspite] || '').trim() : '',
        adults_count: colN      >= 0 ? String(row[colN]      || '').trim() : '',
        piattaforma:  colPiat   >= 0 ? String(row[colPiat]   || '').trim() : '',
        checkin_done: checkinDone,
        ora_arrivo:   ciInfo ? (ciInfo.oraArrivo || '') : ''
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
//  PORTAFOGLIO — importa prenotazioni dal testo del calendario
//
//  Formato evento (3 righe):
//     👤👤(Franca Scaravaggi)B
//     8 – 27 giugno 2026
//     15A
//
//  - numero di 👤  → N° Ospiti
//  - (Nome Cognome) → Nome / Cognome ospite
//  - lettera finale → canale (B = Booking.com, A = Airbnb)
//  - riga date      → CHECK-IN / CHECK-OUT (anche a cavallo di mesi/anni)
//  - codice apt     → 15A=Celeste, 1=Suite, 15=Verde
//
//  Si possono incollare piu' eventi insieme (uno dopo l'altro).
//  Apri la pagina:  <URL_WEB_APP>?action=portafoglio
// ════════════════════════════════════════════════════════════════

// Chiamata dal pulsante della pagina web (google.script.run).
function importPortafoglioFromText(text) {
  try {
    var records = parsePortafoglioText_(text);
    if (!records.length) {
      return { status: 'error', error: 'Nessuna prenotazione riconosciuta nel testo.' };
    }

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(PORTAFOGLIO_SHEET) || ss.insertSheet(PORTAFOGLIO_SHEET);
    if (sheet.getLastRow() === 0) creaIntestazioniPortafoglio_(sheet);

    var existing = getPortafoglioKeys_(sheet);
    var inserted = [], skipped = [], errors = [];

    records.forEach(function(rec) {
      if (rec.error) { errors.push({ raw: rec.raw, error: rec.error }); return; }
      var key = portafoglioKey_(rec);
      if (existing[key]) { skipped.push(formatRecForClient_(rec)); return; }
      sheet.appendRow(buildPortafoglioRow_(rec));
      existing[key] = true;
      inserted.push(formatRecForClient_(rec));
    });

    return { status: 'ok', inserted: inserted, skipped: skipped, errors: errors };

  } catch (err) {
    return { status: 'error', error: err.toString() };
  }
}

// Parsing del testo grezzo → array di record.
function parsePortafoglioText_(text) {
  var lines = String(text || '').split(/\r?\n/);
  var records = [];
  var current = null;
  var monthRe = new RegExp('\\b(' +
    Object.keys(MESI_IT).concat(Object.keys(MESI_ABBR)).join('|') + ')\\b', 'i');

  function pushCurrent() {
    if (current) { records.push(finalizeRecord_(current)); current = null; }
  }

  lines.forEach(function(rawLine) {
    var line = rawLine.trim();
    if (!line) return;

    var nameMatch = line.match(/\(([^)]+)\)/);
    var isDateLine = monthRe.test(line);
    var aptName = mapAppartamento_(line);

    if (nameMatch) {
      // Nuova prenotazione (la riga con il nome apre sempre un record)
      pushCurrent();
      current = { raw: line, persone: countPersone_(line), nameRaw: nameMatch[1].trim() };
      var chMatch = line.match(/\)\s*([A-Za-z]+)/);
      current.canaleCode = chMatch ? chMatch[1].toUpperCase() : '';
    } else if (isDateLine) {
      if (!current) current = { raw: line };
      current.dateRaw = line;
    } else if (aptName) {
      if (!current) current = { raw: line };
      current.aptCode = line.trim().toUpperCase().replace(/\s+/g, '');
      current.appartamento = aptName;
    }
  });
  pushCurrent();
  return records;
}

// Completa il record: nome/cognome, date, validazione.
function finalizeRecord_(rec) {
  var out = {
    raw: rec.raw || '',
    persone: rec.persone || 0,
    appartamento: rec.appartamento || '',
    aptCode: rec.aptCode || '',
    canaleCode: rec.canaleCode || '',
    canale: CHANNEL_MAP[rec.canaleCode] || rec.canaleCode || ''
  };

  if (rec.nameRaw) {
    var parts = rec.nameRaw.split(/\s+/);
    out.nome = splitCamelCase_(parts.shift() || '');
    out.cognome = splitCamelCase_(parts.join(' '));
  } else {
    out.nome = '';
    out.cognome = '';
  }
  if (!out.persone && rec.nameRaw) out.persone = 1;

  var dates = parseDateRange_(rec.dateRaw || '');
  if (dates) {
    out.checkIn = dates.start;
    out.checkOut = dates.end;
  }

  var problems = [];
  if (!rec.nameRaw)        problems.push('nome ospite mancante');
  if (!dates)              problems.push('date non riconosciute' + (rec.dateRaw ? ' ("' + rec.dateRaw + '")' : ''));
  if (!out.appartamento)   problems.push('appartamento non riconosciuto' + (rec.aptCode ? ' ("' + rec.aptCode + '")' : ''));
  if (problems.length)     out.error = problems.join(' | ');

  return out;
}

// Conta le icone persona 👤 nella riga.
function countPersone_(line) {
  var m = String(line).match(/👤/g);
  return m ? m.length : 0;
}

// Stacca le parole "attaccate" da una maiuscola: "MariaSabina" -> "Maria Sabina".
// Inserisce uno spazio tra una lettera minuscola e la maiuscola che segue.
function splitCamelCase_(s) {
  if (!s) return s;
  return String(s).replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, '$1 $2');
}

// Mappa il codice appartamento → nome (null se non riconosciuto).
function mapAppartamento_(line) {
  var code = String(line || '').trim().toUpperCase().replace(/\s+/g, '');
  return APARTMENT_MAP[code] || null;
}

// Interpreta "8 – 27 giugno 2026", "28 giugno – 3 luglio 2026",
// "28 dicembre – 3 gennaio 2026", "28 dicembre 2025 – 3 gennaio 2026",
// e il formato abbreviato "19-Ago", "19-Ago – 25-Ago",
// "19-Ago - 25-Ago 2026". Mesi anche abbreviati (gen, feb, mar, ...).
function parseDateRange_(line) {
  if (!line) return null;
  var s = String(line).replace(/\s+/g, ' ').trim();

  // Normalizza i separatori di INTERVALLO in "|", mantenendo i trattini
  // "interni" dei token tipo 19-Ago (trattino tra cifra e lettera).
  s = s.replace(/\s*[–—→]\s*/g, '|')        // en/em dash, freccia
       .replace(/\s+-\s+/g, '|')             // trattino tra spazi
       .replace(/(\d)\s*-\s*(?=\d)/g, '$1|') // trattino tra due cifre (es. 8-27)
       .replace(/\s+(?:al|a)\s+/gi, '|');    // " al " / " a "

  var parts = s.split('|');
  if (parts.length < 2) return null;

  var left  = parseDateToken_(parts[0]);
  var right = parseDateToken_(parts[parts.length - 1]);
  if (!left || !right) return null;

  // Mese mancante su un lato → eredita dall'altro
  if (left.month === null)  left.month  = right.month;
  if (right.month === null) right.month = left.month;
  if (left.month === null || right.month === null) return null;

  var endYear   = right.year;
  var startYear = left.year;
  if (endYear === null)   endYear   = (startYear !== null) ? startYear : new Date().getFullYear();
  if (startYear === null) {
    startYear = endYear;
    // A cavallo di anno: se il mese d'inizio viene dopo quello di fine
    if (left.month > right.month) startYear = endYear - 1;
  }

  var start = new Date(startYear, left.month, left.day);
  var end   = new Date(endYear, right.month, right.day);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start: start, end: end };
}

// Risolve un nome di mese italiano (completo o abbreviato) → indice 0-11.
function resolveMese_(name) {
  if (name == null) return undefined;
  var key = String(name).toLowerCase().replace(/\./g, '').trim();
  if (MESI_IT[key] !== undefined) return MESI_IT[key];
  var abbr = key.slice(0, 3);
  if (MESI_ABBR[abbr] !== undefined) return MESI_ABBR[abbr];
  return undefined;
}

// Interpreta un singolo estremo di data: "27 giugno 2026", "19-Ago",
// "19 ago 2026", "3 luglio", "12/08/2026", "12/08" o solo "27".
// Ritorna { day, month (0-11 o null), year (numero o null) } oppure null.
function parseDateToken_(token) {
  if (!token) return null;
  token = String(token).trim();
  if (!token) return null;

  // DD/MM/YYYY oppure DD/MM (anche con punti)
  var slash = token.match(/^(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?$/);
  if (slash) {
    var yr = slash[3] ? parseInt(slash[3], 10) : null;
    if (yr !== null && yr < 100) yr += 2000;
    return { day: parseInt(slash[1], 10), month: parseInt(slash[2], 10) - 1, year: yr };
  }

  // DD<sep>Mese[ YYYY]  con sep = spazio o trattino (es. "19-Ago", "27 giugno 2026")
  var dm = token.match(/^(\d{1,2})[\s\-]+([A-Za-zÀ-ù]+)\.?(?:[\s\-]+(\d{4}))?$/);
  if (dm) {
    var m = resolveMese_(dm[2]);
    if (m === undefined) return null;
    return { day: parseInt(dm[1], 10), month: m, year: dm[3] ? parseInt(dm[3], 10) : null };
  }

  // Solo giorno (il mese verra' ereditato dall'altro estremo)
  var d = token.match(/^(\d{1,2})$/);
  if (d) return { day: parseInt(d[1], 10), month: null, year: null };

  return null;
}

// Costruisce la riga nell'ordine delle colonne del foglio.
function buildPortafoglioRow_(rec) {
  var row = [
    rec.checkIn,        // CHECK-IN
    rec.checkOut,       // CHECK-OUT
    rec.appartamento,   // Appartamento
    rec.nome,           // Nome Ospite
    rec.cognome,        // Cognome Ospite
    rec.persone         // N° Ospiti
  ];
  if (INCLUDE_CHANNEL_COLUMN) row.push(rec.canale);
  return row;
}

// Chiave anti-duplicato: data arrivo + appartamento + cognome.
function portafoglioKey_(rec) {
  return [
    rec.checkIn ? rec.checkIn.getTime() : '',
    rec.appartamento,
    String(rec.cognome || '').toLowerCase()
  ].join('|');
}

function getPortafoglioKeys_(sheet) {
  var keys = {};
  var last = sheet.getLastRow();
  if (last < 2) return keys;
  var values = sheet.getRange(2, 1, last - 1, 5).getValues();
  values.forEach(function(r) {
    var ci = (r[0] instanceof Date) ? r[0].getTime() : (r[0] ? new Date(r[0]).getTime() : '');
    keys[[ci, r[2], String(r[4] || '').toLowerCase()].join('|')] = true;
  });
  return keys;
}

function creaIntestazioniPortafoglio_(sheet) {
  var headers = ['CHECK-IN', 'CHECK-OUT', 'Appartamento', 'Nome Ospite', 'Cognome Ospite', 'N° Ospiti'];
  if (INCLUDE_CHANNEL_COLUMN) headers.push('Canale');
  sheet.appendRow(headers);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
  sheet.setFrozenRows(1);
  sheet.getRange(2, 1, sheet.getMaxRows() - 1, 2).setNumberFormat('dd/mm/yyyy');
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 100);
}

function formatRecForClient_(rec) {
  var tz = Session.getScriptTimeZone();
  return {
    nome: rec.nome,
    cognome: rec.cognome,
    appartamento: rec.appartamento,
    checkIn:  rec.checkIn  ? Utilities.formatDate(rec.checkIn,  tz, 'dd/MM/yyyy') : '',
    checkOut: rec.checkOut ? Utilities.formatDate(rec.checkOut, tz, 'dd/MM/yyyy') : '',
    persone: rec.persone,
    canale: rec.canale
  };
}

// Pagina web (textarea + pulsante) servita da doGet?action=portafoglio.
function getPortafoglioFormHtml_() {
  return '' +
'<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">' +
'<style>' +
'*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;background:#f0f2f4;margin:0;padding:24px;color:#1e293b}' +
'.card{max-width:640px;margin:0 auto;background:#fff;border-radius:12px;box-shadow:0 3px 12px rgba(0,0,0,.1);padding:28px}' +
'h1{color:#2c7873;font-size:20px;margin:0 0 4px}p.sub{color:#64748b;font-size:13px;margin:0 0 18px}' +
'textarea{width:100%;min-height:170px;padding:12px;border:2px solid #e2e8f0;border-radius:8px;font-family:monospace;font-size:14px;resize:vertical}' +
'textarea:focus{outline:none;border-color:#2c7873}' +
'button{margin-top:14px;width:100%;padding:13px;background:#2c7873;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:700;cursor:pointer}' +
'button:disabled{opacity:.6;cursor:default}' +
'#result{margin-top:18px;font-size:14px}' +
'.ok{color:#15803d}.warn{color:#b45309}.err{color:#dc2626}' +
'.row{padding:8px 12px;border-radius:6px;margin-bottom:6px;background:#f8fafc;border-left:4px solid #cbd5e1}' +
'.row.ins{border-color:#22c55e}.row.skip{border-color:#f59e0b}.row.bad{border-color:#ef4444}' +
'small{color:#64748b}' +
'</style></head><body>' +
'<div class="card">' +
'<h1>🏠 Casa Paolina — Portafoglio</h1>' +
'<p class="sub">Incolla uno o piu\' eventi dal calendario (3 righe ciascuno) e premi Aggiungi.</p>' +
'<textarea id="txt" placeholder="👤👤(Franca Scaravaggi)B&#10;8 – 27 giugno 2026&#10;15A"></textarea>' +
'<button id="btn" onclick="invia()">Aggiungi al foglio</button>' +
'<div id="result"></div>' +
'</div>' +
'<script>' +
'function esc(s){return String(s==null?"":s).replace(/[&<>]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;"}[c]})}' +
'function invia(){' +
'var t=document.getElementById("txt").value;' +
'var b=document.getElementById("btn");var r=document.getElementById("result");' +
'if(!t.trim()){r.innerHTML="<span class=\\"warn\\">Inserisci almeno un evento.</span>";return;}' +
'b.disabled=true;b.textContent="Attendere...";r.innerHTML="";' +
'google.script.run.withSuccessHandler(function(res){b.disabled=false;b.textContent="Aggiungi al foglio";mostra(res,r);})' +
'.withFailureHandler(function(e){b.disabled=false;b.textContent="Aggiungi al foglio";r.innerHTML="<span class=\\"err\\">Errore: "+esc(e.message)+"</span>";})' +
'.importPortafoglioFromText(t);}' +
'function mostra(res,r){' +
'if(!res||res.status!=="ok"){r.innerHTML="<span class=\\"err\\">"+esc(res&&res.error||"Errore sconosciuto")+"</span>";return;}' +
'var h="";' +
'h+="<p class=\\"ok\\"><b>"+res.inserted.length+"</b> inserite · <b>"+res.skipped.length+"</b> gia\' presenti · <b>"+res.errors.length+"</b> errori</p>";' +
'res.inserted.forEach(function(x){h+="<div class=\\"row ins\\">✅ "+esc(x.nome)+" "+esc(x.cognome)+" — "+esc(x.appartamento)+" — "+esc(x.checkIn)+" → "+esc(x.checkOut)+" · "+esc(x.persone)+"p"+(x.canale?" · "+esc(x.canale):"")+"</div>";});' +
'res.skipped.forEach(function(x){h+="<div class=\\"row skip\\">⏭️ "+esc(x.nome)+" "+esc(x.cognome)+" — "+esc(x.appartamento)+" — "+esc(x.checkIn)+" (gia\' presente)</div>";});' +
'res.errors.forEach(function(x){h+="<div class=\\"row bad\\">⚠️ "+esc(x.error)+"<br><small>"+esc(x.raw)+"</small></div>";});' +
'if(res.inserted.length){document.getElementById("txt").value="";}' +
'r.innerHTML=h;}' +
'</script></body></html>';
}

// Test manuale: seleziona "testPortafoglio" e clicca ▶ Esegui.
function testPortafoglio() {
  var sample =
    '👤👤(Franca Scaravaggi)B\n' +
    '8 – 27 giugno 2026\n' +
    '15A\n' +
    '\n' +
    '👤(Mario Rossi)A\n' +
    '28 giugno – 3 luglio 2026\n' +
    '1\n' +
    '\n' +
    '👤👤👤(Luca Bianchi)B\n' +
    '19-Ago – 25-Ago 2026\n' +
    '15';
  Logger.log(JSON.stringify(parsePortafoglioText_(sample), null, 2));
}


// ════════════════════════════════════════════════════════════════
//  SYNC CALENDARIO → FOGLIO BOOKING
//
//  Legge gli eventi dei calendari per appartamento (15, 15A, 17),
//  li interpreta nel formato Casa Paolina e inserisce una riga nel
//  foglio "Booking" se non gia' presente. Usato dal pulsante
//  "Aggiorna" della dashboard admin (?action=sync-calendar).
//
//  ⚠️ Richiede l'autorizzazione a Google Calendar: la prima volta
//     esegui manualmente "syncCalendarManuale" e accetta i permessi.
// ════════════════════════════════════════════════════════════════

function syncCalendarToBooking_() {
  try {
    var result = doCalendarSync_();
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Esecuzione manuale dall'editor (per autorizzare Calendar e testare).
function syncCalendarManuale() {
  var res = doCalendarSync_();
  Logger.log(JSON.stringify(res, null, 2));
}

function doCalendarSync_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getBookingSheet_(ss);
  if (!sheet) { sheet = ss.insertSheet('Booking'); }
  if (sheet.getLastRow() === 0) creaIntestazioniBooking_(sheet);

  var cols = getBookingColumns_(sheet);
  ensureEventIdColumn_(sheet, cols);          // garantisce la colonna EventId
  var index = getBookingIndex_(sheet, cols);  // righe esistenti per eventId / chiave

  var now   = new Date();
  var start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var end   = new Date(start.getTime());
  end.setMonth(end.getMonth() + CALENDAR_MONTHS_AHEAD);

  var inserted = [], updated = [], skipped = [], cancelled = [], errors = [], calendarsMissing = [];
  var seenEventIds = {};

  Object.keys(CALENDAR_APARTMENT_MAP).forEach(function(calName) {
    var aptName = CALENDAR_APARTMENT_MAP[calName];
    var cals = CalendarApp.getCalendarsByName(calName);
    if (!cals || !cals.length) { calendarsMissing.push(calName); return; }

    cals.forEach(function(cal) {
      var events = cal.getEvents(start, end);
      events.forEach(function(ev) {
        var rec = parseCalendarEvent_(ev, aptName);
        rec.eventId = (ev && ev.getId) ? ev.getId() : '';
        // Segna l'evento come "visto" SEMPRE (anche se in errore), cosi'
        // un evento esistente non viene mai cancellato per sbaglio.
        if (rec.eventId) seenEventIds[rec.eventId] = true;
        if (rec.error) { errors.push({ raw: rec.raw, error: rec.error }); return; }

        // 1) Match per eventId. 2) In fallback adotta una riga legacy
        //    (senza eventId) che combacia per data+appartamento+cognome.
        var existingRow = (rec.eventId && index.byEvent[rec.eventId])
                            ? index.byEvent[rec.eventId].row : null;
        if (existingRow == null) {
          var legacyRow = index.byKey[bookingRecordKey_(rec)];
          if (legacyRow != null) existingRow = legacyRow;
        }

        if (existingRow != null) {
          var dataChanged = updateBookingRowIfChanged_(sheet, existingRow, rec, cols);
          if (dataChanged) updated.push(formatRecForClient_(rec));
          else             skipped.push(formatRecForClient_(rec));
        } else {
          sheet.appendRow(buildBookingRow_(rec, cols));
          if (rec.eventId) index.byEvent[rec.eventId] = { row: sheet.getLastRow() };
          inserted.push(formatRecForClient_(rec));
        }
      });
    });
  });

  // ── CANCELLAZIONI ────────────────────────────────────────────
  //  Righe gestite dal sync (con EventId) il cui evento non esiste piu'
  //  nel calendario. Tocchiamo SOLO i soggiorni futuri nella finestra
  //  scansionata: le prenotazioni passate restano intatte.
  var toDelete = [];
  index.managed.forEach(function(m) {
    if (seenEventIds[m.eventId]) return;            // ancora presente
    if (!m.ciTime) return;                          // senza data: non toccare
    if (m.ciTime < start.getTime()) return;         // passato: non toccare
    if (m.ciTime > end.getTime())  return;          // fuori finestra
    toDelete.push(m);
  });
  // Elimina dal basso verso l'alto per non sfalsare i numeri di riga.
  toDelete.sort(function(a, b) { return b.row - a.row; });
  toDelete.forEach(function(m) {
    cancelled.push({ nome: m.nome, cognome: m.cogn, appartamento: m.apt, checkIn: m.ciStr });
    sheet.deleteRow(m.row);
  });

  // NB: sorting reintrodotto piu' in basso.

  // Ordina le prenotazioni per CHECK-IN crescente (le piu' future in fondo).
  sortBookingByCheckin_(sheet, cols);

  return {
    status: 'ok',
    inserted: inserted,
    updated: updated,
    skipped: skipped,
    cancelled: cancelled,
    errors: errors,
    calendarsMissing: calendarsMissing
  };
}

// Interpreta un evento del calendario → record prenotazione.
function parseCalendarEvent_(ev, calApt) {
  var title = ev.getTitle ? (ev.getTitle() || '') : '';
  var descr = ev.getDescription ? (ev.getDescription() || '') : '';
  var text  = (title + '\n' + descr).trim();
  var rec   = { raw: title, appartamento: calApt || '' };

  // N° ospiti = numero di icone 👤
  rec.persone = (text.match(/👤/g) || []).length;

  // Nome ospite = contenuto tra parentesi ( )
  var nameMatch = text.match(/\(([^)]+)\)/);
  if (nameMatch) {
    var parts = nameMatch[1].trim().split(/\s+/);
    rec.nome = splitCamelCase_(parts.shift() || '');
    rec.cognome = splitCamelCase_(parts.join(' '));
    if (!rec.persone) rec.persone = 1;

    // Canale = lettera subito dopo la parentesi chiusa
    var after = text.slice(text.indexOf(nameMatch[0]) + nameMatch[0].length);
    var chM = after.match(/^\s*([A-Za-z]+)/);
    rec.canaleCode = chM ? chM[1].toUpperCase() : '';
    rec.canale = CHANNEL_MAP[rec.canaleCode] || rec.canaleCode || '';
    rec.piattaforma = PLATFORM_MAP[rec.canaleCode.charAt(0)] || '';
  } else {
    rec.nome = '';
    rec.cognome = '';
  }

  // Date dal CALENDARIO.
  //   check-in  = giorno di inizio evento
  //   check-out = giorno di fine evento
  if (ev.getStartTime) {
    rec.checkIn  = stripTime_(ev.getStartTime());
    rec.checkOut = stripTime_(ev.getEndTime());
  } else {
    // Fallback: eventuali date scritte nel testo dell'evento.
    var dates = parseDateRange_(text.replace(/\n/g, ' '));
    if (dates) {
      rec.checkIn  = stripTime_(dates.start);
      rec.checkOut = stripTime_(dates.end);
    }
  }

  // Garantisce almeno 1 notte: il check-out e' sempre dopo il check-in.
  if (rec.checkIn && rec.checkOut && rec.checkOut.getTime() <= rec.checkIn.getTime()) {
    rec.checkOut = new Date(rec.checkIn.getTime() + 86400000);
  }

  // Appartamento: usa il calendario; in fallback il codice nel testo.
  if (!rec.appartamento) {
    var aptLine = text.split(/\r?\n/).map(function(l){ return mapAppartamento_(l); }).filter(Boolean)[0];
    if (aptLine) rec.appartamento = aptLine;
  }

  var problems = [];
  if (!rec.nome && !rec.cognome) problems.push('nome ospite mancante');
  if (!rec.checkIn || !rec.checkOut) problems.push('date non riconosciute');
  if (!rec.appartamento) problems.push('appartamento non riconosciuto');
  if (problems.length) rec.error = problems.join(' | ') + ' — "' + title + '"';

  return rec;
}

// ── Foglio Booking: utilità colonne / chiavi / righe ─────────────

// Azzera l'orario di una data → mezzanotte (solo giorno).
function stripTime_(date) {
  if (!(date instanceof Date)) return date;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getBookingSheet_(ss) {
  return ss.getSheetByName('Booking')
      || ss.getSheetByName('Prenotazioni Booking')
      || ss.getSheetByName('booking');
}

function getBookingColumns_(sheet) {
  var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0]
                  .map(function(h){ return String(h).trim().toLowerCase(); });
  return {
    width: headers.length,
    cin:    findCol_(headers, ['check-in', 'checkin', 'arrivo', 'data arrivo', 'data-arrivo']),
    cout:   findCol_(headers, ['check-out', 'checkout', 'partenza', 'data partenza', 'data-partenza']),
    apt:    findCol_(headers, ['appartamento', 'appartment', 'apartment', 'apt', 'alloggio']),
    nome:   findCol_(headers, ['nome', 'first name', 'firstname', 'name']),
    cogn:   findCol_(headers, ['cognome', 'last name', 'lastname', 'surname']),
    ospite: findCol_(headers, ['ospite', 'guest', 'nome ospite', 'guest name', 'cliente']),
    n:      findCol_(headers, ['n° ospiti', 'n ospiti', 'ospiti', 'num ospiti', 'guests', 'pax', 'persone']),
    piat:   findCol_(headers, ['piattaforma', 'platform', 'canale', 'channel']),
    evid:   findCol_(headers, ['eventid', 'event id', '_eventid', 'id evento', 'idevento'])
  };
}

function buildBookingRow_(rec, cols) {
  var row = [];
  for (var i = 0; i < cols.width; i++) row.push('');
  if (cols.cin  >= 0) row[cols.cin]  = rec.checkIn;
  if (cols.cout >= 0) row[cols.cout] = rec.checkOut;
  if (cols.apt  >= 0) row[cols.apt]  = rec.appartamento;
  if (cols.nome >= 0) row[cols.nome] = rec.nome;
  if (cols.cogn >= 0) row[cols.cogn] = rec.cognome;
  if (cols.ospite >= 0 && cols.nome < 0 && cols.cogn < 0) {
    row[cols.ospite] = (rec.nome + ' ' + rec.cognome).trim();
  }
  if (cols.n >= 0) row[cols.n] = rec.persone;
  if (cols.piat >= 0) row[cols.piat] = rec.piattaforma || '';
  if (cols.evid >= 0) row[cols.evid] = rec.eventId || '';
  return row;
}

function bookingRecordKey_(rec) {
  var ci = rec.checkIn instanceof Date ? rec.checkIn.getTime() : '';
  return [ci, rec.appartamento, String(rec.cognome || '').toLowerCase()].join('|');
}

function getBookingKeys_(sheet, cols) {
  var keys = {};
  var last = sheet.getLastRow();
  if (last < 2) return keys;
  var values = sheet.getRange(2, 1, last - 1, cols.width).getValues();
  values.forEach(function(r) {
    var cinVal = cols.cin >= 0 ? r[cols.cin] : '';
    var ci = (cinVal instanceof Date) ? cinVal.getTime()
           : (cinVal ? new Date(formatSheetDate_(cinVal)).getTime() : '');
    var apt = cols.apt >= 0 ? r[cols.apt] : '';
    var cogn = cols.cogn >= 0 ? r[cols.cogn]
             : (cols.ospite >= 0 ? String(r[cols.ospite] || '').split(/\s+/).slice(1).join(' ') : '');
    keys[[ci, apt, String(cogn || '').toLowerCase()].join('|')] = true;
  });
  return keys;
}

// Garantisce la colonna "EventId" (id evento Google Calendar). Se manca la
// aggiunge in fondo e aggiorna cols.width / cols.evid.
function ensureEventIdColumn_(sheet, cols) {
  if (cols.evid >= 0) return cols.evid;
  var newColIdx0 = cols.width;          // 0-based: nuova colonna
  sheet.getRange(1, cols.width + 1).setValue('EventId')
    .setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
  cols.width = cols.width + 1;
  cols.evid  = newColIdx0;
  return cols.evid;
}

// Indicizza le righe del foglio Booking:
//   byEvent : eventId  -> { row }
//   byKey   : data|apt|cognome (solo righe SENZA eventId, legacy)
//   managed : righe con eventId (candidate a update/cancellazione)
function getBookingIndex_(sheet, cols) {
  var idx = { byEvent: {}, byKey: {}, managed: [] };
  var last = sheet.getLastRow();
  if (last < 2) return idx;
  var values = sheet.getRange(2, 1, last - 1, cols.width).getValues();
  for (var i = 0; i < values.length; i++) {
    var r = values[i];
    var rowNum = i + 2;
    var cinVal = cols.cin >= 0 ? r[cols.cin] : '';
    var ciTime = (cinVal instanceof Date) ? stripTime_(cinVal).getTime()
               : (cinVal ? new Date(formatSheetDate_(cinVal)).getTime() : 0);
    var apt  = cols.apt  >= 0 ? r[cols.apt]  : '';
    var nome = cols.nome >= 0 ? r[cols.nome] : '';
    var cogn = cols.cogn >= 0 ? r[cols.cogn]
             : (cols.ospite >= 0 ? String(r[cols.ospite] || '').split(/\s+/).slice(1).join(' ') : '');
    var evid = cols.evid >= 0 ? String(r[cols.evid] || '').trim() : '';

    if (evid) {
      idx.byEvent[evid] = { row: rowNum };
      idx.managed.push({
        row: rowNum, eventId: evid,
        ciTime: ciTime || 0,
        ciStr: ciTime ? formatSheetDate_(new Date(ciTime)) : '',
        apt: apt, nome: nome, cogn: cogn
      });
    } else {
      idx.byKey[[ciTime, apt, String(cogn || '').toLowerCase()].join('|')] = rowNum;
    }
  }
  return idx;
}

// Aggiorna una riga esistente solo se i dati gestiti sono cambiati.
// Scrive comunque l'eventId mancante (adozione righe legacy) ma in quel
// caso NON conta come "modifica". Ritorna true se i dati sono cambiati.
function updateBookingRowIfChanged_(sheet, rowNum, rec, cols) {
  var range = sheet.getRange(rowNum, 1, 1, cols.width);
  var row = range.getValues()[0];
  var dataChanged = false, anyChange = false;

  function setData(c, val) {
    if (c < 0) return;
    if (!bookingValuesEqual_(row[c], val)) { row[c] = val; dataChanged = true; anyChange = true; }
  }
  setData(cols.cin,  rec.checkIn);
  setData(cols.cout, rec.checkOut);
  setData(cols.apt,  rec.appartamento);
  if (cols.nome >= 0 || cols.cogn >= 0) {
    setData(cols.nome, rec.nome);
    setData(cols.cogn, rec.cognome);
  } else if (cols.ospite >= 0) {
    setData(cols.ospite, (rec.nome + ' ' + rec.cognome).trim());
  }
  setData(cols.n, rec.persone);
  setData(cols.piat, rec.piattaforma || '');

  // EventId: tagga senza contare come modifica dati.
  if (cols.evid >= 0) {
    var newEv = rec.eventId || row[cols.evid] || '';
    if (!bookingValuesEqual_(row[cols.evid], newEv)) { row[cols.evid] = newEv; anyChange = true; }
  }

  if (anyChange) range.setValues([row]);
  return dataChanged;
}

// Confronto tollerante: date per giorno, resto come stringa trimmata.
function bookingValuesEqual_(a, b) {
  if (a instanceof Date || b instanceof Date) {
    var da = (a instanceof Date) ? stripTime_(a) : (a ? new Date(formatSheetDate_(a)) : null);
    var db = (b instanceof Date) ? stripTime_(b) : (b ? new Date(formatSheetDate_(b)) : null);
    if (!da || !db || isNaN(da.getTime()) || isNaN(db.getTime())) return false;
    return da.getTime() === db.getTime();
  }
  return String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim();
}

// Ordina le righe dati per CHECK-IN crescente (A->Z, le piu' future in fondo).
// Le righe senza data valida vengono messe in coda.
function sortBookingByCheckin_(sheet, cols) {
  if (cols.cin < 0) return;
  var last = sheet.getLastRow();
  if (last < 3) return; // 0/1 riga dati: niente da ordinare
  var range = sheet.getRange(2, 1, last - 1, cols.width);
  var rows = range.getValues();

  function ciTime_(r) {
    var v = r[cols.cin];
    var t = (v instanceof Date) ? stripTime_(v).getTime()
          : (v ? new Date(formatSheetDate_(v)).getTime() : NaN);
    return isNaN(t) ? Infinity : t; // senza data -> in fondo
  }

  rows.sort(function(a, b) { return ciTime_(a) - ciTime_(b); });
  range.setValues(rows);
}

function creaIntestazioniBooking_(sheet) {
  var headers = ['CHECK-IN', 'CHECK-OUT', 'Appartamento', 'Nome', 'Cognome', 'N° Ospiti', 'Piattaforma', 'EventId'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
  // 8 colonne vuote riservate dopo EventId (per IMPORTRANGE verso il 2° foglio).
  sheet.getRange(1, headers.length + 1, 1, 8).setBackground('#d9e8e6');
  sheet.setFrozenRows(1);
}

// ════════════════════════════════════════════════════════════════
//  AGGIORNA COLONNE BOOKING — esegui UNA VOLTA per adeguare un foglio
//  "Booking" gia' esistente: aggiunge la colonna "Piattaforma" dopo
//  "N° Ospiti", garantisce "EventId" e riserva 8 colonne vuote in fondo.
//  Non cancella dati. La colonna Piattaforma viene poi popolata al
//  prossimo "Aggiorna" (sync) per le prenotazioni nella finestra.
// ════════════════════════════════════════════════════════════════
function aggiornaIntestazioniBooking() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getBookingSheet_(ss);
  if (!sheet) { SpreadsheetApp.getUi().alert('Foglio "Booking" non trovato.'); return; }

  var cols = getBookingColumns_(sheet);

  // 1) Colonna "Piattaforma" subito dopo "N° Ospiti" (o in fondo ai dati).
  if (cols.piat < 0) {
    var afterCol = (cols.n >= 0) ? cols.n + 1 : sheet.getLastColumn();
    sheet.insertColumnAfter(afterCol);
    sheet.getRange(1, afterCol + 1).setValue('Piattaforma')
      .setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
    cols = getBookingColumns_(sheet);
  }

  // 2) Garantisci la colonna tecnica EventId.
  ensureEventIdColumn_(sheet, cols);
  cols = getBookingColumns_(sheet);

  // 3) Riserva 8 colonne vuote dopo l'ultima colonna usata.
  var startReserved = sheet.getLastColumn() + 1;
  sheet.getRange(1, startReserved, 1, 8).setBackground('#d9e8e6');

  SpreadsheetApp.getUi().alert(
    'Foglio Booking aggiornato.\n\n' +
    'Aggiunta la colonna "Piattaforma" e riservate 8 colonne vuote.\n' +
    'Premi "Aggiorna" nella dashboard per popolare la Piattaforma.'
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


// ════════════════════════════════════════════════════════════════
//  ALLOGGIATI WEB — Polizia di Stato
//
//  SETUP (una volta sola):
//  1. In Apps Script → Impostazioni progetto → Proprietà script
//  2. Aggiungi le seguenti proprietà:
//       ALLOGGIATI_USER        = il tuo username del portale
//       ALLOGGIATI_PWD         = la tua password
//       ALLOGGIATI_WSKEY       = la tua WsKey (fornita dalla questura)
//       ALLOGGIATI_IDSTRUTTURA = il tuo IdStruttura (numero, uguale a IdUtente)
//
//  COME FUNZIONA:
//  - La dashboard admin mostra i check-in del giorno corrente e precedenti
//    non ancora inviati (sezione "Schedine Questura")
//  - L'admin può visualizzare l'anteprima del testo schedina
//  - Con il tasto "Invia" vengono autenticati e inviati i dati
//  - Ogni invio viene loggato nel foglio "AlloggiatiLog"
//
//  FORMATO SCHEDINA (fixed-width 170 chars per riga):
//  [2]  Tipo alloggiato (es. "16")
//  [10] Data arrivo (DD/MM/YYYY)
//  [3]  Numero notti (right-aligned)
//  [50] Cognome
//  [30] Nome
//  [1]  Sesso (1=M, 2=F)
//  [10] Data nascita (DD/MM/YYYY)
//  [9]  Codice stato di nascita (ISTAT, left-aligned)
//  [6]  Codice comune di nascita (ISTAT 6 cifre, o spazi)
//  [9]  Codice cittadinanza (ISTAT, left-aligned)
//  [5]  Codice tipo documento
//  [20] Numero documento
//  [9]  Codice stato rilascio
//  [6]  Codice comune rilascio (o spazi)
//  = 170 caratteri totali
// ════════════════════════════════════════════════════════════════

var ALLOGGIATI_API_BASE_ = 'https://alloggiatiweb.poliziadistato.it/service/service.svc/';

// ── Credenziali da Script Properties ────────────────────────────
function getAlloggiatiConfig_() {
  var props = PropertiesService.getScriptProperties().getProperties();
  return {
    user:        props['ALLOGGIATI_USER']        || '',
    pwd:         props['ALLOGGIATI_PWD']         || '',
    wsKey:       props['ALLOGGIATI_WSKEY']       || '',
    idStruttura: parseInt(props['ALLOGGIATI_IDSTRUTTURA'] || '0', 10)
  };
}

// ── Autenticazione → { token, idUtente } ────────────────────────
function alloggiatiAuthenticate_(cfg) {
  var resp = UrlFetchApp.fetch(ALLOGGIATI_API_BASE_ + 'authentication', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ Utente: cfg.user, Password: cfg.pwd, WsKey: cfg.wsKey }),
    muteHttpExceptions: true
  });
  var body = JSON.parse(resp.getContentText('UTF-8'));
  if (!body.Acknowledged) {
    throw new Error('Autenticazione fallita: ' + (body.GeneralError || JSON.stringify(body)));
  }
  return { token: body.Token, idUtente: body.IdUtente };
}

// ── Invio schedine → risposta API ───────────────────────────────
function alloggiatiSendRows_(cfg, token, idUtente, rowsText) {
  var resp = UrlFetchApp.fetch(ALLOGGIATI_API_BASE_ + 'sendschedine', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      Utente:       cfg.user,
      token:        token,
      WsKey:        cfg.wsKey,
      IdStruttura:  idUtente || cfg.idStruttura,
      Rows:         rowsText
    }),
    muteHttpExceptions: true
  });
  return JSON.parse(resp.getContentText('UTF-8'));
}

// ── Tabella codici stati ISTAT (usati da Alloggiati Web) ─────────
//  Fonte: tabella STATI scaricabile dal portale Alloggiati Web.
//  Codice stato = numero stringa, padded a 9 char (left-aligned + spazi).
//  Aggiungere paesi mancanti usando la tabella ufficiale.
var ALLOGGIATI_STATI_ = {
  'italia':                '100',
  'italy':                 '100',
  'italiana':              '100',
  'italian':               '100',
  'germania':              '109',
  'germany':               '109',
  'tedesca':               '109',
  'tedesco':               '109',
  'francia':               '116',
  'france':                '116',
  'francese':              '116',
  'spagna':                '113',
  'spain':                 '113',
  'spagnola':              '113',
  'austria':               '103',
  'austriaca':             '103',
  'svizzera':              '167',
  'switzerland':           '167',
  'svizzero':              '167',
  'regno unito':           '219',
  'united kingdom':        '219',
  'gran bretagna':         '219',
  'great britain':         '219',
  'inglese':               '219',
  'britannica':            '219',
  'usa':                   '225',
  'stati uniti':           '225',
  'united states':         '225',
  'americana':             '225',
  'americano':             '225',
  'paesi bassi':           '127',
  'netherlands':           '127',
  'olanda':                '127',
  'olandese':              '127',
  'belgio':                '104',
  'belgium':               '104',
  'belga':                 '104',
  'polonia':               '139',
  'poland':                '139',
  'polacca':               '139',
  'polacco':               '139',
  'romania':               '141',
  'romena':                '141',
  'rumena':                '141',
  'russia':                '166',
  'russian federation':    '166',
  'federazione russa':     '166',
  'russa':                 '166',
  'ucraina':               '232',
  'ukraine':               '232',
  'ucrainese':             '232',
  'albania':               '201',
  'albanese':              '201',
  'rep. ceca':             '108',
  'repubblica ceca':       '108',
  'czech republic':        '108',
  'ceca':                  '108',
  'svezia':                '152',
  'sweden':                '152',
  'svedese':               '152',
  'norvegia':              '125',
  'norway':                '125',
  'norvegese':             '125',
  'danimarca':             '107',
  'denmark':               '107',
  'danese':                '107',
  'finlandia':             '115',
  'finland':               '115',
  'finlandese':            '115',
  'portogallo':            '140',
  'portugal':              '140',
  'portoghese':            '140',
  'grecia':                '120',
  'greece':                '120',
  'greca':                 '120',
  'ungheria':              '122',
  'hungary':               '122',
  'ungherese':             '122',
  'slovacchia':            '142',
  'slovakia':              '142',
  'slovacca':              '142',
  'slovenia':              '144',
  'slovena':               '144',
  'croazia':               '251',
  'croatia':               '251',
  'croata':                '251',
  'serbia':                '274',
  'serba':                 '274',
  'bulgaria':              '105',
  'bulgara':               '105',
  'turchia':               '168',
  'turkey':                '168',
  'turca':                 '168',
  'israele':               '321',
  'israel':                '321',
  'israeliana':            '321',
  'cina':                  '304',
  'china':                 '304',
  'cinese':                '304',
  'giappone':              '319',
  'japan':                 '319',
  'giapponese':            '319',
  'india':                 '311',
  'indiana':               '311',
  'brasile':               '401',
  'brazil':                '401',
  'brasiliana':            '401',
  'argentina':             '402',
  'argentina':             '402',
  'argentina':             '402',
  'canada':                '404',
  'canadese':              '404',
  'australia':             '501',
  'australiana':           '501',
  'nuova zelanda':         '503',
  'new zealand':           '503',
  'sudafrica':             '345',
  'south africa':          '345',
  'marocco':               '339',
  'morocco':               '339',
  'egitto':                '327',
  'egypt':                 '327',
  'messico':               '416',
  'mexico':                '416',
  'colombia':              '406',
  'peru':                  '420',
  'perù':                  '420',
  'venezuela':             '424',
};

function getStatoCodice_(name) {
  if (!name) return '100';
  var key = String(name).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');  // rimuove accenti
  var keyOrig = String(name).toLowerCase().trim();
  if (ALLOGGIATI_STATI_[keyOrig]) return ALLOGGIATI_STATI_[keyOrig];
  if (ALLOGGIATI_STATI_[key])     return ALLOGGIATI_STATI_[key];
  // ricerca parziale
  for (var k in ALLOGGIATI_STATI_) {
    if (key.indexOf(k) >= 0 || k.indexOf(key) >= 0) return ALLOGGIATI_STATI_[k];
  }
  return '100';  // fallback Italia — verificare manualmente
}

function padStatoCodice_(code) {
  return String(code || '100').padEnd(9, ' ').substring(0, 9);
}

// ── Tabella codici tipo documento ────────────────────────────────
var ALLOGGIATI_DOC_ = {
  "carta d'identità":   'IDENT',
  "carta d'identita":   'IDENT',
  "carta di identita":  'IDENT',
  "carta di identità":  'IDENT',
  'identity card':       'IDENT',
  'ci':                  'IDENT',
  'passaporto':          'PASSP',
  'passport':            'PASSP',
  'patente di guida':    'PATEN',
  'patente':             'PATEN',
  'driving license':     'PATEN',
  "driver's license":    'PATEN',
  'permesso di soggiorno': 'PERMS',
  'residence permit':    'PERMS',
  'visto':               'VISTO',
  'visa':                'VISTO',
};

function getDocCodice_(tipo) {
  if (!tipo) return 'IDENT';
  var key = String(tipo).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  var keyOrig = String(tipo).toLowerCase().trim();
  if (ALLOGGIATI_DOC_[keyOrig]) return ALLOGGIATI_DOC_[keyOrig];
  if (ALLOGGIATI_DOC_[key])     return ALLOGGIATI_DOC_[key];
  if (key.indexOf('identit') >= 0) return 'IDENT';
  if (key.indexOf('passp')   >= 0) return 'PASSP';
  if (key.indexOf('paten')   >= 0) return 'PATEN';
  if (key.indexOf('permess') >= 0) return 'PERMS';
  return 'IDENT';
}

// ── Tabella codici ISTAT comuni italiani ─────────────────────────
//  Elenco parziale. Aggiungere comuni mancanti dalla tabella COMUNI
//  scaricabile da alloggiatiweb.poliziadistato.it/PortaleAlloggiati/Tabelle.aspx
var ALLOGGIATI_COMUNI_ = {
  // Lecce e provincia
  'uggiano la chiesa':   '075091',
  'lecce':               '075036',
  'otranto':             '075058',
  'maglie':              '075041',
  'tricase':             '075088',
  'gagliano del capo':   '075028',
  'poggiardo':           '075063',
  'minervino di lecce':  '075045',
  'martano':             '075043',
  'muro leccese':        '075051',
  'palmariggi':          '075059',
  'giurdignano':         '075030',
  'calimera':            '075012',
  'carpignano salentino':'075017',
  'castrignano dei greci':'075020',
  'melendugno':          '075044',
  'vernole':             '075093',
  'alliste':             '075002',
  'aradeo':              '075004',
  'campi salentina':     '075013',
  'carmiano':            '075015',
  'casarano':            '075019',
  'cavallino':           '075021',
  'copertino':           '075024',
  'corigliano d otranto':'075025',
  'cursi':               '075026',
  'cutrofiano':          '075027',
  'gallipoli':           '075029',
  'galatina':            '075031',
  'galatone':            '075032',
  'lequile':             '075038',
  'leverano':            '075039',
  'nardo':               '075053',
  'nardò':               '075053',
  'neviano':             '075054',
  'parabita':            '075060',
  'presicce':            '075067',
  'racale':              '075069',
  'ruffano':             '075074',
  'salve':               '075075',
  'sanarica':            '075076',
  'specchia':            '075083',
  'sternatia':           '075084',
  'supersano':           '075085',
  'surbo':               '075086',
  'taurisano':           '075087',
  'tuglie':              '075089',
  'ugento':              '075090',
  // Brindisi e provincia
  'brindisi':            '074002',
  'fasano':              '074008',
  'francavilla fontana': '074011',
  'mesagne':             '074014',
  'ostuni':              '074018',
  'san vito dei normanni':'074021',
  // Taranto e provincia
  'taranto':             '073027',
  'grottaglie':          '073010',
  'manduria':            '073013',
  'massafra':            '073014',
  // Bari e provincia
  'bari':                '072006',
  'altamura':            '072003',
  'bitonto':             '072013',
  'gravina in puglia':   '072022',
  'molfetta':            '072031',
  'monopoli':            '072032',
  'ruvo di puglia':      '072038',
  'santeramo in colle':  '072043',
  // Foggia e provincia
  'foggia':              '071024',
  'cerignola':           '071015',
  'lucera':              '071030',
  'manfredonia':         '071031',
  'san severo':          '071048',
  // Altre città principali
  'roma':                '058091',
  'milano':              '015146',
  'napoli':              '063049',
  'torino':              '001272',
  'palermo':             '082053',
  'genova':              '010025',
  'bologna':             '037006',
  'firenze':             '048017',
  'catania':             '087015',
  'venezia':             '027042',
  'verona':              '023091',
  'messina':             '083048',
  'padova':              '028060',
  'trieste':             '032006',
  'brescia':             '017029',
  'prato':               '100003',
  'modena':              '036023',
  'reggio calabria':     '080063',
  'reggio emilia':       '035033',
  'perugia':             '054039',
  'livorno':             '049009',
  'cagliari':            '092009',
  'salerno':             '065116',
  'ferrara':             '038008',
  'rimini':              '099008',
  'ravenna':             '039014',
  'sassari':             '090059',
  'latina':              '059011',
  'bergamo':             '016024',
  'vicenza':             '024116',
  'trento':              '022205',
  'bolzano':             '021008',
  'ancona':              '042002',
  'pesaro':              '041037',
  'terni':               '055032',
  'novara':              '003122',
  'piacenza':            '033032',
  'parma':               '034027',
  'reggio nell emilia':  '035033',
  'siena':               '052032',
  'pisa':                '050026',
  'arezzo':              '051002',
  'lucca':               '046017',
  'pistoia':             '047014',
  'cosenza':             '078040',
  'catanzaro':           '079024',
  'potenza':             '076063',
  'matera':              '077014',
  'campobasso':          '070006',
  'isernia':             '094021',
  'pescara':             '068028',
  'chieti':              '069024',
  'teramo':              '067042',
  "l'aquila":            '066049',
  'frosinone':           '060050',
  'viterbo':             '056059',
  'rieti':               '057059',
  'avellino':            '064009',
  'benevento':           '062008',
  'caserta':             '061027',
  'ragusa':              '088008',
  'siracusa':            '089018',
  'enna':                '086010',
  'caltanissetta':       '085006',
  'agrigento':           '084001',
  'trapani':             '081023',
  'nuoro':               '091052',
};

function getComuneCodice_(nome) {
  if (!nome) return '      ';
  var key = String(nome).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  var keyOrig = String(nome).toLowerCase().trim();
  if (ALLOGGIATI_COMUNI_[keyOrig]) return ALLOGGIATI_COMUNI_[keyOrig];
  if (ALLOGGIATI_COMUNI_[key])     return ALLOGGIATI_COMUNI_[key];
  // ricerca parziale
  for (var k in ALLOGGIATI_COMUNI_) {
    if (key === k || key.indexOf(k) >= 0 || k.indexOf(key) >= 0) return ALLOGGIATI_COMUNI_[k];
  }
  return '      ';  // sconosciuto → 6 spazi — aggiungere alla tabella COMUNI
}

// ── Costruisce una singola riga schedina (170 chars fixed-width) ──
function buildSchedinRow_(ospite, dataArrivo, notti) {
  function padR(s, n) { return String(s == null ? '' : s).padEnd(n, ' ').substring(0, n); }
  function padL(s, n) { return String(s == null ? '' : s).padStart(n, ' ').substring(0, n); }

  function fmtDate(d) {
    if (!d) return '          ';
    var s = String(d).trim();
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[3] + '/' + iso[2] + '/' + iso[1];
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
    return '          ';
  }

  var tipo       = padR(ospite.tipo || '16', 2);
  var arrivo     = fmtDate(dataArrivo || ospite.data_arrivo);
  var nottiStr   = padL(String(parseInt(notti || ospite.notti || 1)), 3);
  var cognome    = padR(ospite.cognome, 50);
  var nome       = padR(ospite.nome, 30);
  var sesso      = String(ospite.sesso || '1').trim().toUpperCase();
  if (sesso === 'M' || sesso === 'MASCHIO' || sesso === 'MALE')   sesso = '1';
  if (sesso === 'F' || sesso === 'FEMMINA' || sesso === 'FEMALE') sesso = '2';
  sesso = sesso.charAt(0);

  var nascita    = fmtDate(ospite.data_nascita);
  var statoNasc  = padStatoCodice_(getStatoCodice_(ospite.stato_nascita || 'Italia'));
  var comuneNasc = padR(getComuneCodice_(ospite.comune_nascita), 6);
  var citt       = padStatoCodice_(getStatoCodice_(ospite.cittadinanza || 'Italiana'));
  var tipoDoc    = padR(getDocCodice_(ospite.tipo_doc), 5);
  var numDoc     = padR(ospite.num_doc, 20);
  var statoRil   = padStatoCodice_(getStatoCodice_(ospite.stato_rilascio || 'Italia'));
  var comuneRil  = padR(getComuneCodice_(ospite.comune_rilascio), 6);

  var row = tipo + arrivo + nottiStr + cognome + nome + sesso + nascita +
            statoNasc + comuneNasc + citt + tipoDoc + numDoc + statoRil + comuneRil;

  if (row.length !== 170) {
    Logger.log('ATTENZIONE: riga schedina lunghezza ' + row.length + ' (attesa 170)');
  }
  return row;
}

// ── Recupera check-in con schedina da inviare ────────────────────
//  Restituisce le prenotazioni con data_arrivo <= oggi non ancora
//  inviate con successo (non presenti nel foglio AlloggiatiLog).
function getAlloggiatiDue_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Prenotazioni');
  if (!sheet || sheet.getLastRow() < 2) return [];

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var sent  = getAlloggiatiSentKeys_();

  var rows = sheet.getDataRange().getValues();
  var due  = [];

  for (var i = 1; i < rows.length; i++) {
    var r    = rows[i];
    var dVal = r[2];  // C = Data Arrivo
    var d;
    if (dVal instanceof Date) {
      d = new Date(dVal.getFullYear(), dVal.getMonth(), dVal.getDate());
    } else {
      var ds = formatSheetDate_(dVal);
      d = ds ? new Date(ds) : null;
    }
    if (!d || isNaN(d.getTime())) continue;
    if (d > today) continue;  // prenotazioni future → skip

    var nome    = String(r[10] || '').trim();
    var cognome = String(r[11] || '').trim();
    var apt     = String(r[1]  || '').trim();
    var key     = formatSheetDate_(d) + '|' + apt.toLowerCase() + '|' +
                  (nome + ' ' + cognome).toLowerCase().trim();

    due.push({
      key:            key,
      data_arrivo:    formatSheetDate_(d),
      data_partenza:  formatSheetDate_(r[3]),
      appartamento:   apt,
      notti:          parseInt(r[4]) || 1,
      adulti:         parseInt(r[5]) || 1,
      bambini:        parseInt(r[6]) || 0,
      nome:           nome,
      cognome:        cognome,
      sesso:          String(r[12] || '').trim(),
      data_nascita:   formatSheetDate_(r[13]),
      comune_nascita: String(r[14] || '').trim(),
      stato_nascita:  String(r[15] || '').trim(),
      cittadinanza:   String(r[16] || '').trim(),
      comune_res:     String(r[17] || '').trim(),
      stato_res:      String(r[18] || '').trim(),
      tipo_doc:       String(r[19] || '').trim(),
      num_doc:        String(r[20] || '').trim(),
      stato_rilascio: String(r[21] || '').trim(),
      comune_rilascio:String(r[22] || '').trim(),
      email:          String(r[23] || '').trim(),
      telefono:       String(r[24] || '').trim(),
      n_acc:          parseInt(r[25]) || 0,
      already_sent:   !!sent[key]
    });
  }

  // Carica i dati degli accompagnatori dal foglio Ospiti
  var gSheet = ss.getSheetByName('Ospiti');
  if (gSheet && gSheet.getLastRow() > 1) {
    var gRows = gSheet.getDataRange().getValues();
    due.forEach(function(item) {
      var refName = (item.nome + ' ' + item.cognome).trim();
      var guests  = [];
      for (var j = 1; j < gRows.length; j++) {
        var gr = gRows[j];
        var checkinArrivo = formatSheetDate_(gr[2]);  // colonna C = Data Arrivo
        if (String(gr[1] || '').trim() === refName &&
            checkinArrivo === item.data_arrivo) {
          guests.push({
            nome:           String(gr[5]  || '').trim(),
            cognome:        String(gr[6]  || '').trim(),
            sesso:          String(gr[7]  || '').trim(),
            data_nascita:   formatSheetDate_(gr[8]),
            comune_nascita: String(gr[9]  || '').trim(),
            stato_nascita:  String(gr[10] || '').trim(),
            cittadinanza:   String(gr[11] || '').trim(),
            comune_res:     String(gr[12] || '').trim(),
            stato_res:      String(gr[13] || '').trim()
          });
        }
      }
      item.guests = guests;
    });
  } else {
    due.forEach(function(item) { item.guests = []; });
  }

  return due;
}

// ── Costruisce il testo schedina completo per una prenotazione ───
function buildAlloggiatiText_(checkinData) {
  var lines  = [];
  var arrivo = checkinData.data_arrivo;
  var notti  = checkinData.notti || 1;

  // Ospite referente (tipo 16)
  lines.push(buildSchedinRow_({
    tipo:           '16',
    cognome:        checkinData.cognome,
    nome:           checkinData.nome,
    sesso:          checkinData.sesso,
    data_nascita:   checkinData.data_nascita,
    stato_nascita:  checkinData.stato_nascita,
    comune_nascita: checkinData.comune_nascita,
    cittadinanza:   checkinData.cittadinanza,
    tipo_doc:       checkinData.tipo_doc,
    num_doc:        checkinData.num_doc,
    stato_rilascio: checkinData.stato_rilascio,
    comune_rilascio:checkinData.comune_rilascio
  }, arrivo, notti));

  // Accompagnatori
  (checkinData.guests || []).forEach(function(g) {
    lines.push(buildSchedinRow_({
      tipo:           '16',
      cognome:        g.cognome,
      nome:           g.nome,
      sesso:          g.sesso,
      data_nascita:   g.data_nascita,
      stato_nascita:  g.stato_nascita,
      comune_nascita: g.comune_nascita,
      cittadinanza:   g.cittadinanza,
      tipo_doc:       '',
      num_doc:        '',
      stato_rilascio: '',
      comune_rilascio:''
    }, arrivo, notti));
  });

  return lines.join('\r\n');
}

// ── Foglio log invii ─────────────────────────────────────────────
function getAlloggiatiLogSheet_() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AlloggiatiLog');
  if (!sheet) {
    sheet = ss.insertSheet('AlloggiatiLog');
    var h = ['Data Invio', 'Appartamento', 'Data Arrivo', 'Ospite', 'Ricevuta', 'Esito', 'Key', 'Dettaglio'];
    sheet.appendRow(h);
    sheet.getRange(1, 1, 1, h.length)
      .setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff').setFontSize(10);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(4, 200);
    sheet.setColumnWidth(7, 250);
  }
  return sheet;
}

function getAlloggiatiSentKeys_() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('AlloggiatiLog');
  var keys  = {};
  if (!sheet || sheet.getLastRow() < 2) return keys;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
  data.forEach(function(row) {
    if (String(row[5] || '').trim() === 'OK') {
      keys[String(row[6] || '').trim()] = true;  // col G = Key
    }
  });
  return keys;
}

function logAlloggiatiSend_(checkinData, esito, ricevuta, dettaglio) {
  var sheet = getAlloggiatiLogSheet_();
  sheet.appendRow([
    new Date(),
    checkinData.appartamento,
    checkinData.data_arrivo,
    (checkinData.nome + ' ' + checkinData.cognome).trim(),
    ricevuta || '',
    esito,
    checkinData.key || '',
    dettaglio || ''
  ]);
}

// ── Azione GET: alloggiati-due ───────────────────────────────────
function doGetAlloggiatiDue_() {
  try {
    var due = getAlloggiatiDue_();
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', due: due }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Azione GET: alloggiati-preview ───────────────────────────────
function doGetAlloggiatiPreview_(e) {
  try {
    var key = (e && e.parameter && e.parameter.key) ? decodeURIComponent(e.parameter.key) : '';
    if (!key) throw new Error('Parametro "key" mancante');

    var due   = getAlloggiatiDue_();
    var found = null;
    for (var i = 0; i < due.length; i++) {
      if (due[i].key === key) { found = due[i]; break; }
    }
    if (!found) throw new Error('Check-in non trovato per la chiave specificata');

    var rows = buildAlloggiatiText_(found);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', preview: rows, data: found }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Azione POST: alloggiati-send ─────────────────────────────────
function doPostAlloggiatiSend_(data) {
  var key = data.key;
  if (!key) throw new Error('Chiave check-in mancante');

  var due   = getAlloggiatiDue_();
  var found = null;
  for (var i = 0; i < due.length; i++) {
    if (due[i].key === key) { found = due[i]; break; }
  }
  if (!found)             throw new Error('Check-in non trovato');
  if (found.already_sent) throw new Error('Schedina già inviata per questo check-in');

  var cfg = getAlloggiatiConfig_();
  if (!cfg.user || !cfg.wsKey) {
    throw new Error(
      'Credenziali Alloggiati non configurate. ' +
      'Aggiungi ALLOGGIATI_USER, ALLOGGIATI_PWD, ALLOGGIATI_WSKEY ' +
      'nelle Script Properties.'
    );
  }

  var auth  = alloggiatiAuthenticate_(cfg);
  var rows  = buildAlloggiatiText_(found);
  var resp  = alloggiatiSendRows_(cfg, auth.token, auth.idUtente, rows);

  if (!resp.Acknowledged) {
    var errMsg = resp.GeneralError || JSON.stringify(resp);
    logAlloggiatiSend_(found, 'ERRORE', '', errMsg);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: 'Invio fallito: ' + errMsg }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  logAlloggiatiSend_(found, 'OK', resp.NumRicevuta || resp.GeneralMessage || '', '');
  return ContentService
    .createTextOutput(JSON.stringify({
      status:   'ok',
      ricevuta: resp.NumRicevuta || '',
      message:  resp.GeneralMessage || 'Schedina inviata con successo'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Test manuale da editor ───────────────────────────────────────
//  Seleziona "testAlloggiatiPreview" e clicca ▶ Esegui per
//  visualizzare nel log il testo schedina del primo check-in pendente.
function testAlloggiatiPreview() {
  var due = getAlloggiatiDue_();
  if (!due.length) { Logger.log('Nessun check-in in attesa di schedina'); return; }
  var testo = buildAlloggiatiText_(due[0]);
  Logger.log('== SCHEDINA PREVIEW ==');
  Logger.log('Key: ' + due[0].key);
  Logger.log('Righe:\n' + testo);
  Logger.log('Lunghezza prima riga: ' + testo.split('\r\n')[0].length);
}

// ── Setup: configura le Script Properties ───────────────────────
//  Modifica i valori qui sotto, poi esegui "setupAlloggiatiProperties".
function setupAlloggiatiProperties() {
  // ⚠️ COMPILARE prima di eseguire:
  var USER         = '';  // es. 'casapaolina'
  var PWD          = '';  // password del portale
  var WSKEY        = '';  // WsKey fornita dalla questura
  var ID_STRUTTURA = '';  // IdStruttura numerico

  if (!USER || !PWD || !WSKEY || !ID_STRUTTURA) {
    SpreadsheetApp.getUi().alert(
      '⚠️ Compilare prima i valori USER, PWD, WSKEY e ID_STRUTTURA\n' +
      'nel corpo della funzione setupAlloggiatiProperties().'
    );
    return;
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty('ALLOGGIATI_USER',        USER);
  props.setProperty('ALLOGGIATI_PWD',         PWD);
  props.setProperty('ALLOGGIATI_WSKEY',       WSKEY);
  props.setProperty('ALLOGGIATI_IDSTRUTTURA', ID_STRUTTURA);

  SpreadsheetApp.getUi().alert('✅ Credenziali Alloggiati Web salvate nelle Script Properties.');
}