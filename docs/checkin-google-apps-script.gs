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
    if (data.action === 'alloggiati-send-simulate') {
      return doPostAlloggiatiSendSimulate_(data);
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

  if (action === 'alloggiati-validate') {
    return doGetAlloggiatiValidate_(e);
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
//  FORMATO SCHEDINA (fixed-width, Tabella 1 — tracciato ufficiale):
//  [0-1]    [2]   Tipo Alloggiato (es. "16")
//  [2-11]   [10]  Data Arrivo (gg/mm/aaaa)
//  [12-13]  [2]   Numero Giorni Permanenza (max 30, right-aligned)
//  [14-63]  [50]  Cognome
//  [64-93]  [30]  Nome
//  [94]     [1]   Sesso (1=M, 2=F)
//  [95-104] [10]  Data Nascita (gg/mm/aaaa)
//  [105-113][9]   Comune Nascita (cod. ISTAT 6 cifre + 3 spazi; spazi se estero)
//  [114-115][2]   Provincia Nascita (sigla; spazi se estero)
//  [116-124][9]   Stato Nascita (cod. ISTAT, left-aligned)
//  [125-133][9]   Cittadinanza (cod. ISTAT, left-aligned)
//  [134-138][5]   Tipo Documento
//  [139-158][20]  Numero Documento
//  [159-167][9]   Luogo Rilascio Documento (cod. Stato o Comune)
//  = 168 caratteri dati + CR+LF separatore (tranne ultima riga) = 170 per riga
// ════════════════════════════════════════════════════════════════

var ALLOGGIATI_API_BASE_ = 'https://alloggiatiweb.poliziadistato.it/PortaleAlloggiati/Service/Service.svc/';

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

// ── Autenticazione SOAP GenerateToken → { token, idUtente, issued, expires } ──
function alloggiatiAuthenticate_(cfg) {
  var envelope =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope' +
      ' xmlns:soap="http://www.w3.org/2003/05/soap-envelope"' +
      ' xmlns:all="AlloggiatiService">' +
      '<soap:Header/>' +
      '<soap:Body>' +
        '<all:GenerateToken>' +
          '<all:Utente>'   + xmlEscape_(cfg.user)  + '</all:Utente>' +
          '<all:Password>' + xmlEscape_(cfg.pwd)   + '</all:Password>' +
          '<all:WsKey>'    + xmlEscape_(cfg.wsKey) + '</all:WsKey>' +
        '</all:GenerateToken>' +
      '</soap:Body>' +
    '</soap:Envelope>';

  var resp = UrlFetchApp.fetch(ALLOGGIATI_SOAP_URL_, {
    method:      'post',
    contentType: 'application/soap+xml; charset=utf-8',
    payload:     envelope,
    muteHttpExceptions: true,
    headers: { 'SOAPAction': 'AlloggiatiService/GenerateToken' }
  });

  var statusCode = resp.getResponseCode();
  var xml        = resp.getContentText('UTF-8');

  if (statusCode !== 200) {
    throw new Error(
      'GenerateToken HTTP ' + statusCode + '.\n' +
      'Risposta: ' + xml.substring(0, 300)
    );
  }

  // Controlla esito
  var esitoMatch = xml.match(/<result>[\s\S]*?<esito>(true|false)<\/esito>/i);
  if (esitoMatch && esitoMatch[1].toLowerCase() !== 'true') {
    var errDes = (xml.match(/<result>[\s\S]*?<ErroreDes>([^<]+)<\/ErroreDes>/i) || [])[1] || '';
    var errDet = (xml.match(/<result>[\s\S]*?<ErroreDettaglio>([^<]+)<\/ErroreDettaglio>/i) || [])[1] || '';
    throw new Error('GenerateToken fallito: ' + errDes + (errDet ? ' — ' + errDet : '') +
                    '\nXML: ' + xml.substring(0, 400));
  }

  var tokenMatch   = xml.match(/<token>([^<]+)<\/token>/i);
  var issuedMatch  = xml.match(/<issued>([^<]+)<\/issued>/i);
  var expiresMatch = xml.match(/<expires>([^<]+)<\/expires>/i);

  if (!tokenMatch || !tokenMatch[1].trim()) {
    throw new Error('Token non trovato nella risposta SOAP:\n' + xml.substring(0, 400));
  }

  return {
    token:    tokenMatch[1].trim(),
    issued:   issuedMatch  ? issuedMatch[1].trim()  : '',
    expires:  expiresMatch ? expiresMatch[1].trim() : '',
    idUtente: cfg.idStruttura   // compatibilità con alloggiatiSendRows_
  };
}

// ── Verifica validità token (SOAP Authentication_Test) ───────────
function alloggiatiAuthTest_(utente, token) {
  var envelope =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope' +
      ' xmlns:soap="http://www.w3.org/2003/05/soap-envelope"' +
      ' xmlns:all="AlloggiatiService">' +
      '<soap:Header/>' +
      '<soap:Body>' +
        '<all:Authentication_Test>' +
          '<all:Utente>' + xmlEscape_(utente) + '</all:Utente>' +
          '<all:token>'  + xmlEscape_(token)  + '</all:token>' +
        '</all:Authentication_Test>' +
      '</soap:Body>' +
    '</soap:Envelope>';

  var resp = UrlFetchApp.fetch(ALLOGGIATI_SOAP_URL_, {
    method:      'post',
    contentType: 'application/soap+xml; charset=utf-8',
    payload:     envelope,
    muteHttpExceptions: true,
    headers: { 'SOAPAction': 'AlloggiatiService/Authentication_Test' }
  });

  var xml = resp.getContentText('UTF-8');
  var esito  = (xml.match(/<esito>(true|false)<\/esito>/i) || [])[1] || '?';
  var errDes = (xml.match(/<ErroreDes>([^<]+)<\/ErroreDes>/i) || [])[1] || '';
  var errDet = (xml.match(/<ErroreDettaglio>([^<]+)<\/ErroreDettaglio>/i) || [])[1] || '';
  return { esito: esito.toLowerCase() === 'true', erroreDes: errDes, erroreDettaglio: errDet, xml: xml };
}

// ── Invio schedine via SOAP Send (stessa struttura di alloggiatiSoapTest_) ──
function alloggiatiSendRows_(cfg, token, idUtente, rowsText) {
  // rowsText può essere stringa (righe separate da \r\n) o array
  var schedine = Array.isArray(rowsText)
    ? rowsText
    : String(rowsText).split('\r\n').filter(function(s) { return s.length > 0; });

  var schedineTags = schedine.map(function(s) {
    return '<all:string xml:space="preserve">' + xmlEscape_(s) + '</all:string>';
  }).join('');

  var envelope =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope' +
      ' xmlns:soap="http://www.w3.org/2003/05/soap-envelope"' +
      ' xmlns:all="AlloggiatiService">' +
      '<soap:Header/>' +
      '<soap:Body>' +
        '<all:Send>' +
          '<all:Utente>' + xmlEscape_(cfg.user) + '</all:Utente>' +
          '<all:token>'  + xmlEscape_(token)    + '</all:token>' +
          '<all:ElencoSchedine>' + schedineTags + '</all:ElencoSchedine>' +
        '</all:Send>' +
      '</soap:Body>' +
    '</soap:Envelope>';

  var resp = UrlFetchApp.fetch(ALLOGGIATI_SOAP_URL_, {
    method:      'post',
    contentType: 'application/soap+xml; charset=utf-8',
    payload:     envelope,
    muteHttpExceptions: true,
    headers: { 'SOAPAction': 'AlloggiatiService/Send' }
  });

  return {
    statusCode: resp.getResponseCode(),
    xml:        resp.getContentText('UTF-8')
  };
}

// ── Tabella codici stati ISTAT (usati da Alloggiati Web) ─────────
//  Fonte: tabella STATI scaricabile dal portale Alloggiati Web.
//  Codice stato = numero stringa, padded a 9 char (left-aligned + spazi).
//  Aggiungere paesi mancanti usando la tabella ufficiale.
// ── Normalizza chiave per lookup (minuscolo, senza accenti, apostrofi→spazio) ─
function normalizeAlloggiatiKey_(s) {
  return String(s || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/['\u2019\u2018`]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// ── Tabella codici stati ISTAT (codici 9 cifre da tabella ufficiale Alloggiati Web) ─
var ALLOGGIATI_STATI_ = {
  'afghanistan':'100000301','albania':'100000201','algeria':'100000401',
  'andorra':'100000202','angola':'100000402','apolide':'100000999',
  'arabia saudita':'100000302','argentina':'100000602','armenia':'100000358',
  'australia':'100000701','austria':'100000203','austriaca':'100000203',
  'azerbaigian':'100000359','bahamas':'100000505','bahrein':'100000304',
  'bangladesh':'100000305','barbados':'100000506','belgio':'100000206',
  'belga':'100000206','bielorussia':'100000256','bolivia':'100000604',
  'bosnia ed erzegovina':'100000252','bosniaca':'100000252',
  'botswana':'100000408','brasile':'100000605','brasiliana':'100000605',
  'brunei darussalam':'100000309','bulgaria':'100000209','bulgara':'100000209',
  'burkina faso':'100000409','burundi':'100000410','cambogia':'100000310',
  'camerun':'100000411','canada':'100000509','canadese':'100000509',
  'capo verde':'100000413','ciad':'100000415','cile':'100000606',
  'cina':'100000314','cinese':'100000314','cipro':'100000315',
  'colombia':'100000608','comore':'100000417','congo':'100000418',
  'corea del nord':'100000319','corea del sud':'100000320',
  'costa d avorio':'100000404','costa rica':'100000513',
  'croazia':'100000250','croata':'100000250',
  'cuba':'100000514','danimarca':'100000212','danese':'100000212',
  'ecuador':'100000609','egitto':'100000419','eritrea':'100000466',
  'estonia':'100000247','etiopia':'100000420',
  'federazione russa':'100000245','russa':'100000245','russia':'100000245',
  'figi':'100000703','filippine':'100000323',
  'finlandia':'100000214','finlandese':'100000214',
  'francia':'100000215','francese':'100000215',
  'gabon':'100000421','gambia':'100000422','georgia':'100000360',
  'germania':'100000216','tedesca':'100000216','tedesco':'100000216',
  'ghana':'100000423','giamaica':'100000518',
  'giappone':'100000326','giapponese':'100000326',
  'gibuti':'100000424','giordania':'100000327',
  'grecia':'100000220','greca':'100000220','greco':'100000220',
  'grenada':'100000519','guatemala':'100000523',
  'guinea':'100000425','guinea bissau':'100000426',
  'guinea equatoriale':'100000427','guyana':'100000612',
  'haiti':'100000524','honduras':'100000525',
  'india':'100000330','indiana':'100000330','indiano':'100000330',
  'indonesia':'100000331','iran':'100000332','iraq':'100000333',
  'irlanda':'100000221','islanda':'100000223',
  'israele':'100000334','israeliana':'100000334',
  'italia':'100000100','italiana':'100000100','italiano':'100000100',
  'kazakistan':'100000356','kenya':'100000428','kirghizistan':'100000361',
  'kuwait':'100000335','laos':'100000336','lesotho':'100000429',
  'lettonia':'100000248','libano':'100000337','liberia':'100000430',
  'libia':'100000431','liechtenstein':'100000225','lituania':'100000249',
  'lussemburgo':'100000226','madagascar':'100000432','malawi':'100000434',
  'malaysia':'100000767','maldive':'100000339','mali':'100000435',
  'malta':'100000227','marocco':'100000436','marocchina':'100000436',
  'mauritania':'100000437','maurizio':'100000438','messico':'100000527',
  'moldavia':'100000254','monaco':'100000229','mongolia':'100000341',
  'montenegro':'100001000','mozambico':'100000440','namibia':'100000441',
  'nepal':'100000342','nicaragua':'100000529','niger':'100000442',
  'nigeria':'100000443','norvegia':'100000231','norvegese':'100000231',
  'nuova zelanda':'100000719','oman':'100000343',
  'paesi bassi':'100000232','olanda':'100000232','olandese':'100000232',
  'pakistan':'100000344','palestina':'110000001','panama':'100000530',
  'paraguay':'100000614','peru':'100000615','peruviana':'100000615',
  'polonia':'100000233','polacca':'100000233','polacco':'100000233',
  'portogallo':'100000234','portoghese':'100000234','qatar':'100000345',
  'regno unito':'100000219','inglese':'100000219','britannica':'100000219',
  'gran bretagna':'100000219','great britain':'100000219',
  'united kingdom':'100000219',
  'repubblica ceca':'100000257','ceca':'100000257',
  'repubblica centrafricana':'100000414',
  'repubblica dominicana':'100000516',
  'repubblica slovacca':'100000255','slovacca':'100000255',
  'romania':'100000235','romena':'100000235','rumena':'100000235',
  'ruanda':'100000446','san marino':'100000236',
  'sao tome e principe':'100000448',
  'senegal':'100000450','serbia':'100001000','serba':'100001000',
  'seychelles':'100000449','sierra leone':'100000451',
  'singapore':'100000346','siria':'100000348',
  'slovenia':'100000251','slovena':'100000251',
  'somalia':'100000453','spagna':'100000239','spagnola':'100000239',
  'sri lanka':'100000311','stati uniti':'100000536',
  'stati uniti d america':'100000536','usa':'100000536',
  'americana':'100000536','americano':'100000536',
  'united states':'100000536',
  'stato della citta del vaticano':'100000246','vaticano':'100000246',
  'sud sudan':'100000467','sudafrica':'100000454','south africa':'100000454',
  'sudan':'100000455','suriname':'100000616',
  'svezia':'100000240','svedese':'100000240',
  'svizzera':'100000241','svizzero':'100000241','switzerland':'100000241',
  'tagikistan':'100000362','taiwan':'100000363',
  'tanzania':'100000457','thailandia':'100000349',
  'togo':'100000458','tonga':'100000730',
  'trinidad e tobago':'100000617','tunisia':'100000460',
  'turchia':'100000351','turca':'100000351',
  'turkmenistan':'100000364','tuvalu':'100000731',
  'ucraina':'100000243','ucrainese':'100000243','ukraine':'100000243',
  'uganda':'100000461','ungheria':'100000244','ungherese':'100000244',
  'uruguay':'100000618','uzbekistan':'100000357',
  'venezuela':'100000619','vietnam':'100000353',
  'yemen':'100000354','zambia':'100000464','zimbabwe':'100000465',
  // Varianti in lingua inglese e tedesca (ospiti che compilano in lingua straniera)
  'germany':'100000216','german':'100000216',
  'deutsch':'100000216','deutsche':'100000216',
  'italian':'100000100','italy':'100000100',
  'french':'100000215','france':'100000215',
  'spain':'100000239','spanish':'100000239',
  'british':'100000219','english':'100000219',
  'dutch':'100000232','belgium':'100000206','belgian':'100000206',
  'austrian':'100000203','portuguese':'100000234',
  'greek':'100000220','greece':'100000220','ireland':'100000221','irish':'100000221',
  'polish':'100000233','poland':'100000233','czech':'100000257',
  'hungarian':'100000244','romanian':'100000235','bulgarian':'100000209',
  'croatian':'100000250','serbian':'100001000','russian':'100000245',
  'turkish':'100000351','chinese':'100000314','japanese':'100000326',
  'indian':'100000330','brazilian':'100000605','moroccan':'100000436',
  'american':'100000536','australian':'100000701',
  'norwegian':'100000231','sweden':'100000240','swedish':'100000240',
  'danish':'100000212','denmark':'100000212','finnish':'100000214',
  'israel':'100000334','israeli':'100000334','egypt':'100000419','egyptian':'100000419',
  'japan':'100000326','china':'100000314','brazil':'100000605',
  'mexico':'100000527','mexican':'100000527','saudi':'100000302'
};

function getStatoCodice_(name) {
  if (!name) return '100000100';
  var key = normalizeAlloggiatiKey_(name);
  if (ALLOGGIATI_STATI_[key]) return ALLOGGIATI_STATI_[key];
  for (var k in ALLOGGIATI_STATI_) {
    if (key.indexOf(k) >= 0 || k.indexOf(key) >= 0) return ALLOGGIATI_STATI_[k];
  }
  return '100000100';  // fallback Italia
}

// Mantenuta per compatibilità con eventuali chiamate residue (no-op, codici già 9 cifre)
function padStatoCodice_(code) {
  return String(code || '100000100').substring(0, 9);
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

// ── Tabella codici ISTAT comuni completa (fonte: Alloggiati Web, 7898 comuni attivi) ─
var ALLOGGIATI_COMUNI_ = {
  'abano terme':'405028001',
  'abbadia cerreto':'403098001',
  'abbadia lariana':'403097001',
  'abbadia san salvatore':'409052001',
  'abbasanta':'420095001',
  'abbateggio':'413068001',
  'abbiategrasso':'403015002',
  'abetone cutigliano':'409047023',
  'abriola':'417076001',
  'acate':'419088001',
  'accadia':'416071001',
  'acceglio':'401004001',
  'accettura':'417077001',
  'acciano':'413066001',
  'accumoli':'412057001',
  'acerenza':'417076002',
  'acerno':'415065001',
  'acerra':'415063001',
  'aci bonaccorsi':'419087001',
  'aci castello':'419087002',
  'aci catena':'419087003',
  'aci sant antonio':'419087005',
  'acireale':'419087004',
  'acquafondata':'412060001',
  'acquaformosa':'418078001',
  'acquafredda':'403017001',
  'acqualagna':'411141001',
  'acquanegra cremonese':'403019001',
  'acquanegra sul chiese':'403020001',
  'acquapendente':'412056001',
  'acquappesa':'418078002',
  'acquaro':'418102001',
  'acquasanta terme':'411044001',
  'acquasparta':'410055001',
  'acquaviva collecroce':'414070001',
  'acquaviva delle fonti':'416072001',
  'acquaviva d isernia':'414094001',
  'acquaviva picena':'411044002',
  'acquaviva platani':'419085001',
  'acquedolci':'419083107',
  'acqui terme':'401006001',
  'acri':'418078003',
  'acuto':'412060002',
  'adelfia':'416072002',
  'adrano':'419087006',
  'adrara san martino':'403016001',
  'adrara san rocco':'403016002',
  'adria':'405029001',
  'adro':'403017002',
  'affi':'405023001',
  'affile':'412058001',
  'afragola':'415063002',
  'africo':'418080001',
  'agazzano':'408033001',
  'agerola':'415063003',
  'aggius':'420090001',
  'agira':'419086001',
  'agliana':'409047002',
  'agliano terme':'401005001',
  'aglie':'401001001',
  'aglientu':'420090062',
  'agna':'405028002',
  'agnadello':'403019002',
  'agnana calabra':'418080002',
  'agnone':'414094002',
  'agnosine':'403017003',
  'agordo':'405025001',
  'agosta':'412058002',
  'agra':'403012001',
  'agrate brianza':'403108001',
  'agrate conturbia':'401003001',
  'agrigento':'419084001',
  'agropoli':'415065002',
  'agugliano':'411042001',
  'agugliaro':'405024001',
  'aicurzio':'403108002',
  'aidomaggiore':'420095002',
  'aidone':'419086002',
  'aielli':'413066002',
  'aiello calabro':'418078004',
  'aiello del friuli':'406030001',
  'aiello del sabato':'415064001',
  'aieta':'418078005',
  'ailano':'415061001',
  'ailoche':'401096001',
  'airasca':'401001002',
  'airola':'415062001',
  'airole':'407008001',
  'airuno':'403097002',
  'aisone':'401004002',
  'ala':'404022001',
  'ala dei sardi':'420090002',
  'ala di stura':'401001003',
  'alagna':'403018001',
  'alagna valsesia':'401002002',
  'alanno':'413068002',
  'alassio':'407009001',
  'alatri':'412060003',
  'alba':'401004003',
  'alba adriatica':'413067001',
  'albagiara':'420095003',
  'albairate':'403015005',
  'albanella':'415065003',
  'albano di lucania':'417076003',
  'albano laziale':'412058003',
  'albano sant alessandro':'403016003',
  'albano vercellese':'401002003',
  'albaredo d adige':'405023002',
  'albaredo per san marco':'403014001',
  'albareto':'408034001',
  'albaretto della torre':'401004004',
  'albavilla':'403013003',
  'albenga':'407009002',
  'albera ligure':'401006002',
  'alberobello':'416072003',
  'alberona':'416071002',
  'albese con cassano':'403013004',
  'albettone':'405024002',
  'albi':'418079002',
  'albiano':'404022002',
  'albiano d ivrea':'401001004',
  'albiate':'403108003',
  'albidona':'418078006',
  'albignasego':'405028003',
  'albinea':'408035001',
  'albino':'403016004',
  'albiolo':'403013005',
  'albisola superiore':'407009004',
  'albissola marina':'407009003',
  'albizzate':'403012002',
  'albonese':'403018003',
  'albosaggia':'403014002',
  'albugnano':'401005002',
  'albuzzano':'403018004',
  'alcamo':'419081001',
  'alcara li fusi':'419083001',
  'aldeno':'404022003',
  'aldino':'404021001',
  'ales':'420095004',
  'alessandria':'401006003',
  'alessandria del carretto':'418078007',
  'alessandria della rocca':'419084002',
  'alessano':'416075002',
  'alezio':'416075003',
  'alfano':'415065004',
  'alfedena':'413066003',
  'alfianello':'403017004',
  'alfiano natta':'401006004',
  'alfonsine':'408039001',
  'alghero':'420090003',
  'algua':'403016248',
  'ali':'419083002',
  'ali terme':'419083003',
  'alia':'419082001',
  'aliano':'417077002',
  'alice bel colle':'401006005',
  'alice castello':'401002004',
  'alife':'415061002',
  'alimena':'419082002',
  'aliminusa':'419082003',
  'allai':'420095005',
  'alleghe':'405025003',
  'allein':'402007001',
  'allerona':'410055002',
  'alliste':'416075004',
  'allumiere':'412058004',
  'alluvioni piovera':'401006192',
  'alme':'403016005',
  'almenno san bartolomeo':'403016006',
  'almenno san salvatore':'403016007',
  'almese':'401001006',
  'alonte':'405024003',
  'alpago':'405025072',
  'alpette':'401001007',
  'alpignano':'401001008',
  'alseno':'408033002',
  'alserio':'403013006',
  'alta val tidone':'408033049',
  'alta valle intelvi':'403013253',
  'altamura':'416072004',
  'altare':'407009005',
  'altavalle':'404022235',
  'altavilla irpina':'415064002',
  'altavilla milicia':'419082004',
  'altavilla monferrato':'401006007',
  'altavilla silentina':'415065005',
  'altavilla vicentina':'405024004',
  'altidona':'411109001',
  'altilia':'418078008',
  'altino':'413069001',
  'altissimo':'405024005',
  'altivole':'405026001',
  'alto':'401004005',
  'alto reno terme':'408037062',
  'alto sermenza':'401002170',
  'altofonte':'419082005',
  'altomonte':'418078009',
  'altopascio':'409046001',
  'altopiano della vigolana':'404022236',
  'alviano':'410055003',
  'alvignano':'415061003',
  'alvito':'412060004',
  'alzano lombardo':'403016008',
  'alzano scrivia':'401006008',
  'alzate brianza':'403013007',
  'amalfi':'415065006',
  'amandola':'411109002',
  'amantea':'418078010',
  'amaro':'406030002',
  'amaroni':'418079003',
  'amaseno':'412060005',
  'amato':'418079004',
  'amatrice':'412057002',
  'ambivere':'403016009',
  'amblar-don':'404022237',
  'ameglia':'407011001',
  'amelia':'410055004',
  'amendolara':'418078011',
  'ameno':'401003002',
  'amorosi':'415062002',
  'ampezzo':'406030003',
  'anacapri':'415063004',
  'anagni':'412060006',
  'ancarano':'413067002',
  'ancona':'411042002',
  'andali':'418079005',
  'andalo':'404022005',
  'andalo valtellino':'403014003',
  'andezeno':'401001009',
  'andora':'407009006',
  'andorno micca':'401096002',
  'andrano':'416075005',
  'andrate':'401001010',
  'andreis':'406093001',
  'andretta':'415064003',
  'andria':'416110001',
  'andriano':'404021002',
  'anela':'420090004',
  'anfo':'403017005',
  'angera':'403012003',
  'anghiari':'409051001',
  'angiari':'405023003',
  'angolo terme':'403017006',
  'angri':'415065007',
  'angrogna':'401001011',
  'anguillara sabazia':'412058005',
  'anguillara veneta':'405028004',
  'annicco':'403019003',
  'annone di brianza':'403097003',
  'annone veneto':'405027001',
  'anoia':'418080003',
  'antegnate':'403016010',
  'anterivo':'404021003',
  'antey-saint-andre':'402007002',
  'anticoli corrado':'412058006',
  'antignano':'401005003',
  'antillo':'419083004',
  'antonimina':'418080004',
  'antrodoco':'412057003',
  'antrona schieranco':'401103001',
  'anversa degli abruzzi':'413066004',
  'anzano del parco':'403013009',
  'anzano di puglia':'416071003',
  'anzi':'417076004',
  'anzio':'412058007',
  'anzola dell emilia':'408037001',
  'anzola d ossola':'401103002',
  'aosta':'402007003',
  'apecchio':'411141002',
  'apice':'415062003',
  'apiro':'411043002',
  'apollosa':'415062004',
  'appiano gentile':'403013010',
  'appiano sulla strada del vino':'404021004',
  'appignano':'411043003',
  'appignano del tronto':'411044005',
  'aprica':'403014004',
  'apricale':'407008002',
  'apricena':'416071004',
  'aprigliano':'418078012',
  'aprilia':'412059001',
  'aquara':'415065008',
  'aquila d arroscia':'407008003',
  'aquileia':'406030004',
  'aquilonia':'415064004',
  'aquino':'412060007',
  'aradeo':'416075006',
  'aragona':'419084003',
  'aramengo':'401005004',
  'arba':'406093002',
  'arborea':'420095006',
  'arborio':'401002006',
  'arbus':'420092001',
  'arcade':'405026002',
  'arce':'412060008',
  'arcene':'403016011',
  'arcevia':'411042003',
  'archi':'413069002',
  'arcidosso':'409053001',
  'arcinazzo romano':'412058008',
  'arcisate':'403012004',
  'arco':'404022006',
  'arcola':'407011002',
  'arcole':'405023004',
  'arconate':'403015007',
  'arcore':'403108004',
  'arcugnano':'405024006',
  'ardara':'420090005',
  'ardauli':'420095007',
  'ardea':'412058117',
  'ardenno':'403014005',
  'ardesio':'403016012',
  'ardore':'418080005',
  'arena':'418102002',
  'arena po':'403018005',
  'arenzano':'407010001',
  'arese':'403015009',
  'arezzo':'409051002',
  'argegno':'403013011',
  'argelato':'408037002',
  'argenta':'408038001',
  'argentera':'401004006',
  'arguello':'401004007',
  'argusto':'418079007',
  'ari':'413069003',
  'ariano irpino':'415064005',
  'ariano nel polesine':'405029002',
  'ariccia':'412058009',
  'arielli':'413069004',
  'arienzo':'415061004',
  'arignano':'401001012',
  'aritzo':'420091001',
  'arizzano':'401103003',
  'arlena di castro':'412056002',
  'arluno':'403015010',
  'armeno':'401003006',
  'armento':'417076005',
  'armo':'407008004',
  'armungia':'420092002',
  'arnad':'402007004',
  'arnara':'412060009',
  'arnasco':'407009007',
  'arnesano':'416075007',
  'arola':'401103004',
  'arona':'401003008',
  'arosio':'403013012',
  'arpaia':'415062005',
  'arpaise':'415062006',
  'arpino':'412060010',
  'arqua petrarca':'405028005',
  'arqua polesine':'405029003',
  'arquata del tronto':'411044006',
  'arquata scrivia':'401006009',
  'arre':'405028006',
  'arrone':'410055005',
  'arsago seprio':'403012005',
  'arsie':'405025004',
  'arsiero':'405024007',
  'arsita':'413067003',
  'arsoli':'412058010',
  'arta terme':'406030005',
  'artegna':'406030006',
  'artena':'412058011',
  'artogne':'403017007',
  'arvier':'402007005',
  'arzachena':'420090006',
  'arzago d adda':'403016013',
  'arzana':'420091002',
  'arzano':'415063005',
  'arzergrande':'405028007',
  'arzignano':'405024008',
  'ascea':'415065009',
  'asciano':'409052002',
  'ascoli piceno':'411044007',
  'ascoli satriano':'416071005',
  'ascrea':'412057004',
  'asiago':'405024009',
  'asigliano veneto':'405024010',
  'asigliano vercellese':'401002007',
  'asola':'403020002',
  'asolo':'405026003',
  'assago':'403015011',
  'assemini':'420092003',
  'assisi':'410054001',
  'asso':'403013013',
  'assolo':'420095008',
  'assoro':'419086003',
  'asti':'401005005',
  'asuni':'420095009',
  'ateleta':'413066005',
  'atella':'417076006',
  'atena lucana':'415065010',
  'atessa':'413069005',
  'atina':'412060011',
  'atrani':'415065011',
  'atri':'413067004',
  'atripalda':'415064006',
  'attigliano':'410055006',
  'attimis':'406030007',
  'atzara':'420091003',
  'augusta':'419089001',
  'auletta':'415065012',
  'aulla':'409045001',
  'aurano':'401103005',
  'aurigo':'407008005',
  'auronzo di cadore':'405025005',
  'ausonia':'412060012',
  'austis':'420091004',
  'avegno':'407010002',
  'avelengo':'404021005',
  'avella':'415064007',
  'avellino':'415064008',
  'averara':'403016014',
  'aversa':'415061005',
  'avetrana':'416073001',
  'avezzano':'413066006',
  'aviano':'406093004',
  'aviatico':'403016015',
  'avigliana':'401001013',
  'avigliano':'417076007',
  'avigliano umbro':'410055033',
  'avio':'404022007',
  'avise':'402007006',
  'avola':'419089002',
  'avolasca':'401006010',
  'ayas':'402007007',
  'aymavilles':'402007008',
  'azeglio':'401001014',
  'azzanello':'403019004',
  'azzano d asti':'401005006',
  'azzano decimo':'406093005',
  'azzano mella':'403017008',
  'azzano san paolo':'403016016',
  'azzate':'403012006',
  'azzio':'403012007',
  'azzone':'403016017',
  'baceno':'401103006',
  'bacoli':'415063006',
  'badalucco':'407008006',
  'badesi':'420090081',
  'badia':'404021006',
  'badia calavena':'405023005',
  'badia pavese':'403018006',
  'badia polesine':'405029004',
  'badia tedalda':'409051003',
  'badolato':'418079008',
  'bagaladi':'418080006',
  'bagheria':'419082006',
  'bagnacavallo':'408039002',
  'bagnara calabra':'418080007',
  'bagnara di romagna':'408039003',
  'bagnaria':'403018007',
  'bagnaria arsa':'406030008',
  'bagnasco':'401004008',
  'bagnatica':'403016018',
  'bagni di lucca':'409046002',
  'bagno a ripoli':'409048001',
  'bagno di romagna':'408140001',
  'bagnoli del trigno':'414094003',
  'bagnoli di sopra':'405028008',
  'bagnoli irpino':'415064009',
  'bagnolo cremasco':'403019005',
  'bagnolo del salento':'416075008',
  'bagnolo di po':'405029005',
  'bagnolo in piano':'408035002',
  'bagnolo mella':'403017009',
  'bagnolo piemonte':'401004009',
  'bagnolo san vito':'403020003',
  'bagnone':'409045002',
  'bagnoregio':'412056003',
  'bagolino':'403017010',
  'baia e latina':'415061006',
  'baiano':'415064010',
  'bairo':'401001015',
  'baiso':'408035003',
  'bajardo':'407008007',
  'balangero':'401001016',
  'baldichieri d asti':'401005007',
  'baldissero canavese':'401001017',
  'baldissero d alba':'401004010',
  'baldissero torinese':'401001018',
  'balestrate':'419082007',
  'balestrino':'407009008',
  'ballabio':'403097004',
  'ballao':'420092004',
  'balme':'401001019',
  'balmuccia':'401002008',
  'balocco':'401002009',
  'balsorano':'413066007',
  'balvano':'417076008',
  'balzola':'401006011',
  'banari':'420090007',
  'banchette':'401001020',
  'bannio anzino':'401103007',
  'banzi':'417076009',
  'baone':'405028009',
  'baradili':'420095010',
  'baragiano':'417076010',
  'baranello':'414070002',
  'barano d ischia':'415063007',
  'baranzate':'403015250',
  'barasso':'403012008',
  'baratili san pietro':'420095011',
  'barbania':'401001021',
  'barbara':'411042004',
  'barbarano mossano':'405024124',
  'barbarano romano':'412056004',
  'barbaresco':'401004011',
  'barbariga':'403017011',
  'barbata':'403016019',
  'barberino di mugello':'409048002',
  'barberino tavarnelle':'409048054',
  'barbianello':'403018008',
  'barbiano':'404021007',
  'barbona':'405028010',
  'barcellona pozzo di gotto':'419083005',
  'barcis':'406093006',
  'bard':'402007009',
  'bardello con malgesso e bregano':'403012144',
  'bardi':'408034002',
  'bardineto':'407009009',
  'bardolino':'405023006',
  'bardonecchia':'401001022',
  'bareggio':'403015012',
  'barengo':'401003012',
  'baressa':'420095012',
  'barete':'413066008',
  'barga':'409046003',
  'bargagli':'407010003',
  'barge':'401004012',
  'barghe':'403017012',
  'bari':'416072006',
  'bari sardo':'420091005',
  'bariano':'403016020',
  'baricella':'408037003',
  'barile':'417076011',
  'barisciano':'413066009',
  'barlassina':'403108005',
  'barletta':'416110002',
  'barni':'403013015',
  'barolo':'401004013',
  'barone canavese':'401001023',
  'baronissi':'415065013',
  'barrafranca':'419086004',
  'barrali':'420092005',
  'barrea':'413066010',
  'barumini':'420092006',
  'barzago':'403097005',
  'barzana':'403016021',
  'barzano':'403097006',
  'barzio':'403097007',
  'basaluzzo':'401006012',
  'bascape':'403018009',
  'baschi':'410055007',
  'basciano':'413067005',
  'baselga di pine':'404022009',
  'baselice':'415062007',
  'basiano':'403015014',
  'basico':'419083006',
  'basiglio':'403015015',
  'basiliano':'406030009',
  'bassano bresciano':'403017013',
  'bassano del grappa':'405024012',
  'bassano in teverina':'412056006',
  'bassano romano':'412056005',
  'bassiano':'412059002',
  'bassignana':'401006013',
  'bastia mondovi':'401004014',
  'bastia umbra':'410054002',
  'bastida pancarana':'403018011',
  'bastiglia':'408036001',
  'battaglia terme':'405028011',
  'battifollo':'401004015',
  'battipaglia':'415065014',
  'battuda':'403018012',
  'baucina':'419082008',
  'bauladu':'420095013',
  'baunei':'420091006',
  'baveno':'401103008',
  'bedero valcuvia':'403012010',
  'bedizzole':'403017014',
  'bedollo':'404022011',
  'bedonia':'408034003',
  'bedulita':'403016022',
  'bee':'401103009',
  'beinasco':'401001024',
  'beinette':'401004016',
  'belcastro':'418079009',
  'belfiore':'405023007',
  'belforte all isauro':'411141005',
  'belforte del chienti':'411043004',
  'belforte monferrato':'401006014',
  'belgioioso':'403018013',
  'belgirate':'401103010',
  'bella':'417076012',
  'bellagio':'403013250',
  'bellano':'403097008',
  'bellante':'413067006',
  'bellaria-igea marina':'408099001',
  'bellegra':'412058012',
  'bellino':'401004017',
  'bellinzago lombardo':'403015016',
  'bellinzago novarese':'401003016',
  'bellizzi':'415065158',
  'bellona':'415061007',
  'bellosguardo':'415065015',
  'belluno':'405025006',
  'bellusco':'403108006',
  'belmonte calabro':'418078013',
  'belmonte castello':'412060013',
  'belmonte del sannio':'414094004',
  'belmonte in sabina':'412057005',
  'belmonte mezzagno':'419082009',
  'belmonte piceno':'411109003',
  'belpasso':'419087007',
  'belsito':'418078014',
  'belvedere di spinello':'418101001',
  'belvedere langhe':'401004018',
  'belvedere marittimo':'418078015',
  'belvedere ostrense':'411042005',
  'belveglio':'401005008',
  'belvi':'420091007',
  'bema':'403014006',
  'bene lario':'403013021',
  'bene vagienna':'401004019',
  'benestare':'418080008',
  'benetutti':'420090008',
  'benevello':'401004020',
  'benevento':'415062008',
  'benna':'401096003',
  'bentivoglio':'408037005',
  'berbenno':'403016023',
  'berbenno di valtellina':'403014007',
  'berceto':'408034004',
  'berchidda':'420090009',
  'beregazzo con figliaro':'403013022',
  'bereguardo':'403018014',
  'bergamasco':'401006015',
  'bergamo':'403016024',
  'bergantino':'405029006',
  'bergeggi':'407009010',
  'bergolo':'401004021',
  'berlingo':'403017015',
  'bernalda':'417077003',
  'bernareggio':'403108007',
  'bernate ticino':'403015019',
  'bernezzo':'401004022',
  'bertinoro':'408140003',
  'bertiolo':'406030010',
  'bertonico':'403098002',
  'berzano di san pietro':'401005009',
  'berzano di tortona':'401006016',
  'berzo demo':'403017016',
  'berzo inferiore':'403017017',
  'berzo san fermo':'403016025',
  'besana in brianza':'403108008',
  'besano':'403012011',
  'besate':'403015022',
  'besenello':'404022013',
  'besenzone':'408033003',
  'besnate':'403012012',
  'besozzo':'403012013',
  'bessude':'420090010',
  'bettola':'408033004',
  'bettona':'410054003',
  'beura-cardezza':'401103011',
  'bevagna':'410054004',
  'beverino':'407011003',
  'bevilacqua':'405023008',
  'biancavilla':'419087008',
  'bianchi':'418078016',
  'bianco':'418080009',
  'biandrate':'401003018',
  'biandronno':'403012014',
  'bianzano':'403016026',
  'bianze':'401002011',
  'bianzone':'403014008',
  'biassono':'403108009',
  'bibbiano':'408035004',
  'bibbiena':'409051004',
  'bibbona':'409049001',
  'bibiana':'401001025',
  'biccari':'416071006',
  'bicinicco':'406030011',
  'bidoni':'420095014',
  'biella':'401096004',
  'bienno':'403017018',
  'bieno':'404022015',
  'bientina':'409050001',
  'binago':'403013023',
  'binasco':'403015024',
  'binetto':'416072008',
  'bioglio':'401096005',
  'bionaz':'402007010',
  'bione':'403017019',
  'birori':'420091008',
  'bisaccia':'415064011',
  'bisacquino':'419082010',
  'bisceglie':'416110003',
  'bisegna':'413066011',
  'bisenti':'413067007',
  'bisignano':'418078017',
  'bistagno':'401006017',
  'bisuschio':'403012015',
  'bitetto':'416072010',
  'bitonto':'416072011',
  'bitritto':'416072012',
  'bitti':'420091009',
  'bivona':'419084004',
  'bivongi':'418080010',
  'bizzarone':'403013024',
  'bleggio superiore':'404022017',
  'blello':'403016027',
  'blera':'412056007',
  'blessagno':'403013025',
  'blevio':'403013026',
  'blufi':'419082082',
  'boara pisani':'405028012',
  'bobbio':'408033005',
  'bobbio pellice':'401001026',
  'boca':'401003019',
  'bocchigliero':'418078018',
  'boccioleto':'401002014',
  'bocenago':'404022018',
  'bodio lomnago':'403012016',
  'boffalora d adda':'403098003',
  'boffalora sopra ticino':'403015026',
  'bogliasco':'407010004',
  'bognanco':'401103012',
  'bogogno':'401003021',
  'boissano':'407009011',
  'bojano':'414070003',
  'bolano':'407011004',
  'bolgare':'403016028',
  'bollate':'403015027',
  'bollengo':'401001027',
  'bologna':'408037006',
  'bolognano':'413068003',
  'bolognetta':'419082011',
  'bolognola':'411043005',
  'bolotana':'420091010',
  'bolsena':'412056008',
  'boltiere':'403016029',
  'bolzano':'404021008',
  'bolzano novarese':'401003022',
  'bolzano vicentino':'405024013',
  'bomarzo':'412056009',
  'bomba':'413069006',
  'bompensiere':'419085002',
  'bompietro':'419082012',
  'bomporto':'408036002',
  'bonarcado':'420095015',
  'bonassola':'407011005',
  'bonate sopra':'403016030',
  'bonate sotto':'403016031',
  'bonavigo':'405023009',
  'bondeno':'408038003',
  'bondone':'404022021',
  'bonea':'415062009',
  'bonefro':'414070004',
  'bonemerse':'403019006',
  'bonifati':'418078019',
  'bonito':'415064012',
  'bonnanaro':'420090011',
  'bono':'420090012',
  'bonorva':'420090013',
  'bonvicino':'401004023',
  'borbona':'412057006',
  'borca di cadore':'405025007',
  'bordano':'406030012',
  'bordighera':'407008008',
  'bordolano':'403019007',
  'bore':'408034005',
  'boretto':'408035005',
  'borgarello':'403018015',
  'borgaro torinese':'401001028',
  'borgetto':'419082013',
  'borghetto d arroscia':'407008009',
  'borghetto di borbera':'401006018',
  'borghetto di vara':'407011006',
  'borghetto lodigiano':'403098004',
  'borghetto santo spirito':'407009012',
  'borghi':'408140004',
  'borgia':'418079011',
  'borgiallo':'401001029',
  'borgio-verezzi':'407009013',
  'borgo a mozzano':'409046004',
  'borgo chiese':'404022238',
  'borgo d ale':'401002015',
  'borgo d anaunia':'404022252',
  'borgo di terzo':'403016032',
  'borgo lares':'404022239',
  'borgo mantovano':'403020072',
  'borgo pace':'411141006',
  'borgo priolo':'403018016',
  'borgo san dalmazzo':'401004025',
  'borgo san giacomo':'403017020',
  'borgo san giovanni':'403098005',
  'borgo san lorenzo':'409048004',
  'borgo san martino':'401006020',
  'borgo san siro':'403018018',
  'borgo ticino':'401003025',
  'borgo tossignano':'408037007',
  'borgo val di taro':'408034006',
  'borgo valbelluna':'405025074',
  'borgo valsugana':'404022022',
  'borgo velino':'412057008',
  'borgo veneto':'405028107',
  'borgo vercelli':'401002017',
  'borgo virgilio':'403020071',
  'borgocarbonara':'403020073',
  'borgofranco d ivrea':'401001030',
  'borgolavezzaro':'401003023',
  'borgomale':'401004024',
  'borgomanero':'401003024',
  'borgomaro':'407008010',
  'borgomasino':'401001031',
  'borgomezzavalle':'401103078',
  'borgone susa':'401001032',
  'borgonovo val tidone':'408033006',
  'borgoratto alessandrino':'401006019',
  'borgoratto mormorolo':'403018017',
  'borgoricco':'405028013',
  'borgorose':'412057007',
  'borgosatollo':'403017021',
  'borgosesia':'401002016',
  'bormida':'407009014',
  'bormio':'403014009',
  'bornasco':'403018019',
  'borno':'403017022',
  'boroneddu':'420095016',
  'borore':'420091011',
  'borrello':'413069007',
  'borriana':'401096006',
  'borso del grappa':'405026004',
  'bortigali':'420091012',
  'bortigiadas':'420090014',
  'borutta':'420090015',
  'borzonasca':'407010005',
  'bosa':'420091013',
  'bosaro':'405029007',
  'boschi sant anna':'405023010',
  'bosco chiesanuova':'405023011',
  'bosco marengo':'401006021',
  'bosconero':'401001033',
  'boscoreale':'415063008',
  'boscotrecase':'415063009',
  'bosia':'401004026',
  'bosio':'401006022',
  'bosisio parini':'403097009',
  'bosnasco':'403018020',
  'bossico':'403016033',
  'bossolasco':'401004027',
  'botricello':'418079012',
  'botrugno':'416075009',
  'bottanuco':'403016034',
  'botticino':'403017023',
  'bottidda':'420090016',
  'bova':'418080011',
  'bova marina':'418080013',
  'bovalino':'418080012',
  'bovegno':'403017024',
  'boves':'401004028',
  'bovezzo':'403017025',
  'boville ernica':'412060014',
  'bovino':'416071007',
  'bovisio-masciago':'403108010',
  'bovolenta':'405028014',
  'bovolone':'405023012',
  'bozzole':'401006023',
  'bozzolo':'403020007',
  'bra':'401004029',
  'bracca':'403016035',
  'bracciano':'412058013',
  'bracigliano':'415065016',
  'braies':'404021009',
  'brallo di pregola':'403018021',
  'brancaleone':'418080014',
  'brandico':'403017026',
  'brandizzo':'401001034',
  'branzi':'403016036',
  'braone':'403017027',
  'brebbia':'403012017',
  'breda di piave':'405026005',
  'breganze':'405024014',
  'bregnano':'403013028',
  'brembate':'403016037',
  'brembate di sopra':'403016038',
  'brembio':'403098006',
  'breme':'403018022',
  'brendola':'405024015',
  'brenna':'403013029',
  'brennero':'404021010',
  'breno':'403017028',
  'brenta':'403012019',
  'brentino belluno':'405023013',
  'brentonico':'404022025',
  'brenzone sul garda':'405023914',
  'brescello':'408035006',
  'brescia':'403017029',
  'bresimo':'404022026',
  'bressana bottarone':'403018023',
  'bressanone':'404021011',
  'bressanvido':'405024016',
  'bresso':'403015032',
  'brezzo di bedero':'403012020',
  'briaglia':'401004030',
  'briatico':'418102003',
  'bricherasio':'401001035',
  'brienno':'403013030',
  'brienza':'417076013',
  'briga alta':'401004031',
  'briga novarese':'401003026',
  'brignano gera d adda':'403016040',
  'brignano-frascata':'401006024',
  'brindisi':'416074001',
  'brindisi di montagna':'417076014',
  'brinzio':'403012021',
  'briona':'401003027',
  'brione':'403017030',
  'briosco':'403108011',
  'brisighella':'408039004',
  'brissago-valtravaglia':'403012022',
  'brissogne':'402007011',
  'brittoli':'413068004',
  'brivio':'403097010',
  'broccostella':'412060015',
  'brogliano':'405024017',
  'brognaturo':'418102004',
  'brolo':'419083007',
  'brondello':'401004032',
  'broni':'403018024',
  'bronte':'419087009',
  'bronzolo':'404021012',
  'brossasco':'401004033',
  'brosso':'401001036',
  'brovello-carpugnino':'401103013',
  'brozolo':'401001037',
  'brugherio':'403108012',
  'brugine':'405028015',
  'brugnato':'407011007',
  'brugnera':'406093007',
  'bruino':'401001038',
  'brumano':'403016041',
  'brunate':'403013032',
  'brunello':'403012023',
  'brunico':'404021013',
  'bruno':'401005010',
  'brusaporto':'403016042',
  'brusasco':'401001039',
  'brusciano':'415063010',
  'brusimpiano':'403012024',
  'brusnengo':'401096007',
  'brusson':'402007012',
  'bruzolo':'401001040',
  'bruzzano zeffirio':'418080015',
  'bubbiano':'403015035',
  'bubbio':'401005011',
  'buccheri':'419089003',
  'bucchianico':'413069008',
  'bucciano':'415062010',
  'buccinasco':'403015036',
  'buccino':'415065017',
  'bucine':'409051005',
  'budduso':'420090017',
  'budoia':'406093008',
  'budoni':'420091014',
  'budrio':'408037008',
  'buggerru':'420092007',
  'buggiano':'409047003',
  'buglio in monte':'403014010',
  'bugnara':'413066012',
  'buguggiate':'403012025',
  'buja':'406030013',
  'bulciago':'403097011',
  'bulgarograsso':'403013034',
  'bultei':'420090018',
  'bulzi':'420090019',
  'buonabitacolo':'415065018',
  'buonalbergo':'415062011',
  'buonconvento':'409052003',
  'buonvicino':'418078020',
  'burago di molgora':'403108013',
  'burcei':'420092008',
  'burgio':'419084005',
  'burgos':'420090020',
  'buriasco':'401001041',
  'burolo':'401001042',
  'buronzo':'401002021',
  'busachi':'420095017',
  'busalla':'407010006',
  'busano':'401001043',
  'busca':'401004034',
  'buscate':'403015038',
  'buscemi':'419089004',
  'buseto palizzolo':'419081002',
  'busnago':'403108051',
  'bussero':'403015040',
  'busseto':'408034007',
  'bussi sul tirino':'413068005',
  'busso':'414070005',
  'bussolengo':'405023015',
  'bussoleno':'401001044',
  'busto arsizio':'403012026',
  'busto garolfo':'403015041',
  'butera':'419085003',
  'buti':'409050002',
  'buttapietra':'405023016',
  'buttigliera alta':'401001045',
  'buttigliera d asti':'401005012',
  'buttrio':'406030014',
  'cabella ligure':'401006025',
  'cabiate':'403013035',
  'cabras':'420095018',
  'caccamo':'419082014',
  'caccuri':'418101002',
  'cadegliano-viconago':'403012027',
  'cadelbosco di sopra':'408035008',
  'cadeo':'408033007',
  'caderzone terme':'404022929',
  'cadoneghe':'405028016',
  'cadorago':'403013036',
  'cadrezzate con osmate':'403012143',
  'caerano di san marco':'405026006',
  'cafasse':'401001046',
  'caggiano':'415065019',
  'cagli':'411141007',
  'cagliari':'420092009',
  'caglio':'403013037',
  'cagnano amiterno':'413066013',
  'cagnano varano':'416071008',
  'caianello':'415061008',
  'caiazzo':'415061009',
  'caines':'404021014',
  'caino':'403017031',
  'caiolo':'403014011',
  'cairano':'415064013',
  'cairate':'403012029',
  'cairo montenotte':'407009015',
  'caivano':'415063011',
  'calabritto':'415064014',
  'calalzo di cadore':'405025008',
  'calamandrana':'401005013',
  'calamonaci':'419084006',
  'calangianus':'420090021',
  'calanna':'418080016',
  'calasca-castiglione':'401103014',
  'calascibetta':'419086005',
  'calascio':'413066014',
  'calasetta':'420092010',
  'calatabiano':'419087010',
  'calatafimi segesta':'419081903',
  'calcata':'412056010',
  'calceranica al lago':'404022032',
  'calci':'409050003',
  'calciano':'417077004',
  'calcinaia':'409050004',
  'calcinate':'403016043',
  'calcinato':'403017032',
  'calcio':'403016044',
  'calco':'403097012',
  'caldaro sulla strada del vino':'404021015',
  'caldarola':'411043006',
  'calderara di reno':'408037009',
  'caldes':'404022033',
  'caldiero':'405023017',
  'caldogno':'405024018',
  'caldonazzo':'404022034',
  'calendasco':'408033008',
  'calenzano':'409048005',
  'calestano':'408034008',
  'calice al cornoviglio':'407011008',
  'calice ligure':'407009016',
  'calimera':'416075010',
  'calitri':'415064015',
  'calizzano':'407009017',
  'callabiana':'401096008',
  'calliano':'404022035',
  'calliano monferrato':'401005914',
  'calolziocorte':'403097013',
  'calopezzati':'418078021',
  'calosso':'401005015',
  'caloveto':'418078022',
  'caltabellotta':'419084007',
  'caltagirone':'419087011',
  'caltanissetta':'419085004',
  'caltavuturo':'419082015',
  'caltignaga':'401003030',
  'calto':'405029008',
  'caltrano':'405024019',
  'calusco d adda':'403016046',
  'caluso':'401001047',
  'calvagese della riviera':'403017033',
  'calvanico':'415065020',
  'calvatone':'403019009',
  'calvello':'417076015',
  'calvene':'405024020',
  'calvenzano':'403016047',
  'calvera':'417076016',
  'calvi':'415062012',
  'calvi dell umbria':'410055008',
  'calvi risorta':'415061010',
  'calvignano':'403018025',
  'calvignasco':'403015042',
  'calvisano':'403017034',
  'calvizzano':'415063012',
  'camagna monferrato':'401006026',
  'camaiore':'409046005',
  'camandona':'401096009',
  'camastra':'419084008',
  'cambiago':'403015044',
  'cambiano':'401001048',
  'cambiasca':'401103015',
  'camburzano':'401096010',
  'camerana':'401004035',
  'camerano':'411042006',
  'camerano casasco':'401005016',
  'camerata cornello':'403016048',
  'camerata nuova':'412058014',
  'camerata picena':'411042007',
  'cameri':'401003032',
  'camerino':'411043007',
  'camerota':'415065021',
  'camigliano':'415061011',
  'camini':'418080017',
  'camino':'401006027',
  'camino al tagliamento':'406030015',
  'camisano':'403019010',
  'camisano vicentino':'405024021',
  'cammarata':'419084009',
  'camogli':'407010007',
  'campagna':'415065022',
  'campagna lupia':'405027002',
  'campagnano di roma':'412058015',
  'campagnatico':'409053002',
  'campagnola cremasca':'403019011',
  'campagnola emilia':'408035009',
  'campana':'418078023',
  'camparada':'403108014',
  'campegine':'408035010',
  'campello sul clitunno':'410054005',
  'campertogno':'401002025',
  'campi bisenzio':'409048006',
  'campi salentina':'416075011',
  'campiglia cervo':'401096086',
  'campiglia dei berici':'405024022',
  'campiglia marittima':'409049002',
  'campiglione fenile':'401001049',
  'campione d italia':'403013040',
  'campitello di fassa':'404022036',
  'campli':'413067008',
  'campo calabro':'418080018',
  'campo di giove':'413066015',
  'campo di trens':'404021016',
  'campo ligure':'407010008',
  'campo nell elba':'409049003',
  'campo san martino':'405028020',
  'campo tures':'404021017',
  'campobasso':'414070006',
  'campobello di licata':'419084010',
  'campobello di mazara':'419081004',
  'campochiaro':'414070007',
  'campodarsego':'405028017',
  'campodenno':'404022037',
  'campodimele':'412059003',
  'campodipietra':'414070008',
  'campodolcino':'403014012',
  'campodoro':'405028018',
  'campofelice di fitalia':'419082016',
  'campofelice di roccella':'419082017',
  'campofilone':'411109004',
  'campofiorito':'419082018',
  'campoformido':'406030016',
  'campofranco':'419085005',
  'campogalliano':'408036003',
  'campolattaro':'415062013',
  'campoli appennino':'412060016',
  'campoli del monte taburno':'415062014',
  'campolieto':'414070009',
  'campolongo maggiore':'405027003',
  'campolongo tapogliano':'406030138',
  'campomaggiore':'417076017',
  'campomarino':'414070010',
  'campomorone':'407010009',
  'camponogara':'405027004',
  'campora':'415065023',
  'camporeale':'419082019',
  'camporgiano':'409046006',
  'camporosso':'407008011',
  'camporotondo di fiastrone':'411043008',
  'camporotondo etneo':'419087012',
  'camposampiero':'405028019',
  'camposano':'415063013',
  'camposanto':'408036004',
  'campospinoso albaredo':'403018926',
  'campotosto':'413066016',
  'camugnano':'408037010',
  'canal san bovo':'404022038',
  'canale':'401004037',
  'canale d agordo':'405025023',
  'canale monterano':'412058016',
  'canaro':'405029009',
  'canazei':'404022039',
  'cancellara':'417076018',
  'cancello ed arnone':'415061012',
  'canda':'405029010',
  'candela':'416071009',
  'candelo':'401096012',
  'candia canavese':'401001050',
  'candia lomellina':'403018027',
  'candiana':'405028021',
  'candida':'415064016',
  'candidoni':'418080019',
  'candiolo':'401001051',
  'canegrate':'403015046',
  'canelli':'401005017',
  'canepina':'412056011',
  'caneva':'406093009',
  'canicatti':'419084011',
  'canicattini bagni':'419089005',
  'canino':'412056012',
  'canischio':'401001052',
  'canistro':'413066017',
  'canna':'418078024',
  'cannalonga':'415065024',
  'cannara':'410054006',
  'cannero riviera':'401103016',
  'canneto pavese':'403018029',
  'canneto sull oglio':'403020008',
  'cannobio':'401103017',
  'cannole':'416075012',
  'canolo':'418080020',
  'canonica d adda':'403016049',
  'canosa di puglia':'416110004',
  'canosa sannita':'413069010',
  'canosio':'401004038',
  'canossa':'408035502',
  'cansano':'413066018',
  'cantagallo':'409100001',
  'cantalice':'412057009',
  'cantalupa':'401001053',
  'cantalupo in sabina':'412057010',
  'cantalupo ligure':'401006028',
  'cantalupo nel sannio':'414094005',
  'cantarana':'401005018',
  'cantello':'403012030',
  'canterano':'412058017',
  'cantiano':'411141008',
  'cantoira':'401001054',
  'cantu':'403013041',
  'canzano':'413067009',
  'canzo':'403013042',
  'caorle':'405027005',
  'caorso':'408033010',
  'capaccio paestum':'415065925',
  'capaci':'419082020',
  'capalbio':'409053003',
  'capannoli':'409050005',
  'capannori':'409046007',
  'capena':'412058018',
  'capergnanica':'403019012',
  'capestrano':'413066019',
  'capiago intimiano':'403013043',
  'capistrano':'418102005',
  'capistrello':'413066020',
  'capitignano':'413066021',
  'capizzi':'419083008',
  'capizzone':'403016050',
  'capo di ponte':'403017035',
  'capo d orlando':'419083009',
  'capodimonte':'412056013',
  'capodrise':'415061013',
  'capoliveri':'409049004',
  'capolona':'409051006',
  'caponago':'403108052',
  'caporciano':'413066022',
  'caposele':'415064017',
  'capoterra':'420092011',
  'capovalle':'403017036',
  'cappadocia':'413066023',
  'cappella cantone':'403019013',
  'cappella de picenardi':'403019014',
  'cappella maggiore':'405026007',
  'cappelle sul tavo':'413068006',
  'capracotta':'414094006',
  'capraia e limite':'409048008',
  'capraia isola':'409049005',
  'capralba':'403019015',
  'capranica':'412056014',
  'capranica prenestina':'412058019',
  'caprarica di lecce':'416075013',
  'caprarola':'412056015',
  'caprauna':'401004039',
  'caprese michelangelo':'409051007',
  'caprezzo':'401103018',
  'capri':'415063014',
  'capri leone':'419083010',
  'capriana':'404022040',
  'capriano del colle':'403017037',
  'capriata d orba':'401006029',
  'capriate san gervasio':'403016051',
  'capriati a volturno':'415061014',
  'caprie':'401001055',
  'capriglia irpina':'415064018',
  'capriglio':'401005019',
  'caprile':'401096013',
  'caprino bergamasco':'403016052',
  'caprino veronese':'405023018',
  'capriolo':'403017038',
  'capriva del friuli':'406031001',
  'capua':'415061015',
  'capurso':'416072014',
  'caraffa del bianco':'418080021',
  'caraffa di catanzaro':'418079017',
  'caraglio':'401004040',
  'caramagna piemonte':'401004041',
  'caramanico terme':'413068007',
  'carapelle':'416071010',
  'carapelle calvisio':'413066024',
  'carasco':'407010010',
  'carassai':'411044010',
  'carate brianza':'403108015',
  'carate urio':'403013044',
  'caravaggio':'403016053',
  'caravate':'403012031',
  'caravino':'401001056',
  'caravonica':'407008012',
  'carbognano':'412056016',
  'carbonara al ticino':'403018030',
  'carbonara di nola':'415063015',
  'carbonara scrivia':'401006030',
  'carbonate':'403013045',
  'carbone':'417076019',
  'carbonera':'405026008',
  'carbonia':'420092012',
  'carcare':'407009018',
  'carcoforo':'401002029',
  'cardano al campo':'403012032',
  'carde':'401004042',
  'cardedu':'420091103',
  'cardeto':'418080022',
  'cardinale':'418079018',
  'cardito':'415063016',
  'careggine':'409046008',
  'carema':'401001057',
  'carenno':'403097014',
  'carentino':'401006031',
  'careri':'418080023',
  'caresana':'401002030',
  'caresanablot':'401002031',
  'carezzano':'401006032',
  'carfizzi':'418101003',
  'cargeghe':'420090022',
  'cariati':'418078025',
  'carife':'415064019',
  'carignano':'401001058',
  'carimate':'403013046',
  'carinaro':'415061016',
  'carini':'419082021',
  'carinola':'415061017',
  'carisio':'401002032',
  'carisolo':'404022042',
  'carlantino':'416071011',
  'carlazzo':'403013047',
  'carlentini':'419089006',
  'carlino':'406030018',
  'carloforte':'420092013',
  'carlopoli':'418079020',
  'carmagnola':'401001059',
  'carmiano':'416075014',
  'carmignano':'409100002',
  'carmignano di brenta':'405028023',
  'carnago':'403012033',
  'carnate':'403108016',
  'carobbio degli angeli':'403016055',
  'carolei':'418078026',
  'carona':'403016056',
  'caronia':'419083011',
  'caronno pertusella':'403012034',
  'caronno varesino':'403012035',
  'carosino':'416073002',
  'carovigno':'416074002',
  'carovilli':'414094007',
  'carpaneto piacentino':'408033011',
  'carpanzano':'418078027',
  'carpegna':'411141009',
  'carpenedolo':'403017039',
  'carpeneto':'401006033',
  'carpi':'408036005',
  'carpiano':'403015050',
  'carpignano salentino':'416075015',
  'carpignano sesia':'401003036',
  'carpineti':'408035011',
  'carpineto della nora':'413068008',
  'carpineto romano':'412058020',
  'carpineto sinello':'413069011',
  'carpino':'416071012',
  'carpinone':'414094008',
  'carrara':'409045003',
  'carre':'405024024',
  'carrega ligure':'401006034',
  'carro':'407011009',
  'carrodano':'407011010',
  'carrosio':'401006035',
  'carru':'401004043',
  'carsoli':'413066025',
  'cartigliano':'405024025',
  'cartignano':'401004044',
  'cartoceto':'411141010',
  'cartosio':'401006036',
  'cartura':'405028026',
  'carugate':'403015051',
  'carugo':'403013048',
  'carunchio':'413069012',
  'carvico':'403016057',
  'carzano':'404022043',
  'casabona':'418101004',
  'casacalenda':'414070011',
  'casacanditella':'413069013',
  'casagiove':'415061018',
  'casal cermelli':'401006037',
  'casal di principe':'415061019',
  'casal velino':'415065028',
  'casalanguida':'413069014',
  'casalattico':'412060017',
  'casalbeltrame':'401003037',
  'casalbordino':'413069015',
  'casalbore':'415064020',
  'casalborgone':'401001060',
  'casalbuono':'415065026',
  'casalbuttano ed uniti':'403019016',
  'casalciprano':'414070012',
  'casalduni':'415062015',
  'casale corte cerro':'401103019',
  'casale cremasco-vidolasco':'403019017',
  'casale di scodosia':'405028027',
  'casale litta':'403012036',
  'casale marittimo':'409050006',
  'casale monferrato':'401006039',
  'casale sul sile':'405026009',
  'casalecchio di reno':'408037011',
  'casaleggio boiro':'401006038',
  'casaleggio novara':'401003039',
  'casaleone':'405023019',
  'casaletto ceredano':'403019018',
  'casaletto di sopra':'403019019',
  'casaletto lodigiano':'403098008',
  'casaletto spartano':'415065027',
  'casaletto vaprio':'403019020',
  'casalfiumanese':'408037012',
  'casalgrande':'408035012',
  'casalgrasso':'401004045',
  'casali del manco':'418078156',
  'casalincontrada':'413069016',
  'casalino':'401003040',
  'casalmaggiore':'403019021',
  'casalmaiocco':'403098009',
  'casalmorano':'403019022',
  'casalmoro':'403020010',
  'casalnoceto':'401006040',
  'casalnuovo di napoli':'415063017',
  'casalnuovo monterotaro':'416071013',
  'casaloldo':'403020011',
  'casalpusterlengo':'403098010',
  'casalromano':'403020012',
  'casalserugo':'405028028',
  'casaluce':'415061020',
  'casalvecchio di puglia':'416071014',
  'casalvecchio siculo':'419083012',
  'casalvieri':'412060018',
  'casalvolone':'401003041',
  'casalzuigno':'403012037',
  'casamarciano':'415063018',
  'casamassima':'416072015',
  'casamicciola terme':'415063019',
  'casandrino':'415063020',
  'casanova elvo':'401002033',
  'casanova lerrone':'407009019',
  'casanova lonati':'403018031',
  'casape':'412058021',
  'casapesenna':'415061103',
  'casapinta':'401096014',
  'casaprota':'412057011',
  'casapulla':'415061021',
  'casarano':'416075016',
  'casargo':'403097015',
  'casarile':'403015055',
  'casarsa della delizia':'406093010',
  'casarza ligure':'407010011',
  'casasco':'401006041',
  'casatenovo':'403097016',
  'casatisma':'403018032',
  'casavatore':'415063021',
  'casazza':'403016058',
  'cascia':'410054007',
  'casciago':'403012038',
  'casciana terme lari':'409050040',
  'cascina':'409050008',
  'cascinette d ivrea':'401001061',
  'casei gerola':'403018033',
  'caselette':'401001062',
  'casella':'407010012',
  'caselle in pittari':'415065029',
  'caselle landi':'403098011',
  'caselle lurani':'403098012',
  'caselle torinese':'401001063',
  'caserta':'415061022',
  'casier':'405026010',
  'casignana':'418080024',
  'casina':'408035013',
  'casirate d adda':'403016059',
  'caslino d erba':'403013052',
  'casnate con bernate':'403013053',
  'casnigo':'403016060',
  'casola di napoli':'415063022',
  'casola in lunigiana':'409045004',
  'casola valsenio':'408039005',
  'casole d elsa':'409052004',
  'casoli':'413069017',
  'casorate primo':'403018034',
  'casorate sempione':'403012039',
  'casorezzo':'403015058',
  'casoria':'415063023',
  'casorzo monferrato':'401005920',
  'casperia':'412057012',
  'caspoggio':'403014013',
  'cassacco':'406030019',
  'cassago brianza':'403097017',
  'cassano all ionio':'418078029',
  'cassano d adda':'403015059',
  'cassano delle murge':'416072016',
  'cassano irpino':'415064021',
  'cassano magnago':'403012040',
  'cassano spinola':'401006191',
  'cassano valcuvia':'403012041',
  'cassaro':'419089007',
  'cassiglio':'403016061',
  'cassina de pecchi':'403015060',
  'cassina rizzardi':'403013055',
  'cassina valsassina':'403097018',
  'cassinasco':'401005021',
  'cassine':'401006043',
  'cassinelle':'401006044',
  'cassinetta di lugagnano':'403015061',
  'cassino':'412060019',
  'cassola':'405024026',
  'cassolnovo':'403018035',
  'castagnaro':'405023020',
  'castagneto carducci':'409049006',
  'castagneto po':'401001064',
  'castagnito':'401004046',
  'castagnole delle lanze':'401005022',
  'castagnole monferrato':'401005023',
  'castagnole piemonte':'401001065',
  'castana':'403018036',
  'castano primo':'403015062',
  'casteggio':'403018037',
  'castegnato':'403017040',
  'castegnero':'405024027',
  'castel baronia':'415064022',
  'castel boglione':'401005024',
  'castel bolognese':'408039006',
  'castel campagnano':'415061023',
  'castel castagna':'413067010',
  'castel condino':'404022045',
  'castel d aiano':'408037013',
  'castel d ario':'403020014',
  'castel d azzano':'405023021',
  'castel del giudice':'414094009',
  'castel del monte':'413066026',
  'castel del piano':'409053004',
  'castel del rio':'408037014',
  'castel di casio':'408037015',
  'castel di ieri':'413066027',
  'castel di iudica':'419087013',
  'castel di lama':'411044011',
  'castel di lucio':'419083013',
  'castel di sangro':'413066028',
  'castel di sasso':'415061024',
  'castel di tora':'412057013',
  'castel focognano':'409051008',
  'castel frentano':'413069018',
  'castel gabbiano':'403019024',
  'castel gandolfo':'412058022',
  'castel giorgio':'410055009',
  'castel goffredo':'403020015',
  'castel guelfo di bologna':'408037016',
  'castel ivano':'404022240',
  'castel madama':'412058023',
  'castel maggiore':'408037019',
  'castel mella':'403017042',
  'castel morrone':'415061026',
  'castel ritaldi':'410054008',
  'castel rocchero':'401005032',
  'castel rozzone':'403016063',
  'castel san giorgio':'415065034',
  'castel san giovanni':'408033013',
  'castel san lorenzo':'415065035',
  'castel san niccolo':'409051010',
  'castel san pietro romano':'412058025',
  'castel san pietro terme':'408037020',
  'castel san vincenzo':'414094012',
  'castel sant angelo':'412057015',
  'castel sant elia':'412056017',
  'castel viscardo':'410055010',
  'castel vittorio':'407008015',
  'castel volturno':'415061027',
  'castelbaldo':'405028029',
  'castelbelforte':'403020013',
  'castelbellino':'411042008',
  'castelbello ciardes':'404021018',
  'castelbianco':'407009020',
  'castelbottaccio':'414070013',
  'castelbuono':'419082022',
  'castelcivita':'415065030',
  'castelcovati':'403017041',
  'castelcucco':'405026011',
  'casteldaccia':'419082023',
  'casteldelci':'408099021',
  'casteldelfino':'401004047',
  'casteldidone':'403019023',
  'castelfidardo':'411042010',
  'castelfiorentino':'409048010',
  'castelforte':'412059004',
  'castelfranci':'415064023',
  'castelfranco di sotto':'409050009',
  'castelfranco emilia':'408036006',
  'castelfranco in miscano':'415062016',
  'castelfranco piandisco':'409051040',
  'castelfranco veneto':'405026012',
  'castelgerundo':'403098062',
  'castelgomberto':'405024028',
  'castelgrande':'417076021',
  'castelguglielmo':'405029011',
  'castelguidone':'413069019',
  'castellabate':'415065031',
  'castellafiume':'413066029',
  'castell alfero':'401005025',
  'castellalto':'413067011',
  'castellammare del golfo':'419081005',
  'castellammare di stabia':'415063024',
  'castellamonte':'401001066',
  'castellana grotte':'416072017',
  'castellana sicula':'419082024',
  'castellaneta':'416073003',
  'castellania coppi':'401006945',
  'castellanza':'403012042',
  'castellar guidobono':'401006046',
  'castellarano':'408035014',
  'castellaro':'407008014',
  'castell arquato':'408033012',
  'castell azzara':'409053005',
  'castellazzo bormida':'401006047',
  'castellazzo novarese':'401003042',
  'castelleone':'403019025',
  'castelleone di suasa':'411042011',
  'castellero':'401005026',
  'castelletto cervo':'401096015',
  'castelletto d erro':'401006048',
  'castelletto di branduzzo':'403018038',
  'castelletto d orba':'401006049',
  'castelletto merli':'401006050',
  'castelletto molina':'401005027',
  'castelletto monferrato':'401006051',
  'castelletto sopra ticino':'401003043',
  'castelletto stura':'401004049',
  'castelletto uzzone':'401004050',
  'castelli':'413067012',
  'castelli calepio':'403016062',
  'castellina in chianti':'409052005',
  'castellina marittima':'409050010',
  'castellinaldo d alba':'401004951',
  'castellino del biferno':'414070014',
  'castellino tanaro':'401004052',
  'castelliri':'412060020',
  'castello cabiaglio':'403012043',
  'castello d agogna':'403018039',
  'castello d argile':'408037017',
  'castello del matese':'415061025',
  'castello dell acqua':'403014014',
  'castello di annone':'401005028',
  'castello di brianza':'403097019',
  'castello di cisterna':'415063025',
  'castello di godego':'405026013',
  'castello tesino':'404022048',
  'castello-molina di fiemme':'404022047',
  'castellucchio':'403020016',
  'castelluccio de sauri':'416071015',
  'castelluccio inferiore':'417076022',
  'castelluccio superiore':'417076023',
  'castelluccio valmaggiore':'416071016',
  'castell umberto':'419083014',
  'castelmagno':'401004053',
  'castelmarte':'403013058',
  'castelmassa':'405029012',
  'castelmauro':'414070015',
  'castelmezzano':'417076024',
  'castelmola':'419083015',
  'castelnovetto':'403018040',
  'castelnovo bariano':'405029013',
  'castelnovo del friuli':'406093011',
  'castelnovo di sotto':'408035015',
  'castelnovo ne monti':'408035016',
  'castelnuovo':'404022049',
  'castelnuovo belbo':'401005029',
  'castelnuovo berardenga':'409052006',
  'castelnuovo bocca d adda':'403098013',
  'castelnuovo bormida':'401006052',
  'castelnuovo bozzente':'403013059',
  'castelnuovo calcea':'401005030',
  'castelnuovo cilento':'415065032',
  'castelnuovo del garda':'405023520',
  'castelnuovo della daunia':'416071017',
  'castelnuovo di ceva':'401004054',
  'castelnuovo di conza':'415065033',
  'castelnuovo di farfa':'412057014',
  'castelnuovo di garfagnana':'409046009',
  'castelnuovo di porto':'412058024',
  'castelnuovo di val di cecina':'409050011',
  'castelnuovo don bosco':'401005031',
  'castelnuovo magra':'407011011',
  'castelnuovo nigra':'401001067',
  'castelnuovo parano':'412060021',
  'castelnuovo rangone':'408036007',
  'castelnuovo scrivia':'401006053',
  'castelpagano':'415062017',
  'castelpetroso':'414094010',
  'castelpizzuto':'414094011',
  'castelplanio':'411042012',
  'castelpoto':'415062018',
  'castelraimondo':'411043009',
  'castelrotto':'404021019',
  'castelsantangelo sul nera':'411043010',
  'castelsaraceno':'417076025',
  'castelsardo':'420090023',
  'castelseprio':'403012044',
  'castelsilano':'418101005',
  'castelspina':'401006054',
  'casteltermini':'419084012',
  'castelveccana':'403012045',
  'castelvecchio calvisio':'413066030',
  'castelvecchio di rocca barbena':'407009021',
  'castelvecchio subequo':'413066031',
  'castelvenere':'415062019',
  'castelverde':'403019026',
  'castelverrino':'414094013',
  'castelvetere in val fortore':'415062020',
  'castelvetere sul calore':'415064024',
  'castelvetrano':'419081006',
  'castelvetro di modena':'408036008',
  'castelvetro piacentino':'408033014',
  'castelvisconti':'403019027',
  'castenaso':'408037021',
  'castenedolo':'403017043',
  'castiadas':'420092106',
  'castiglion fibocchi':'409051011',
  'castiglion fiorentino':'409051012',
  'castiglione a casauria':'413068009',
  'castiglione chiavarese':'407010013',
  'castiglione cosentino':'418078030',
  'castiglione d adda':'403098014',
  'castiglione dei pepoli':'408037022',
  'castiglione del genovesi':'415065036',
  'castiglione del lago':'410054009',
  'castiglione della pescaia':'409053006',
  'castiglione delle stiviere':'403020017',
  'castiglione di garfagnana':'409046010',
  'castiglione di sicilia':'419087014',
  'castiglione d orcia':'409052007',
  'castiglione falletto':'401004055',
  'castiglione in teverina':'412056018',
  'castiglione messer marino':'413069020',
  'castiglione messer raimondo':'413067013',
  'castiglione olona':'403012046',
  'castiglione tinella':'401004056',
  'castiglione torinese':'401001068',
  'castignano':'411044012',
  'castilenti':'413067014',
  'castino':'401004057',
  'castione andevenno':'403014015',
  'castione della presolana':'403016064',
  'castions di strada':'406030020',
  'castiraga vidardo':'403098015',
  'casto':'403017044',
  'castorano':'411044013',
  'castrezzato':'403017045',
  'castri di lecce':'416075017',
  'castrignano de greci':'416075018',
  'castrignano del capo':'416075019',
  'castro':'403016065',
  'castro dei volsci':'412060023',
  'castrocaro terme e terra del sole':'408140005',
  'castrocielo':'412060022',
  'castrofilippo':'419084013',
  'castrolibero':'418078031',
  'castronno':'403012047',
  'castronovo di sicilia':'419082025',
  'castronuovo di sant andrea':'417076026',
  'castropignano':'414070016',
  'castroreale':'419083016',
  'castroregio':'418078032',
  'castrovillari':'418078033',
  'catania':'419087015',
  'catanzaro':'418079023',
  'catenanuova':'419086006',
  'catignano':'413068010',
  'cattolica':'408099002',
  'cattolica eraclea':'419084014',
  'caulonia':'418080025',
  'cautano':'415062021',
  'cava de tirreni':'415065037',
  'cava manara':'403018041',
  'cavaglia':'401096016',
  'cavaglietto':'401003044',
  'cavaglio d agogna':'401003045',
  'cavagnolo':'401001069',
  'cavaion veronese':'405023023',
  'cavalese':'404022050',
  'cavallerleone':'401004058',
  'cavallermaggiore':'401004059',
  'cavallino':'416075020',
  'cavallino-treporti':'405027044',
  'cavallirio':'401003047',
  'cavareno':'404022051',
  'cavargna':'403013062',
  'cavaria con premezzo':'403012048',
  'cavarzere':'405027006',
  'cavaso del tomba':'405026014',
  'cavasso nuovo':'406093012',
  'cavatore':'401006055',
  'cavazzo carnico':'406030021',
  'cave':'412058026',
  'cavedago':'404022052',
  'cavedine':'404022053',
  'cavenago d adda':'403098017',
  'cavenago di brianza':'403108017',
  'cavernago':'403016066',
  'cavezzo':'408036009',
  'cavizzana':'404022054',
  'cavour':'401001070',
  'cavriago':'408035017',
  'cavriana':'403020018',
  'cavriglia':'409051013',
  'cazzago brabbia':'403012049',
  'cazzago san martino':'403017046',
  'cazzano di tramigna':'405023024',
  'cazzano sant andrea':'403016067',
  'ceccano':'412060024',
  'cecima':'403018042',
  'cecina':'409049007',
  'cedegolo':'403017047',
  'cedrasco':'403014016',
  'cefala diana':'419082026',
  'cefalu':'419082027',
  'ceggia':'405027007',
  'ceglie messapica':'416074003',
  'celano':'413066032',
  'celenza sul trigno':'413069021',
  'celenza valfortore':'416071018',
  'celico':'418078034',
  'cella dati':'403019028',
  'cella monte':'401006056',
  'cellamare':'416072018',
  'cellara':'418078035',
  'cellarengo':'401005033',
  'cellatica':'403017048',
  'celle di bulgheria':'415065038',
  'celle di macra':'401004060',
  'celle di san vito':'416071019',
  'celle enomondo':'401005034',
  'celle ligure':'407009022',
  'celleno':'412056019',
  'cellere':'412056020',
  'cellino attanasio':'413067015',
  'cellino san marco':'416074004',
  'cellio con breia':'401002171',
  'cellole':'415061102',
  'cembra lisignago':'404022241',
  'cenadi':'418079024',
  'cenate sopra':'403016068',
  'cenate sotto':'403016069',
  'cencenighe agordino':'405025010',
  'cene':'403016070',
  'ceneselli':'405029014',
  'cengio':'407009023',
  'centallo':'401004061',
  'cento':'408038004',
  'centola':'415065039',
  'centrache':'418079025',
  'centro valle intelvi':'403013254',
  'centuripe':'419086007',
  'cepagatti':'413068011',
  'ceppaloni':'415062022',
  'ceppo morelli':'401103021',
  'ceprano':'412060025',
  'cerami':'419086008',
  'ceranesi':'407010014',
  'cerano':'401003049',
  'cerano d intelvi':'403013063',
  'ceranova':'403018043',
  'ceraso':'415065040',
  'cercemaggiore':'414070017',
  'cercenasco':'401001071',
  'cercepiccola':'414070018',
  'cerchiara di calabria':'418078036',
  'cerchio':'413066033',
  'cercino':'403014017',
  'cercivento':'406030022',
  'cercola':'415063026',
  'cerda':'419082028',
  'cerea':'405023025',
  'ceregnano':'405029015',
  'cerenzia':'418101006',
  'ceres':'401001072',
  'ceresara':'403020019',
  'cereseto':'401006057',
  'ceresole alba':'401004062',
  'ceresole reale':'401001073',
  'cerete':'403016071',
  'ceretto lomellina':'403018044',
  'cergnago':'403018045',
  'ceriale':'407009024',
  'ceriana':'407008016',
  'ceriano laghetto':'403108018',
  'cerignale':'408033015',
  'cerignola':'416071020',
  'cerisano':'418078037',
  'cermenate':'403013064',
  'cermes':'404021020',
  'cermignano':'413067016',
  'cernobbio':'403013065',
  'cernusco lombardone':'403097020',
  'cernusco sul naviglio':'403015070',
  'cerreto d asti':'401005035',
  'cerreto d esi':'411042013',
  'cerreto di spoleto':'410054010',
  'cerreto grue':'401006058',
  'cerreto guidi':'409048011',
  'cerreto laziale':'412058027',
  'cerreto sannita':'415062023',
  'cerretto langhe':'401004063',
  'cerrina monferrato':'401006059',
  'cerrione':'401096018',
  'cerro al lambro':'403015071',
  'cerro al volturno':'414094014',
  'cerro maggiore':'403015072',
  'cerro tanaro':'401005036',
  'cerro veronese':'405023026',
  'cersosimo':'417076027',
  'certaldo':'409048012',
  'certosa di pavia':'403018046',
  'cerva':'418079027',
  'cervara di roma':'412058028',
  'cervarese santa croce':'405028030',
  'cervaro':'412060026',
  'cervasca':'401004064',
  'cervatto':'401002041',
  'cerveno':'403017049',
  'cervere':'401004065',
  'cervesina':'403018047',
  'cerveteri':'412058029',
  'cervia':'408039007',
  'cervicati':'418078038',
  'cervignano d adda':'403098018',
  'cervignano del friuli':'406030023',
  'cervinara':'415064025',
  'cervino':'415061028',
  'cervo':'407008017',
  'cerzeto':'418078039',
  'cesa':'415061029',
  'cesana brianza':'403097021',
  'cesana torinese':'401001074',
  'cesano boscone':'403015074',
  'cesano maderno':'403108019',
  'cesara':'401103022',
  'cesaro':'419083017',
  'cesate':'403015076',
  'cesena':'408140007',
  'cesenatico':'408140008',
  'cesinali':'415064026',
  'cesio':'407008018',
  'cesiomaggiore':'405025011',
  'cessalto':'405026015',
  'cessaniti':'418102006',
  'cessapalombo':'411043011',
  'cessole':'401005037',
  'cetara':'415065041',
  'ceto':'403017050',
  'cetona':'409052008',
  'cetraro':'418078040',
  'ceva':'401004066',
  'cevo':'403017051',
  'challand-saint-anselme':'402007013',
  'challand-saint-victor':'402007014',
  'chambave':'402007015',
  'chamois':'402007016',
  'champdepraz':'402007017',
  'champorcher':'402007018',
  'charvensod':'402007019',
  'chatillon':'402007020',
  'cherasco':'401004067',
  'cheremule':'420090024',
  'chialamberto':'401001075',
  'chiampo':'405024029',
  'chianche':'415064027',
  'chianciano terme':'409052009',
  'chianni':'409050012',
  'chianocco':'401001076',
  'chiaramonte gulfi':'419088002',
  'chiaramonti':'420090025',
  'chiarano':'405026016',
  'chiaravalle':'411042014',
  'chiaravalle centrale':'418079029',
  'chiari':'403017052',
  'chiaromonte':'417076028',
  'chiauci':'414094015',
  'chiavari':'407010015',
  'chiavenna':'403014018',
  'chiaverano':'401001077',
  'chienes':'404021021',
  'chieri':'401001078',
  'chies d alpago':'405025012',
  'chiesa in valmalenco':'403014019',
  'chiesanuova':'401001079',
  'chiesina uzzanese':'409047022',
  'chieti':'413069022',
  'chieuti':'416071021',
  'chieve':'403019029',
  'chignolo d isola':'403016072',
  'chignolo po':'403018048',
  'chioggia':'405027008',
  'chiomonte':'401001080',
  'chions':'406093013',
  'chiopris viscone':'406030024',
  'chitignano':'409051014',
  'chiuduno':'403016073',
  'chiuppano':'405024030',
  'chiuro':'403014020',
  'chiusa':'404021022',
  'chiusa di pesio':'401004068',
  'chiusa di san michele':'401001081',
  'chiusa sclafani':'419082029',
  'chiusaforte':'406030025',
  'chiusanico':'407008019',
  'chiusano d asti':'401005038',
  'chiusano di san domenico':'415064028',
  'chiusavecchia':'407008020',
  'chiusdino':'409052010',
  'chiusi':'409052011',
  'chiusi della verna':'409051015',
  'chivasso':'401001082',
  'ciampino':'412058118',
  'cianciana':'419084015',
  'cibiana di cadore':'405025013',
  'cicagna':'407010016',
  'cicala':'418079030',
  'cicciano':'415063027',
  'cicerale':'415065042',
  'ciciliano':'412058030',
  'cicognolo':'403019030',
  'ciconio':'401001083',
  'cigliano':'401002042',
  'ciglie':'401004069',
  'cigognola':'403018049',
  'cigole':'403017053',
  'cilavegna':'403018050',
  'cimadolmo':'405026017',
  'cimbergo':'403017054',
  'cimina':'418080026',
  'ciminna':'419082030',
  'cimitile':'415063028',
  'cimolais':'406093014',
  'cimone':'404022058',
  'cinaglio':'401005039',
  'cineto romano':'412058031',
  'cingia de botti':'403019031',
  'cingoli':'411043012',
  'cinigiano':'409053007',
  'cinisello balsamo':'403015077',
  'cinisi':'419082031',
  'cino':'403014021',
  'cinquefrondi':'418080027',
  'cintano':'401001084',
  'cinte tesino':'404022059',
  'cinto caomaggiore':'405027009',
  'cinto euganeo':'405028031',
  'cinzano':'401001085',
  'ciorlano':'415061030',
  'cipressa':'407008021',
  'circello':'415062024',
  'cirie':'401001086',
  'cirigliano':'417077005',
  'cirimido':'403013068',
  'ciro':'418101007',
  'ciro marina':'418101008',
  'cis':'404022060',
  'cisano bergamasco':'403016074',
  'cisano sul neva':'407009025',
  'ciserano':'403016075',
  'cislago':'403012050',
  'cisliano':'403015078',
  'cison di valmarino':'405026018',
  'cissone':'401004070',
  'cisterna d asti':'401005040',
  'cisterna di latina':'412059005',
  'cisternino':'416074005',
  'citerna':'410054011',
  'citta della pieve':'410054012',
  'citta di castello':'410054013',
  'citta sant angelo':'413068012',
  'cittadella':'405028032',
  'cittaducale':'412057016',
  'cittanova':'418080028',
  'cittareale':'412057017',
  'cittiglio':'403012051',
  'civate':'403097022',
  'civezza':'407008022',
  'civezzano':'404022061',
  'civiasco':'401002043',
  'cividale del friuli':'406030026',
  'cividate al piano':'403016076',
  'cividate camuno':'403017055',
  'civita':'418078041',
  'civita castellana':'412056021',
  'civita d antino':'413066034',
  'civitacampomarano':'414070019',
  'civitaluparella':'413069023',
  'civitanova del sannio':'414094016',
  'civitanova marche':'411043013',
  'civitaquana':'413068013',
  'civitavecchia':'412058032',
  'civitella alfedena':'413066035',
  'civitella casanova':'413068014',
  'civitella d agliano':'412056022',
  'civitella del tronto':'413067017',
  'civitella di romagna':'408140009',
  'civitella in val di chiana':'409051016',
  'civitella messer raimondo':'413069024',
  'civitella paganico':'409053008',
  'civitella roveto':'413066036',
  'civitella san paolo':'412058033',
  'civo':'403014022',
  'claino con osteno':'403013071',
  'claut':'406093015',
  'clauzetto':'406093016',
  'clavesana':'401004071',
  'claviere':'401001087',
  'cles':'404022062',
  'cleto':'418078042',
  'clivio':'403012052',
  'clusone':'403016077',
  'coassolo torinese':'401001088',
  'coazze':'401001089',
  'coazzolo':'401005041',
  'coccaglio':'403017056',
  'cocconato':'401005042',
  'cocquio-trevisago':'403012053',
  'cocullo':'413066037',
  'codevigo':'405028033',
  'codevilla':'403018051',
  'codigoro':'408038005',
  'codogne':'405026019',
  'codogno':'403098019',
  'codroipo':'406030027',
  'codrongianos':'420090026',
  'coggiola':'401096019',
  'cogliate':'403108020',
  'cogne':'402007021',
  'cogoleto':'407010017',
  'cogollo del cengio':'405024032',
  'cogorno':'407010018',
  'colazza':'401003051',
  'colceresa':'405024126',
  'colere':'403016078',
  'colfelice':'412060027',
  'coli':'408033016',
  'colico':'403097023',
  'collalto sabino':'412057018',
  'collarmele':'413066038',
  'collazzone':'410054014',
  'colle brianza':'403097024',
  'colle d anchise':'414070020',
  'colle di tora':'412057019',
  'colle di val d elsa':'409052012',
  'colle san magno':'412060029',
  'colle sannita':'415062025',
  'colle santa lucia':'405025014',
  'colle umberto':'405026020',
  'collebeato':'403017057',
  'collecchio':'408034009',
  'collecorvino':'413068015',
  'colledara':'413067018',
  'colledimacine':'413069025',
  'colledimezzo':'413069026',
  'colleferro':'412058034',
  'collegiove':'412057020',
  'collegno':'401001090',
  'collelongo':'413066039',
  'collepardo':'412060028',
  'collepasso':'416075021',
  'collepietro':'413066040',
  'colleretto castelnuovo':'401001091',
  'colleretto giacosa':'401001092',
  'collesalvetti':'409049008',
  'collesano':'419082032',
  'colletorto':'414070021',
  'collevecchio':'412057021',
  'colli a volturno':'414094017',
  'colli al metauro':'411141069',
  'colli del tronto':'411044014',
  'colli sul velino':'412057022',
  'colli verdi':'403018193',
  'colliano':'415065043',
  'collinas':'420092014',
  'collio':'403017058',
  'collobiano':'401002045',
  'colloredo di monte albano':'406030028',
  'colmurano':'411043014',
  'colobraro':'417077006',
  'cologna veneta':'405023027',
  'cologne':'403017059',
  'cologno al serio':'403016079',
  'cologno monzese':'403015081',
  'colognola ai colli':'405023028',
  'colonna':'412058035',
  'colonnella':'413067019',
  'colonno':'403013074',
  'colorina':'403014023',
  'colorno':'408034010',
  'colosimi':'418078043',
  'colturano':'403015082',
  'colverde':'403013251',
  'colzate':'403016080',
  'comabbio':'403012054',
  'comacchio':'408038006',
  'comano':'409045005',
  'comano terme':'404022228',
  'comazzo':'403098020',
  'comeglians':'406030029',
  'comelico superiore':'405025015',
  'comerio':'403012055',
  'comezzano-cizzago':'403017060',
  'comignago':'401003052',
  'comiso':'419088003',
  'comitini':'419084016',
  'comiziano':'415063029',
  'commessaggio':'403020020',
  'commezzadura':'404022064',
  'como':'403013075',
  'compiano':'408034011',
  'comun nuovo':'403016081',
  'comunanza':'411044015',
  'cona':'405027010',
  'conca casale':'414094018',
  'conca dei marini':'415065044',
  'conca della campania':'415061031',
  'concamarise':'405023029',
  'concerviano':'412057023',
  'concesio':'403017061',
  'concordia sagittaria':'405027011',
  'concordia sulla secchia':'408036010',
  'concorezzo':'403108021',
  'condofuri':'418080029',
  'condove':'401001093',
  'condro':'419083018',
  'conegliano':'405026021',
  'confienza':'403018052',
  'configni':'412057024',
  'conflenti':'418079033',
  'coniolo':'401006060',
  'conselice':'408039008',
  'conselve':'405028034',
  'conta':'404022242',
  'contessa entellina':'419082033',
  'contigliano':'412057025',
  'contrada':'415064029',
  'controguerra':'413067020',
  'controne':'415065045',
  'contursi':'415065046',
  'conversano':'416072019',
  'conza della campania':'415064030',
  'conzano':'401006061',
  'copertino':'416075022',
  'copiano':'403018053',
  'copparo':'408038007',
  'corana':'403018054',
  'corato':'416072020',
  'corbara':'415065047',
  'corbetta':'403015085',
  'corbola':'405029017',
  'corchiano':'412056023',
  'corciano':'410054015',
  'cordenons':'406093017',
  'cordignano':'405026022',
  'cordovado':'406093018',
  'coreglia antelminelli':'409046011',
  'coreglia ligure':'407010019',
  'coreno ausonio':'412060030',
  'corfinio':'413066041',
  'cori':'412059006',
  'coriano':'408099003',
  'corigliano d otranto':'416075023',
  'corigliano-rossano':'418078157',
  'corinaldo':'411042015',
  'corio':'401001094',
  'corleone':'419082034',
  'corleto monforte':'415065048',
  'corleto perticara':'417076029',
  'cormano':'403015086',
  'cormons':'406031002',
  'corna imagna':'403016082',
  'cornalba':'403016249',
  'cornale e bastida':'403018191',
  'cornaredo':'403015087',
  'cornate d adda':'403108053',
  'cornedo all isarco':'404021023',
  'cornedo vicentino':'405024034',
  'cornegliano laudense':'403098021',
  'corneliano d alba':'401004072',
  'corniglio':'408034012',
  'corno di rosazzo':'406030030',
  'corno giovine':'403098022',
  'cornovecchio':'403098023',
  'cornuda':'405026023',
  'correggio':'408035020',
  'correzzana':'403108022',
  'correzzola':'405028035',
  'corrido':'403013077',
  'corridonia':'411043015',
  'corropoli':'413067021',
  'corsano':'416075024',
  'corsico':'403015093',
  'corsione':'401005044',
  'cortaccia sulla strada del vino':'404021024',
  'cortale':'418079034',
  'cortandone':'401005045',
  'cortanze':'401005046',
  'cortazzone':'401005047',
  'corte brugnatella':'408033017',
  'corte de cortesi con cignone':'403019032',
  'corte de frati':'403019033',
  'corte franca':'403017062',
  'corte palasio':'403098024',
  'cortemaggiore':'408033018',
  'cortemilia':'401004073',
  'corteno golgi':'403017063',
  'cortenova':'403097025',
  'cortenuova':'403016083',
  'corteolona e genzone':'403018192',
  'cortiglione':'401005048',
  'cortina d ampezzo':'405025016',
  'cortina sulla strada del vino':'404021025',
  'cortino':'413067022',
  'cortona':'409051017',
  'corvara':'413068016',
  'corvara in badia':'404021026',
  'corvino san quirico':'403018057',
  'corzano':'403017064',
  'coseano':'406030031',
  'cosenza':'418078045',
  'cosio d arroscia':'407008023',
  'cosio valtellino':'403014024',
  'cosoleto':'418080030',
  'cossano belbo':'401004074',
  'cossano canavese':'401001095',
  'cossato':'401096020',
  'cosseria':'407009026',
  'cossignano':'411044016',
  'cossogno':'401103023',
  'cossoine':'420090027',
  'cossombrato':'401005049',
  'costa de nobili':'403018058',
  'costa di mezzate':'403016084',
  'costa di rovigo':'405029018',
  'costa masnaga':'403097026',
  'costa serina':'403016247',
  'costa valle imagna':'403016085',
  'costa vescovato':'401006062',
  'costa volpino':'403016086',
  'costabissara':'405024035',
  'costacciaro':'410054016',
  'costanzana':'401002047',
  'costarainera':'407008024',
  'costermano sul garda':'405023930',
  'costigliole d asti':'401005050',
  'costigliole saluzzo':'401004075',
  'cotignola':'408039009',
  'cotronei':'418101009',
  'cottanello':'412057026',
  'courmayeur':'402007022',
  'covo':'403016087',
  'cozzo':'403018059',
  'craco':'417077007',
  'crandola valsassina':'403097027',
  'cravagliana':'401002048',
  'cravanzana':'401004076',
  'craveggia':'401103024',
  'creazzo':'405024036',
  'crecchio':'413069027',
  'credaro':'403016088',
  'credera rubbiano':'403019034',
  'crema':'403019035',
  'cremella':'403097028',
  'cremenaga':'403012056',
  'cremeno':'403097029',
  'cremia':'403013083',
  'cremolino':'401006063',
  'cremona':'403019036',
  'cremosano':'403019037',
  'crescentino':'401002049',
  'crespadoro':'405024037',
  'crespiatica':'403098025',
  'crespina lorenzana':'409050041',
  'crespino':'405029019',
  'cressa':'401003055',
  'crevacuore':'401096021',
  'crevalcore':'408037024',
  'crevoladossola':'401103025',
  'crispano':'415063030',
  'crispiano':'416073004',
  'crissolo':'401004077',
  'crocefieschi':'407010020',
  'crocetta del montello':'405026025',
  'crodo':'401103026',
  'crognaleto':'413067023',
  'cropalati':'418078046',
  'cropani':'418079036',
  'crosia':'418078047',
  'crosio della valle':'403012057',
  'crotone':'418101010',
  'crotta d adda':'403019038',
  'crova':'401002052',
  'croviana':'404022068',
  'crucoli':'418101011',
  'cuasso al monte':'403012058',
  'cuccaro vetere':'415065049',
  'cucciago':'403013084',
  'cuceglio':'401001096',
  'cuggiono':'403015096',
  'cugliate-fabiasco':'403012059',
  'cuglieri':'420095019',
  'cugnoli':'413068017',
  'cumiana':'401001097',
  'cumignano sul naviglio':'403019039',
  'cunardo':'403012060',
  'cuneo':'401004078',
  'cunico':'401005051',
  'cuorgne':'401001098',
  'cupello':'413069028',
  'cupra marittima':'411044017',
  'cupramontana':'411042016',
  'cura carpignano':'403018060',
  'curcuris':'420095077',
  'cureggio':'401003058',
  'curiglia con monteviasco':'403012061',
  'curinga':'418079039',
  'curino':'401096023',
  'curno':'403016089',
  'curon venosta':'404021027',
  'cursi':'416075025',
  'curtarolo':'405028036',
  'curtatone':'403020021',
  'curti':'415061032',
  'cusago':'403015097',
  'cusano milanino':'403015098',
  'cusano mutri':'415062026',
  'cusino':'403013085',
  'cusio':'403016090',
  'custonaci':'419081007',
  'cutro':'418101012',
  'cutrofiano':'416075026',
  'cuveglio':'403012062',
  'cuvio':'403012063',
  'dairago':'403015099',
  'dalmine':'403016091',
  'dambel':'404022071',
  'danta di cadore':'405025017',
  'darfo boario terme':'403017065',
  'dasa':'418102007',
  'davagna':'407010021',
  'daverio':'403012064',
  'davoli':'418079042',
  'dazio':'403014025',
  'decimomannu':'420092015',
  'decimoputzu':'420092016',
  'decollatura':'418079043',
  'dego':'407009027',
  'deiva marina':'407011012',
  'delebio':'403014026',
  'delia':'419085006',
  'delianuova':'418080031',
  'deliceto':'416071022',
  'dello':'403017066',
  'demonte':'401004079',
  'denice':'401006065',
  'denno':'404022074',
  'dernice':'401006066',
  'derovere':'403019040',
  'deruta':'410054017',
  'dervio':'403097030',
  'desana':'401002054',
  'desenzano del garda':'403017067',
  'desio':'403108023',
  'desulo':'420091016',
  'diamante':'418078048',
  'diano arentino':'407008025',
  'diano castello':'407008026',
  'diano d alba':'401004080',
  'diano marina':'407008027',
  'diano san pietro':'407008028',
  'dicomano':'409048013',
  'dignano':'406030032',
  'dimaro folgarida':'404022233',
  'dinami':'418102008',
  'dipignano':'418078049',
  'diso':'416075027',
  'divignano':'401003060',
  'dizzasco':'403013087',
  'dobbiaco':'404021028',
  'doberdo del lago':'406031003',
  'dogliani':'401004081',
  'dogliola':'413069029',
  'dogna':'406030033',
  'dolce':'405023031',
  'dolceacqua':'407008029',
  'dolcedo':'407008030',
  'dolegna del collio':'406031004',
  'dolianova':'420092017',
  'dolo':'405027012',
  'dolzago':'403097031',
  'domanico':'418078050',
  'domaso':'403013089',
  'domegge di cadore':'405025018',
  'domicella':'415064031',
  'domodossola':'401103028',
  'domus de maria':'420092018',
  'domusnovas':'420092019',
  'donato':'401096024',
  'dongo':'403013090',
  'donnas':'402007023',
  'donori':'420092020',
  'dorgali':'420091017',
  'dorio':'403097032',
  'dormelletto':'401003062',
  'dorno':'403018061',
  'dorzano':'401096025',
  'dosolo':'403020022',
  'dossena':'403016092',
  'dosso del liro':'403013092',
  'doues':'402007024',
  'dovadola':'408140011',
  'dovera':'403019041',
  'dozza':'408037025',
  'dragoni':'415061033',
  'drapia':'418102009',
  'drena':'404022078',
  'drenchia':'406030034',
  'dresano':'403015101',
  'dro':'404022079',
  'dronero':'401004082',
  'druento':'401001099',
  'druogno':'401103029',
  'dualchi':'420091018',
  'dubino':'403014027',
  'due carrare':'405028106',
  'dueville':'405024038',
  'dugenta':'415062027',
  'duino aurisina':'406032001',
  'dumenza':'403012065',
  'duno':'403012066',
  'durazzano':'415062028',
  'duronia':'414070022',
  'dusino san michele':'401005052',
  'eboli':'415065050',
  'edolo':'403017068',
  'egna':'404021029',
  'elice':'413068018',
  'elini':'420091019',
  'ello':'403097033',
  'elmas':'420092108',
  'elva':'401004083',
  'emarese':'402007025',
  'empoli':'409048014',
  'endine gaiano':'403016093',
  'enego':'405024039',
  'enemonzo':'406030035',
  'enna':'419086009',
  'entracque':'401004084',
  'entratico':'403016094',
  'envie':'401004085',
  'episcopia':'417076030',
  'eraclea':'405027013',
  'erba':'403013095',
  'erbe':'405023032',
  'erbezzo':'405023033',
  'erbusco':'403017069',
  'erchie':'416074006',
  'ercolano':'415063064',
  'erice':'419081008',
  'erli':'407009028',
  'erto e casso':'406093019',
  'erula':'420090088',
  'erve':'403097034',
  'esanatoglia':'411043016',
  'escalaplano':'420091020',
  'escolca':'420091021',
  'esine':'403017070',
  'esino lario':'403097035',
  'esperia':'412060031',
  'esporlatu':'420090028',
  'este':'405028037',
  'esterzili':'420091022',
  'etroubles':'402007026',
  'eupilio':'403013097',
  'exilles':'401001100',
  'fabbrica curone':'401006067',
  'fabbriche di vergemoli':'409046036',
  'fabbrico':'408035021',
  'fabriano':'411042017',
  'fabrica di roma':'412056024',
  'fabrizia':'418102010',
  'fabro':'410055011',
  'faedis':'406030036',
  'faedo valtellino':'403014028',
  'faenza':'408039010',
  'faeto':'416071023',
  'fagagna':'406030037',
  'faggeto lario':'403013098',
  'faggiano':'416073005',
  'fagnano alto':'413066042',
  'fagnano castello':'418078051',
  'fagnano olona':'403012067',
  'fai della paganella':'404022081',
  'faicchio':'415062029',
  'falcade':'405025019',
  'falciano del massico':'415061101',
  'falconara albanese':'418078052',
  'falconara marittima':'411042018',
  'falcone':'419083019',
  'faleria':'412056025',
  'falerna':'418079047',
  'falerone':'411109005',
  'fallo':'413069104',
  'faloppio':'403013099',
  'falvaterra':'412060032',
  'falzes':'404021030',
  'fanano':'408036011',
  'fanna':'406093020',
  'fano':'411141013',
  'fano adriano':'413067024',
  'fara filiorum petri':'413069030',
  'fara gera d adda':'403016096',
  'fara in sabina':'412057027',
  'fara novarese':'401003065',
  'fara olivana con sola':'403016097',
  'fara san martino':'413069031',
  'fara vicentino':'405024040',
  'fardella':'417076031',
  'farigliano':'401004086',
  'farindola':'413068019',
  'farini':'408033019',
  'farnese':'412056026',
  'farra di soligo':'405026026',
  'farra d isonzo':'406031005',
  'fasano':'416074007',
  'fascia':'407010022',
  'fauglia':'409050014',
  'faule':'401004087',
  'favale di malvaro':'407010023',
  'favara':'419084017',
  'favignana':'419081009',
  'favria':'401001101',
  'feisoglio':'401004088',
  'feletto':'401001102',
  'felino':'408034013',
  'felitto':'415065051',
  'felizzano':'401006068',
  'feltre':'405025021',
  'fenegro':'403013100',
  'fenestrelle':'401001103',
  'fenis':'402007027',
  'ferentillo':'410055012',
  'ferentino':'412060033',
  'ferla':'419089008',
  'fermignano':'411141014',
  'fermo':'411109006',
  'ferno':'403012068',
  'feroleto antico':'418079048',
  'feroleto della chiesa':'418080032',
  'ferrandina':'417077008',
  'ferrara':'408038008',
  'ferrara di monte baldo':'405023034',
  'ferrazzano':'414070023',
  'ferrera di varese':'403012069',
  'ferrera erbognone':'403018062',
  'ferrere':'401005053',
  'ferriere':'408033020',
  'ferruzzano':'418080033',
  'fiamignano':'412057028',
  'fiano':'401001104',
  'fiano romano':'412058036',
  'fiastra':'411043017',
  'fiave':'404022083',
  'ficarazzi':'419082035',
  'ficarolo':'405029021',
  'ficarra':'419083020',
  'ficulle':'410055013',
  'fidenza':'408034014',
  'fie allo sciliar':'404021031',
  'fierozzo':'404022085',
  'fiesco':'403019043',
  'fiesole':'409048015',
  'fiesse':'403017071',
  'fiesso d artico':'405027014',
  'fiesso umbertiano':'405029022',
  'figino serenza':'403013101',
  'figline e incisa valdarno':'409048052',
  'figline vegliaturo':'418078053',
  'filacciano':'412058037',
  'filadelfia':'418102011',
  'filago':'403016098',
  'filandari':'418102012',
  'filattiera':'409045006',
  'filettino':'412060034',
  'filetto':'413069032',
  'filiano':'417076032',
  'filighera':'403018063',
  'filignano':'414094019',
  'filogaso':'418102013',
  'filottrano':'411042019',
  'finale emilia':'408036012',
  'finale ligure':'407009029',
  'fino del monte':'403016099',
  'fino mornasco':'403013102',
  'fiorano al serio':'403016100',
  'fiorano canavese':'401001105',
  'fiorano modenese':'408036013',
  'fiorenzuola d arda':'408033021',
  'firenze':'409048017',
  'firenzuola':'409048018',
  'firmo':'418078054',
  'fiscaglia':'408038027',
  'fisciano':'415065052',
  'fiuggi':'412060035',
  'fiumalbo':'408036014',
  'fiumara':'418080034',
  'fiume veneto':'406093021',
  'fiumedinisi':'419083021',
  'fiumefreddo bruzio':'418078055',
  'fiumefreddo di sicilia':'419087016',
  'fiumicello villa vicentina':'406030190',
  'fiumicino':'412058120',
  'fiuminata':'411043019',
  'fivizzano':'409045007',
  'flaibano':'406030039',
  'flero':'403017072',
  'floresta':'419083022',
  'floridia':'419089009',
  'florinas':'420090029',
  'flumeri':'415064032',
  'fluminimaggiore':'420092021',
  'flussio':'420091023',
  'fobello':'401002057',
  'foggia':'416071024',
  'foglianise':'415062030',
  'fogliano redipuglia':'406031006',
  'foglizzo':'401001106',
  'foiano della chiana':'409051018',
  'foiano di val fortore':'415062031',
  'folgaria':'404022087',
  'folignano':'411044020',
  'foligno':'410054018',
  'follina':'405026027',
  'follo':'407011013',
  'follonica':'409053009',
  'fombio':'403098026',
  'fondachelli-fantina':'419083023',
  'fondi':'412059007',
  'fonni':'420091024',
  'fontainemore':'402007028',
  'fontana liri':'412060036',
  'fontanafredda':'406093022',
  'fontanarosa':'415064033',
  'fontanelice':'408037026',
  'fontanella':'403016101',
  'fontanellato':'408034015',
  'fontanelle':'405026028',
  'fontaneto d agogna':'401003066',
  'fontanetto po':'401002058',
  'fontanigorda':'407010024',
  'fontanile':'401005054',
  'fontaniva':'405028038',
  'fonte':'405026029',
  'fonte nuova':'412058122',
  'fontecchio':'413066043',
  'fontechiari':'412060037',
  'fontegreca':'415061034',
  'fonteno':'403016102',
  'fontevivo':'408034016',
  'fonzaso':'405025022',
  'foppolo':'403016103',
  'forano':'412057029',
  'force':'411044021',
  'forchia':'415062032',
  'forcola':'403014029',
  'fordongianus':'420095020',
  'forenza':'417076033',
  'foresto sparso':'403016104',
  'forgaria nel friuli':'406030137',
  'forino':'415064034',
  'forio':'415063031',
  'forli':'408140012',
  'forli del sannio':'414094020',
  'forlimpopoli':'408140013',
  'formazza':'401103031',
  'formello':'412058038',
  'formia':'412059008',
  'formicola':'415061035',
  'formigara':'403019044',
  'formigine':'408036015',
  'formigliana':'401002059',
  'fornace':'404022089',
  'fornelli':'414094021',
  'forni avoltri':'406030040',
  'forni di sopra':'406030041',
  'forni di sotto':'406030042',
  'forno canavese':'401001107',
  'fornovo di taro':'408034017',
  'fornovo san giovanni':'403016105',
  'forte dei marmi':'409046013',
  'fortezza':'404021032',
  'fortunago':'403018064',
  'forza d agro':'419083024',
  'fosciandora':'409046014',
  'fosdinovo':'409045008',
  'fossa':'413066044',
  'fossacesia':'413069033',
  'fossalta di piave':'405027015',
  'fossalta di portogruaro':'405027016',
  'fossalto':'414070024',
  'fossano':'401004089',
  'fossato di vico':'410054019',
  'fossato serralta':'418079052',
  'fosso':'405027017',
  'fossombrone':'411141015',
  'foza':'405024041',
  'frabosa soprana':'401004090',
  'frabosa sottana':'401004091',
  'fraconalto':'401006069',
  'fragagnano':'416073006',
  'fragneto l abate':'415062033',
  'fragneto monforte':'415062034',
  'fraine':'413069034',
  'framura':'407011014',
  'francavilla al mare':'413069035',
  'francavilla angitola':'418102014',
  'francavilla bisio':'401006070',
  'francavilla d ete':'411109007',
  'francavilla di sicilia':'419083025',
  'francavilla fontana':'416074008',
  'francavilla in sinni':'417076034',
  'francavilla marittima':'418078056',
  'francica':'418102015',
  'francofonte':'419089010',
  'francolise':'415061036',
  'frascaro':'401006071',
  'frascarolo':'403018065',
  'frascati':'412058039',
  'frascineto':'418078057',
  'frassilongo':'404022090',
  'frassinelle polesine':'405029023',
  'frassinello monferrato':'401006072',
  'frassineto po':'401006073',
  'frassinetto':'401001108',
  'frassino':'401004092',
  'frassinoro':'408036016',
  'frasso sabino':'412057030',
  'frasso telesino':'415062035',
  'fratta polesine':'405029024',
  'fratta todina':'410054020',
  'frattamaggiore':'415063032',
  'frattaminore':'415063033',
  'fratte rosa':'411141016',
  'frazzano':'419083026',
  'fregona':'405026030',
  'fresagrandinaria':'413069036',
  'fresonara':'401006074',
  'frigento':'415064035',
  'frignano':'415061037',
  'frinco':'401005055',
  'frisa':'413069037',
  'frisanco':'406093024',
  'front':'401001109',
  'frontino':'411141017',
  'frontone':'411141018',
  'frosinone':'412060038',
  'frosolone':'414094022',
  'frossasco':'401001110',
  'frugarolo':'401006075',
  'fubine monferrato':'401006976',
  'fucecchio':'409048019',
  'fuipiano valle imagna':'403016106',
  'fumane':'405023035',
  'fumone':'412060039',
  'funes':'404021033',
  'furci':'413069038',
  'furci siculo':'419083027',
  'furnari':'419083028',
  'furore':'415065053',
  'furtei':'420092022',
  'fuscaldo':'418078058',
  'fusignano':'408039011',
  'fusine':'403014030',
  'futani':'415065054',
  'gabbioneta binanuova':'403019045',
  'gabiano':'401006077',
  'gabicce mare':'411141019',
  'gaby':'402007029',
  'gadesco pieve delmona':'403019046',
  'gadoni':'420091025',
  'gaeta':'412059009',
  'gaggi':'419083029',
  'gaggiano':'403015103',
  'gaggio montano':'408037027',
  'gaglianico':'401096026',
  'gagliano aterno':'413066045',
  'gagliano castelferrato':'419086010',
  'gagliano del capo':'416075028',
  'gagliato':'418079055',
  'gagliole':'411043020',
  'gaiarine':'405026031',
  'gaiba':'405029025',
  'gaiola':'401004093',
  'gaiole in chianti':'409052013',
  'gairo':'420091026',
  'gais':'404021034',
  'galati mamertino':'419083030',
  'galatina':'416075029',
  'galatone':'416075030',
  'galatro':'418080035',
  'galbiate':'403097036',
  'galeata':'408140014',
  'galgagnano':'403098027',
  'gallarate':'403012070',
  'gallese':'412056027',
  'galliate':'401003068',
  'galliate lombardo':'403012071',
  'galliavola':'403018066',
  'gallicano':'409046015',
  'gallicano nel lazio':'412058040',
  'gallicchio':'417076035',
  'galliera':'408037028',
  'galliera veneta':'405028039',
  'gallinaro':'412060040',
  'gallio':'405024042',
  'gallipoli':'416075031',
  'gallo matese':'415061038',
  'gallodoro':'419083031',
  'galluccio':'415061039',
  'galtelli':'420091027',
  'galzignano terme':'405028040',
  'gamalero':'401006078',
  'gambara':'403017073',
  'gambarana':'403018067',
  'gambasca':'401004094',
  'gambassi terme':'409048020',
  'gambatesa':'414070025',
  'gambellara':'405024043',
  'gamberale':'413069039',
  'gambettola':'408140015',
  'gambolo':'403018068',
  'gandellino':'403016107',
  'gandino':'403016108',
  'gandosso':'403016109',
  'gangi':'419082036',
  'garaguso':'417077009',
  'garbagna':'401006079',
  'garbagna novarese':'401003069',
  'garbagnate milanese':'403015105',
  'garbagnate monastero':'403097037',
  'garda':'405023036',
  'gardone riviera':'403017074',
  'gardone val trompia':'403017075',
  'garessio':'401004095',
  'gargallo':'401003070',
  'gargazzone':'404021035',
  'gargnano':'403017076',
  'garlasco':'403018069',
  'garlate':'403097038',
  'garlenda':'407009030',
  'garniga terme':'404022991',
  'garzeno':'403013106',
  'garzigliana':'401001111',
  'gasperina':'418079056',
  'gassino torinese':'401001112',
  'gattatico':'408035022',
  'gatteo':'408140016',
  'gattico-veruno':'401003166',
  'gattinara':'401002061',
  'gavardo':'403017077',
  'gavello':'405029026',
  'gaverina terme':'403016110',
  'gavi':'401006081',
  'gavignano':'412058041',
  'gavirate':'403012072',
  'gavoi':'420091028',
  'gavorrano':'409053010',
  'gazoldo degli ippoliti':'403020024',
  'gazzada schianno':'403012073',
  'gazzaniga':'403016111',
  'gazzo':'405028041',
  'gazzo veronese':'405023037',
  'gazzola':'408033022',
  'gazzuolo':'403020025',
  'gela':'419085007',
  'gemmano':'408099004',
  'gemona del friuli':'406030043',
  'gemonio':'403012074',
  'genazzano':'412058042',
  'genga':'411042020',
  'genivolta':'403019047',
  'genola':'401004096',
  'genoni':'420091029',
  'genova':'407010025',
  'genuri':'420092023',
  'genzano di lucania':'417076036',
  'genzano di roma':'412058043',
  'gera lario':'403013107',
  'gerace':'418080036',
  'geraci siculo':'419082037',
  'gerano':'412058044',
  'gerenzago':'403018071',
  'gerenzano':'403012075',
  'gergei':'420091030',
  'germagnano':'401001113',
  'germagno':'401103032',
  'germignaga':'403012076',
  'gerocarne':'418102016',
  'gerola alta':'403014031',
  'gerre de caprioli':'403019048',
  'gesico':'420092024',
  'gessate':'403015106',
  'gessopalena':'413069040',
  'gesturi':'420092025',
  'gesualdo':'415064036',
  'ghedi':'403017078',
  'ghemme':'401003073',
  'ghiffa':'401103033',
  'ghilarza':'420095021',
  'ghisalba':'403016113',
  'ghislarengo':'401002062',
  'giacciano con baruchella':'405029027',
  'giaglione':'401001114',
  'gianico':'403017079',
  'giano dell umbria':'410054021',
  'giano vetusto':'415061040',
  'giardinello':'419082038',
  'giardini-naxos':'419083032',
  'giarole':'401006082',
  'giarratana':'419088004',
  'giarre':'419087017',
  'giave':'420090030',
  'giaveno':'401001115',
  'giavera del montello':'405026032',
  'giba':'420092026',
  'gibellina':'419081010',
  'gifflenga':'401096027',
  'giffone':'418080037',
  'giffoni sei casali':'415065055',
  'giffoni valle piana':'415065056',
  'gignese':'401103034',
  'gignod':'402007030',
  'gildone':'414070026',
  'gimigliano':'418079058',
  'ginestra':'417076099',
  'ginestra degli schiavoni':'415062036',
  'ginosa':'416073007',
  'gioi':'415065057',
  'gioia dei marsi':'413066046',
  'gioia del colle':'416072021',
  'gioia sannitica':'415061041',
  'gioia tauro':'418080038',
  'gioiosa ionica':'418080039',
  'gioiosa marea':'419083033',
  'giove':'410055014',
  'giovinazzo':'416072022',
  'giovo':'404022092',
  'girasole':'420091031',
  'girifalco':'418079059',
  'gissi':'413069041',
  'giuggianello':'416075032',
  'giugliano in campania':'415063034',
  'giuliana':'419082039',
  'giuliano di roma':'412060041',
  'giuliano teatino':'413069042',
  'giulianova':'413067025',
  'giungano':'415065058',
  'giurdignano':'416075033',
  'giussago':'403018072',
  'giussano':'403108024',
  'giustenice':'407009031',
  'giustino':'404022093',
  'giusvalla':'407009032',
  'givoletto':'401001116',
  'gizzeria':'418079060',
  'glorenza':'404021036',
  'godega di sant urbano':'405026033',
  'godiasco salice terme':'403018973',
  'godrano':'419082040',
  'goito':'403020026',
  'golasecca':'403012077',
  'golferenzo':'403018074',
  'golfo aranci':'420090083',
  'gombito':'403019049',
  'gonars':'406030044',
  'goni':'420092027',
  'gonnesa':'420092028',
  'gonnoscodina':'420095022',
  'gonnosfanadiga':'420092029',
  'gonnosno':'420095023',
  'gonnostramatza':'420095024',
  'gonzaga':'403020027',
  'gordona':'403014032',
  'gorga':'412058045',
  'gorgo al monticano':'405026034',
  'gorgoglione':'417077010',
  'gorgonzola':'403015108',
  'goriano sicoli':'413066047',
  'gorizia':'406031007',
  'gorla maggiore':'403012078',
  'gorla minore':'403012079',
  'gorlago':'403016114',
  'gorle':'403016115',
  'gornate-olona':'403012080',
  'gorno':'403016116',
  'goro':'408038025',
  'gorreto':'407010026',
  'gorzegno':'401004097',
  'gosaldo':'405025025',
  'gossolengo':'408033023',
  'gottasecca':'401004098',
  'gottolengo':'403017080',
  'govone':'401004099',
  'gozzano':'401003076',
  'gradara':'411141020',
  'gradisca d isonzo':'406031008',
  'grado':'406031009',
  'gradoli':'412056028',
  'graffignana':'403098028',
  'graffignano':'412056029',
  'graglia':'401096028',
  'gragnano':'415063035',
  'gragnano trebbiense':'408033024',
  'grammichele':'419087018',
  'grana monferrato':'401005956',
  'granarolo dell emilia':'408037030',
  'grandate':'403013110',
  'grandola ed uniti':'403013111',
  'graniti':'419083034',
  'granozzo con monticello':'401003077',
  'grantola':'403012081',
  'grantorto':'405028042',
  'granze':'405028043',
  'grassano':'417077011',
  'grassobbio':'403016117',
  'gratteri':'419082041',
  'gravedona ed uniti':'403013249',
  'gravellona lomellina':'403018075',
  'gravellona toce':'401103035',
  'gravere':'401001117',
  'gravina di catania':'419087019',
  'gravina in puglia':'416072023',
  'grazzanise':'415061042',
  'grazzano badoglio':'401005057',
  'greccio':'412057031',
  'greci':'415064037',
  'greggio':'401002065',
  'gremiasco':'401006083',
  'gressan':'402007031',
  'gressoney-la-trinite':'402007032',
  'gressoney-saint-jean':'402007033',
  'greve in chianti':'409048021',
  'grezzago':'403015110',
  'grezzana':'405023038',
  'griante':'403013113',
  'gricignano di aversa':'415061043',
  'grignasco':'401003079',
  'grigno':'404022095',
  'grimacco':'406030045',
  'grimaldi':'418078059',
  'grinzane cavour':'401004100',
  'grisignano di zocco':'405024046',
  'grisolia':'418078060',
  'grizzana morandi':'408037031',
  'grognardo':'401006084',
  'gromo':'403016118',
  'grondona':'401006085',
  'grone':'403016119',
  'grontardo':'403019050',
  'gropello cairoli':'403018076',
  'gropparello':'408033025',
  'groscavallo':'401001118',
  'grosio':'403014033',
  'grosotto':'403014034',
  'grosseto':'409053011',
  'grosso':'401001119',
  'grottaferrata':'412058046',
  'grottaglie':'416073008',
  'grottaminarda':'415064038',
  'grottammare':'411044023',
  'grottazzolina':'411109008',
  'grotte':'419084018',
  'grotte di castro':'412056030',
  'grotteria':'418080040',
  'grottole':'417077012',
  'grottolella':'415064039',
  'gruaro':'405027018',
  'grugliasco':'401001120',
  'grumello cremonese ed uniti':'403019051',
  'grumello del monte':'403016120',
  'grumento nova':'417076037',
  'grumo appula':'416072024',
  'grumo nevano':'415063036',
  'grumolo delle abbadesse':'405024047',
  'guagnano':'416075034',
  'gualdo':'411043021',
  'gualdo cattaneo':'410054022',
  'gualdo tadino':'410054023',
  'gualtieri':'408035023',
  'gualtieri sicamino':'419083035',
  'guamaggiore':'420092030',
  'guanzate':'403013114',
  'guarcino':'412060042',
  'guarda veneta':'405029028',
  'guardabosone':'401002066',
  'guardamiglio':'403098029',
  'guardavalle':'418079061',
  'guardea':'410055015',
  'guardia lombardi':'415064040',
  'guardia perticara':'417076038',
  'guardia piemontese':'418078061',
  'guardia sanframondi':'415062037',
  'guardiagrele':'413069043',
  'guardialfiera':'414070027',
  'guardiaregia':'414070028',
  'guardistallo':'409050015',
  'guarene':'401004101',
  'guasila':'420092031',
  'guastalla':'408035024',
  'guazzora':'401006086',
  'gubbio':'410054024',
  'gudo visconti':'403015112',
  'guglionesi':'414070029',
  'guidizzolo':'403020028',
  'guidonia montecelio':'412058047',
  'guiglia':'408036017',
  'guilmi':'413069044',
  'gurro':'401103036',
  'guspini':'420092032',
  'gussago':'403017081',
  'gussola':'403019052',
  'hone':'402007034',
  'idro':'403017082',
  'iglesias':'420092033',
  'igliano':'401004102',
  'ilbono':'420091032',
  'illasi':'405023039',
  'illorai':'420090031',
  'imbersago':'403097039',
  'imer':'404022097',
  'imola':'408037032',
  'imperia':'407008031',
  'impruneta':'409048022',
  'inarzo':'403012082',
  'incisa scapaccino':'401005058',
  'incudine':'403017083',
  'induno olona':'403012083',
  'ingria':'401001121',
  'intragna':'401103037',
  'introbio':'403097040',
  'introd':'402007035',
  'introdacqua':'413066048',
  'inverigo':'403013118',
  'inverno e monteleone':'403018077',
  'inverso pinasca':'401001122',
  'inveruno':'403015113',
  'invorio':'401003082',
  'inzago':'403015114',
  'ionadi':'418102017',
  'irgoli':'420091033',
  'irma':'403017084',
  'irsina':'417077013',
  'isasca':'401004103',
  'isca sullo ionio':'418079063',
  'ischia':'415063037',
  'ischia di castro':'412056031',
  'ischitella':'416071025',
  'iseo':'403017085',
  'isera':'404022098',
  'isernia':'414094023',
  'isili':'420092114',
  'isnello':'419082042',
  'isola d asti':'401005059',
  'isola del cantone':'407010027',
  'isola del giglio':'409053012',
  'isola del gran sasso d italia':'413067026',
  'isola del liri':'412060043',
  'isola del piano':'411141021',
  'isola della scala':'405023040',
  'isola delle femmine':'419082043',
  'isola di capo rizzuto':'418101013',
  'isola di fondra':'403016121',
  'isola dovarese':'403019053',
  'isola rizza':'405023041',
  'isola sant antonio':'401006087',
  'isola vicentina':'405024048',
  'isolabella':'401001123',
  'isolabona':'407008032',
  'isole tremiti':'416071026',
  'isorella':'403017086',
  'ispani':'415065059',
  'ispica':'419088005',
  'ispra':'403012084',
  'issiglio':'401001124',
  'issime':'402007036',
  'isso':'403016122',
  'issogne':'402007037',
  'istrana':'405026035',
  'itala':'419083036',
  'itri':'412059010',
  'ittireddu':'420090032',
  'ittiri':'420090033',
  'ivrea':'401001125',
  'izano':'403019054',
  'jacurso':'418079065',
  'jelsi':'414070030',
  'jenne':'412058048',
  'jerago con orago':'403012085',
  'jerzu':'420091035',
  'jesi':'411042021',
  'jesolo':'405027019',
  'jolanda di savoia':'408038010',
  'joppolo':'418102018',
  'joppolo giancaxio':'419084019',
  'jovencan':'402007038',
  'la cassa':'401001126',
  'la loggia':'401001127',
  'la maddalena':'420090035',
  'la magdeleine':'402007039',
  'la morra':'401004105',
  'la salle':'402007040',
  'la spezia':'407011015',
  'la thuile':'402007041',
  'la valle':'404021117',
  'la valle agordina':'405025027',
  'la valletta brianza':'403097092',
  'labico':'412058049',
  'labro':'412057032',
  'lacchiarella':'403015115',
  'lacco ameno':'415063038',
  'lacedonia':'415064041',
  'laces':'404021037',
  'laconi':'420091036',
  'ladispoli':'412058116',
  'laerru':'420090034',
  'laganadi':'418080041',
  'laghi':'405024049',
  'laglio':'403013119',
  'lagnasco':'401004104',
  'lago':'418078062',
  'lagonegro':'417076039',
  'lagosanto':'408038011',
  'lagundo':'404021038',
  'laigueglia':'407009033',
  'lainate':'403015116',
  'laino':'403013120',
  'laino borgo':'418078063',
  'laino castello':'418078064',
  'laion':'404021039',
  'laives':'404021040',
  'lajatico':'409050016',
  'lallio':'403016123',
  'lama dei peligni':'413069045',
  'lama mocogno':'408036018',
  'lambrugo':'403013121',
  'lamezia terme':'418079160',
  'lamon':'405025026',
  'lampedusa e linosa':'419084020',
  'lamporecchio':'409047005',
  'lamporo':'401002067',
  'lana':'404021041',
  'lanciano':'413069046',
  'landiona':'401003083',
  'landriano':'403018078',
  'langhirano':'408034018',
  'langosco':'403018079',
  'lanusei':'420091037',
  'lanuvio':'412058050',
  'lanzada':'403014036',
  'lanzo torinese':'401001128',
  'lapedona':'411109009',
  'lapio':'415064042',
  'lappano':'418078065',
  'l aquila':'413066049',
  'larciano':'409047006',
  'lardirago':'403018080',
  'lariano':'412058115',
  'larino':'414070031',
  'las plassas':'420092034',
  'lasa':'404021042',
  'lascari':'419082044',
  'lasnigo':'403013123',
  'lastebasse':'405024050',
  'lastra a signa':'409048024',
  'latera':'412056032',
  'laterina pergine valdarno':'409051042',
  'laterza':'416073009',
  'latiano':'416074009',
  'latina':'412059011',
  'latisana':'406030046',
  'latronico':'417076040',
  'lattarico':'418078066',
  'lauco':'406030047',
  'laureana cilento':'415065060',
  'laureana di borrello':'418080042',
  'lauregno':'404021043',
  'laurenzana':'417076041',
  'lauria':'417076042',
  'lauriano':'401001129',
  'laurino':'415065061',
  'laurito':'415065062',
  'lauro':'415064043',
  'lavagna':'407010028',
  'lavagno':'405023042',
  'lavarone':'404022102',
  'lavello':'417076043',
  'lavena-ponte tresa':'403012086',
  'laveno-mombello':'403012087',
  'lavenone':'403017087',
  'laviano':'415065063',
  'lavis':'404022103',
  'lazise':'405023043',
  'lazzate':'403108025',
  'lecce':'416075035',
  'lecce nei marsi':'413066050',
  'lecco':'403097042',
  'ledro':'404022229',
  'leffe':'403016124',
  'leggiuno':'403012088',
  'legnago':'405023044',
  'legnano':'403015118',
  'legnaro':'405028044',
  'lei':'420091038',
  'leini':'401001130',
  'leivi':'407010029',
  'lemie':'401001131',
  'lendinara':'405029029',
  'leni':'419083037',
  'lenna':'403016125',
  'leno':'403017088',
  'lenola':'412059012',
  'lenta':'401002068',
  'lentate sul seveso':'403108054',
  'lentella':'413069047',
  'lentini':'419089011',
  'leonessa':'412057033',
  'leonforte':'419086011',
  'leporano':'416073010',
  'lequile':'416075036',
  'lequio berria':'401004106',
  'lequio tanaro':'401004107',
  'lercara friddi':'419082045',
  'lerici':'407011016',
  'lerma':'401006088',
  'lesa':'401003084',
  'lesegno':'401004108',
  'lesignano de bagni':'408034019',
  'lesina':'416071027',
  'lesmo':'403108026',
  'lessolo':'401001132',
  'lessona':'401096085',
  'lestizza':'406030048',
  'letino':'415061044',
  'letojanni':'419083038',
  'lettere':'415063039',
  'lettomanoppello':'413068020',
  'lettopalena':'413069048',
  'levanto':'407011017',
  'levate':'403016126',
  'leverano':'416075037',
  'levice':'401004109',
  'levico terme':'404022104',
  'levone':'401001133',
  'lezzeno':'403013126',
  'liberi':'415061045',
  'librizzi':'419083039',
  'licata':'419084021',
  'licciana nardi':'409045009',
  'licenza':'412058051',
  'licodia eubea':'419087020',
  'lierna':'403097043',
  'lignana':'401002070',
  'lignano-sabbiadoro':'406030049',
  'lillianes':'402007042',
  'limana':'405025029',
  'limatola':'415062038',
  'limbadi':'418102019',
  'limbiate':'403108027',
  'limena':'405028045',
  'limido comasco':'403013128',
  'limina':'419083040',
  'limone piemonte':'401004110',
  'limone sul garda':'403017089',
  'limosano':'414070032',
  'linarolo':'403018081',
  'linguaglossa':'419087021',
  'lioni':'415064044',
  'lipari':'419083041',
  'lipomo':'403013129',
  'lirio':'403018082',
  'liscate':'403015122',
  'liscia':'413069049',
  'lisciano niccone':'410054025',
  'lisio':'401004111',
  'lissone':'403108028',
  'liveri':'415063040',
  'livigno':'403014037',
  'livinallongo del col di lana':'405025030',
  'livo':'403013130',
  'livorno':'409049009',
  'livorno ferraris':'401002071',
  'livraga':'403098030',
  'lizzanello':'416075038',
  'lizzano':'416073011',
  'lizzano in belvedere':'408037033',
  'loano':'407009034',
  'loazzolo':'401005060',
  'locana':'401001134',
  'locate di triulzi':'403015125',
  'locate varesino':'403013131',
  'locatello':'403016127',
  'loceri':'420091039',
  'locorotondo':'416072025',
  'locri':'418080043',
  'loculi':'420091040',
  'lode':'420091041',
  'lodi':'403098031',
  'lodi vecchio':'403098032',
  'lodine':'420091104',
  'lodrino':'403017090',
  'lograto':'403017091',
  'loiano':'408037034',
  'loiri porto san paolo':'420090084',
  'lomagna':'403097044',
  'lomazzo':'403013133',
  'lombardore':'401001135',
  'lombriasco':'401001136',
  'lomello':'403018083',
  'lona-lases':'404022108',
  'lonate ceppino':'403012089',
  'lonate pozzolo':'403012090',
  'lonato del garda':'403017992',
  'londa':'409048025',
  'longano':'414094024',
  'longare':'405024051',
  'longarone':'405025071',
  'longhena':'403017093',
  'longi':'419083042',
  'longiano':'408140018',
  'longobardi':'418078067',
  'longobucco':'418078068',
  'longone al segrino':'403013134',
  'longone sabino':'412057034',
  'lonigo':'405024052',
  'loranze':'401001137',
  'loreggia':'405028046',
  'loreglia':'401103038',
  'lorenzago di cadore':'405025032',
  'loreo':'405029030',
  'loreto':'411042022',
  'loreto aprutino':'413068021',
  'loria':'405026036',
  'loro ciuffenna':'409051020',
  'loro piceno':'411043022',
  'lorsica':'407010030',
  'losine':'403017094',
  'lotzorai':'420091042',
  'lovere':'403016128',
  'lovero':'403014038',
  'lozio':'403017095',
  'lozza':'403012091',
  'lozzo atestino':'405028047',
  'lozzo di cadore':'405025033',
  'lozzolo':'401002072',
  'lu e cuccaro monferrato':'401006193',
  'lubriano':'412056033',
  'lucca':'409046017',
  'lucca sicula':'419084022',
  'lucera':'416071028',
  'lucignano':'409051021',
  'lucinasco':'407008033',
  'lucito':'414070033',
  'luco dei marsi':'413066051',
  'lucoli':'413066052',
  'lugagnano val d arda':'408033026',
  'lugnano in teverina':'410055016',
  'lugo':'408039012',
  'lugo di vicenza':'405024053',
  'luino':'403012092',
  'luisago':'403013135',
  'lula':'420091043',
  'lumarzo':'407010031',
  'lumezzane':'403017096',
  'lunamatrona':'420092035',
  'lunano':'411141022',
  'lungavilla':'403018084',
  'lungro':'418078069',
  'luni':'407011920',
  'luogosano':'415064045',
  'luogosanto':'420090036',
  'lupara':'414070034',
  'lurago d erba':'403013136',
  'lurago marinone':'403013137',
  'lurano':'403016129',
  'luras':'420090037',
  'lurate caccivio':'403013138',
  'lusciano':'415061046',
  'luserna':'404022109',
  'luserna san giovanni':'401001139',
  'lusernetta':'401001140',
  'lusevera':'406030051',
  'lusia':'405029031',
  'lusiana conco':'405024127',
  'lusiglie':'401001141',
  'luson':'404021044',
  'lustra':'415065064',
  'luvinate':'403012093',
  'luzzana':'403016130',
  'luzzara':'408035026',
  'luzzi':'418078070',
  'maccagno con pino e veddasca':'403012142',
  'maccastorna':'403098033',
  'macchia d isernia':'414094025',
  'macchia valfortore':'414070035',
  'macchiagodena':'414094026',
  'macello':'401001142',
  'macerata':'411043023',
  'macerata campania':'415061047',
  'macerata feltria':'411141023',
  'macherio':'403108029',
  'maclodio':'403017097',
  'macomer':'420091044',
  'macra':'401004112',
  'macugnaga':'401103039',
  'maddaloni':'415061048',
  'madesimo':'403014035',
  'madignano':'403019055',
  'madone':'403016131',
  'madonna del sasso':'401103040',
  'madruzzo':'404022243',
  'maenza':'412059013',
  'mafalda':'414070036',
  'magasa':'403017098',
  'magenta':'403015130',
  'maggiora':'401003088',
  'magherno':'403018085',
  'magione':'410054026',
  'magisano':'418079068',
  'magliano alfieri':'401004113',
  'magliano alpi':'401004114',
  'magliano de marsi':'413066053',
  'magliano di tenna':'411109010',
  'magliano in toscana':'409053013',
  'magliano romano':'412058052',
  'magliano sabina':'412057035',
  'magliano vetere':'415065065',
  'maglie':'416075039',
  'magliolo':'407009035',
  'maglione':'401001143',
  'magnacavallo':'403020029',
  'magnago':'403015131',
  'magnano':'401096030',
  'magnano in riviera':'406030052',
  'magomadas':'420091045',
  'magre sulla strada del vino':'404021045',
  'magreglio':'403013139',
  'maida':'418079069',
  'maiera':'418078071',
  'maierato':'418102020',
  'maiolati spontini':'411042023',
  'maiolo':'408099022',
  'maiori':'415065066',
  'mairago':'403098034',
  'mairano':'403017099',
  'maissana':'407011018',
  'majano':'406030053',
  'malagnino':'403019056',
  'malalbergo':'408037035',
  'malborghetto-valbruna':'406030054',
  'malcesine':'405023045',
  'male':'404022110',
  'malegno':'403017100',
  'maleo':'403098035',
  'malesco':'401103041',
  'maletto':'419087022',
  'malfa':'419083043',
  'malgrate':'403097045',
  'malito':'418078072',
  'mallare':'407009036',
  'malles venosta':'404021046',
  'malnate':'403012096',
  'malo':'405024055',
  'malonno':'403017101',
  'maltignano':'411044027',
  'malvagna':'419083044',
  'malvicino':'401006090',
  'malvito':'418078073',
  'mammola':'418080044',
  'mamoiada':'420091046',
  'manciano':'409053014',
  'mandanici':'419083045',
  'mandas':'420092036',
  'mandatoriccio':'418078074',
  'mandela':'412058053',
  'mandello del lario':'403097046',
  'mandello vitta':'401003090',
  'manduria':'416073012',
  'manerba del garda':'403017102',
  'manerbio':'403017103',
  'manfredonia':'416071029',
  'mango':'401004115',
  'mangone':'418078075',
  'maniace':'419087057',
  'maniago':'406093025',
  'manocalzati':'415064046',
  'manoppello':'413068022',
  'mansue':'405026037',
  'manta':'401004116',
  'mantello':'403014039',
  'mantova':'403020030',
  'manzano':'406030055',
  'manziana':'412058054',
  'mapello':'403016132',
  'mappano':'401001316',
  'mara':'420090038',
  'maracalagonis':'420092037',
  'maranello':'408036019',
  'marano di napoli':'415063041',
  'marano di valpolicella':'405023046',
  'marano equo':'412058055',
  'marano lagunare':'406030056',
  'marano marchesato':'418078076',
  'marano principato':'418078077',
  'marano sul panaro':'408036020',
  'marano ticino':'401003091',
  'marano vicentino':'405024056',
  'maranzana':'401005061',
  'maratea':'417076044',
  'marcallo con casone':'403015134',
  'marcaria':'403020031',
  'marcedusa':'418079071',
  'marcellina':'412058056',
  'marcellinara':'418079072',
  'marcetelli':'412057036',
  'marcheno':'403017104',
  'marchirolo':'403012097',
  'marciana':'409049010',
  'marciana marina':'409049011',
  'marcianise':'415061049',
  'marciano della chiana':'409051022',
  'marcignago':'403018086',
  'marcon':'405027020',
  'marebbe':'404021047',
  'marene':'401004117',
  'mareno di piave':'405026038',
  'marentino':'401001144',
  'maretto':'401005062',
  'margarita':'401004118',
  'margherita di savoia':'416110005',
  'margno':'403097047',
  'mariana mantovana':'403020032',
  'mariano comense':'403013143',
  'mariano del friuli':'406031010',
  'marianopoli':'419085008',
  'mariglianella':'415063042',
  'marigliano':'415063043',
  'marina di gioiosa ionica':'418080045',
  'marineo':'419082046',
  'marino':'412058057',
  'marlengo':'404021048',
  'marliana':'409047007',
  'marmentino':'403017105',
  'marmirolo':'403020033',
  'marmora':'401004119',
  'marnate':'403012098',
  'marone':'403017106',
  'maropati':'418080046',
  'marostica':'405024057',
  'marradi':'409048026',
  'marrubiu':'420095025',
  'marsaglia':'401004120',
  'marsala':'419081011',
  'marsciano':'410054027',
  'marsico nuovo':'417076045',
  'marsicovetere':'417076046',
  'marta':'412056034',
  'martano':'416075040',
  'martellago':'405027021',
  'martello':'404021049',
  'martignacco':'406030057',
  'martignana di po':'403019057',
  'martignano':'416075041',
  'martina franca':'416073013',
  'martinengo':'403016133',
  'martiniana po':'401004121',
  'martinsicuro':'413067047',
  'martirano':'418079073',
  'martirano lombardo':'418079074',
  'martis':'420090039',
  'martone':'418080047',
  'marudo':'403098036',
  'maruggio':'416073014',
  'marzabotto':'408037036',
  'marzano':'403018087',
  'marzano appio':'415061050',
  'marzano di nola':'415064047',
  'marzi':'418078078',
  'marzio':'403012099',
  'masainas':'420092103',
  'masate':'403015136',
  'mascali':'419087023',
  'mascalucia':'419087024',
  'maschito':'417076047',
  'masciago primo':'403012100',
  'maser':'405026039',
  'masera':'401103042',
  'masera di padova':'405028048',
  'maserada sul piave':'405026040',
  'masi':'405028049',
  'masi torello':'408038012',
  'masio':'401006091',
  'maslianico':'403013144',
  'masone':'407010032',
  'massa':'409045010',
  'massa d albe':'413066054',
  'massa di somma':'415063092',
  'massa e cozzile':'409047008',
  'massa fermana':'411109011',
  'massa lombarda':'408039013',
  'massa lubrense':'415063044',
  'massa marittima':'409053015',
  'massa martana':'410054028',
  'massafra':'416073015',
  'massalengo':'403098037',
  'massanzago':'405028050',
  'massarosa':'409046018',
  'massazza':'401096031',
  'massello':'401001145',
  'masserano':'401096032',
  'massignano':'411044029',
  'massimeno':'404022112',
  'massimino':'407009037',
  'massino visconti':'401003093',
  'massiola':'401103043',
  'masullas':'420095026',
  'matelica':'411043024',
  'matera':'417077014',
  'mathi':'401001146',
  'matino':'416075042',
  'matrice':'414070037',
  'mattie':'401001147',
  'mattinata':'416071031',
  'mazara del vallo':'419081012',
  'mazzano':'403017107',
  'mazzano romano':'412058058',
  'mazzarino':'419085009',
  'mazzarra sant andrea':'419083046',
  'mazzarrone':'419087056',
  'mazze':'401001148',
  'mazzin':'404022113',
  'mazzo di valtellina':'403014040',
  'meana di susa':'401001149',
  'meana sardo':'420091047',
  'meda':'403108030',
  'mede':'403018088',
  'medea':'406031011',
  'medesano':'408034020',
  'medicina':'408037037',
  'mediglia':'403015139',
  'medolago':'403016250',
  'medole':'403020034',
  'medolla':'408036021',
  'meduna di livenza':'405026041',
  'meduno':'406093026',
  'megliadino san vitale':'405028052',
  'meina':'401003095',
  'melara':'405029032',
  'melazzo':'401006092',
  'meldola':'408140019',
  'mele':'407010033',
  'melegnano':'403015140',
  'melendugno':'416075043',
  'meleti':'403098038',
  'melfi':'417076048',
  'melicucca':'418080048',
  'melicucco':'418080049',
  'melilli':'419089012',
  'melissa':'418101014',
  'melissano':'416075044',
  'melito di napoli':'415063045',
  'melito di porto salvo':'418080050',
  'melito irpino':'415064048',
  'melizzano':'415062039',
  'melle':'401004122',
  'mello':'403014041',
  'melpignano':'416075045',
  'meltina':'404021050',
  'melzo':'403015142',
  'menaggio':'403013145',
  'menconico':'403018089',
  'mendatica':'407008034',
  'mendicino':'418078079',
  'menfi':'419084023',
  'mentana':'412058059',
  'meolo':'405027022',
  'merana':'401006093',
  'merano':'404021051',
  'merate':'403097048',
  'mercallo':'403012101',
  'mercatello sul metauro':'411141025',
  'mercatino conca':'411141026',
  'mercato san severino':'415065067',
  'mercato saraceno':'408140020',
  'mercenasco':'401001150',
  'mercogliano':'415064049',
  'mereto di tomba':'406030058',
  'mergo':'411042024',
  'mergozzo':'401103044',
  'meri':'419083047',
  'merlara':'405028053',
  'merlino':'403098039',
  'merone':'403013147',
  'mesagne':'416074010',
  'mese':'403014043',
  'mesenzana':'403012102',
  'mesero':'403015144',
  'mesola':'408038014',
  'mesoraca':'418101015',
  'messina':'419083048',
  'mestrino':'405028054',
  'meta':'415063046',
  'mezzago':'403108031',
  'mezzana':'404022114',
  'mezzana bigli':'403018090',
  'mezzana mortigliengo':'401096033',
  'mezzana rabattone':'403018091',
  'mezzane di sotto':'405023047',
  'mezzanego':'407010034',
  'mezzanino':'403018092',
  'mezzano':'404022115',
  'mezzenile':'401001152',
  'mezzocorona':'404022116',
  'mezzojuso':'419082047',
  'mezzoldo':'403016134',
  'mezzolombardo':'404022117',
  'mezzomerico':'401003097',
  'miagliano':'401096034',
  'miane':'405026042',
  'miasino':'401003098',
  'miazzina':'401103045',
  'micigliano':'412057037',
  'miggiano':'416075046',
  'miglianico':'413069050',
  'miglierina':'418079077',
  'miglionico':'417077015',
  'mignanego':'407010035',
  'mignano monte lungo':'415061051',
  'milano':'403015146',
  'milazzo':'419083049',
  'milena':'419085010',
  'mileto':'418102021',
  'milis':'420095027',
  'militello in val di catania':'419087025',
  'militello rosmarino':'419083050',
  'millesimo':'407009038',
  'milo':'419087026',
  'milzano':'403017108',
  'mineo':'419087027',
  'minerbe':'405023048',
  'minerbio':'408037038',
  'minervino di lecce':'416075047',
  'minervino murge':'416110006',
  'minori':'415065068',
  'minturno':'412059014',
  'minucciano':'409046019',
  'mioglia':'407009039',
  'mira':'405027023',
  'mirabella eclano':'415064050',
  'mirabella imbaccari':'419087028',
  'mirabello monferrato':'401006094',
  'mirabello sannitico':'414070038',
  'miradolo terme':'403018093',
  'miranda':'414094027',
  'mirandola':'408036022',
  'mirano':'405027024',
  'mirto':'419083051',
  'misano adriatico':'408099005',
  'misano di gera d adda':'403016135',
  'misiliscemi':'419081025',
  'misilmeri':'419082048',
  'misinto':'403108032',
  'missaglia':'403097049',
  'missanello':'417076049',
  'misterbianco':'419087029',
  'mistretta':'419083052',
  'moasca':'401005063',
  'moconesi':'407010036',
  'modena':'408036023',
  'modica':'419088006',
  'modigliana':'408140022',
  'modolo':'420091048',
  'modugno':'416072027',
  'moena':'404022118',
  'moggio':'403097050',
  'moggio udinese':'406030059',
  'moglia':'403020035',
  'mogliano':'411043025',
  'mogliano veneto':'405026043',
  'mogorella':'420095028',
  'mogoro':'420095029',
  'moiano':'415062040',
  'moimacco':'406030060',
  'moio alcantara':'419083053',
  'moio de calvi':'403016136',
  'moio della civitella':'415065069',
  'moiola':'401004123',
  'mola di bari':'416072028',
  'molare':'401006095',
  'molazzana':'409046020',
  'molfetta':'416072029',
  'molina aterno':'413066055',
  'molinara':'415062041',
  'molinella':'408037039',
  'molini di triora':'407008035',
  'molino dei torti':'401006096',
  'molise':'414070039',
  'moliterno':'417076050',
  'mollia':'401002078',
  'molochio':'418080051',
  'molteno':'403097051',
  'moltrasio':'403013152',
  'molveno':'404022120',
  'mombaldone':'401005064',
  'mombarcaro':'401004124',
  'mombaroccio':'411141027',
  'mombaruzzo':'401005065',
  'mombasiglio':'401004125',
  'mombello di torino':'401001153',
  'mombello monferrato':'401006097',
  'mombercelli':'401005066',
  'momo':'401003100',
  'mompantero':'401001154',
  'mompeo':'412057038',
  'momperone':'401006098',
  'monacilioni':'414070040',
  'monale':'401005067',
  'monasterace':'418080052',
  'monastero bormida':'401005068',
  'monastero di lanzo':'401001155',
  'monastero di vasco':'401004126',
  'monasterolo casotto':'401004127',
  'monasterolo del castello':'403016137',
  'monasterolo di savigliano':'401004128',
  'monastier di treviso':'405026044',
  'monastir':'420092038',
  'moncalieri':'401001156',
  'moncalvo':'401005069',
  'moncenisio':'401001157',
  'moncestino':'401006099',
  'monchiero':'401004129',
  'monchio delle corti':'408034022',
  'moncrivello':'401002079',
  'moncucco torinese':'401005070',
  'mondaino':'408099006',
  'mondavio':'411141028',
  'mondolfo':'411141029',
  'mondovi':'401004130',
  'mondragone':'415061052',
  'moneglia':'407010037',
  'monesiglio':'401004131',
  'monfalcone':'406031012',
  'monforte d alba':'401004132',
  'monforte san giorgio':'419083054',
  'monfumo':'405026045',
  'mongardino':'401005071',
  'monghidoro':'408037040',
  'mongiana':'418102022',
  'mongiardino ligure':'401006100',
  'mongiuffi melia':'419083055',
  'mongrando':'401096035',
  'mongrassano':'418078080',
  'monguelfo-tesido':'404021952',
  'monguzzo':'403013153',
  'moniga del garda':'403017109',
  'monleale':'401006101',
  'monno':'403017110',
  'monopoli':'416072030',
  'monreale':'419082049',
  'monrupino':'406032002',
  'monsampietro morico':'411109012',
  'monsampolo del tronto':'411044031',
  'monsano':'411042025',
  'monselice':'405028055',
  'monserrato':'420092109',
  'monsummano terme':'409047009',
  'monta':'401004133',
  'montabone':'401005072',
  'montacuto':'401006102',
  'montafia':'401005073',
  'montagano':'414070041',
  'montagna in valtellina':'403014044',
  'montagna sulla strada del vino':'404021953',
  'montagnana':'405028056',
  'montagnareale':'419083056',
  'montaguto':'415064051',
  'montaione':'409048027',
  'montalbano elicona':'419083057',
  'montalbano jonico':'417077016',
  'montalcino':'409052037',
  'montaldeo':'401006103',
  'montaldo bormida':'401006104',
  'montaldo di mondovi':'401004134',
  'montaldo roero':'401004135',
  'montaldo scarampi':'401005074',
  'montaldo torinese':'401001158',
  'montale':'409047010',
  'montalenghe':'401001159',
  'montallegro':'419084024',
  'montalto carpasio':'407008068',
  'montalto delle marche':'411044032',
  'montalto di castro':'412056035',
  'montalto dora':'401001160',
  'montalto pavese':'403018094',
  'montalto uffugo':'418078081',
  'montanaro':'401001161',
  'montanaso lombardo':'403098040',
  'montanera':'401004136',
  'montano antilia':'415065070',
  'montano lucino':'403013154',
  'montappone':'411109013',
  'montaquila':'414094028',
  'montasola':'412057039',
  'montauro':'418079080',
  'montazzoli':'413069051',
  'monte argentario':'409053016',
  'monte castello di vibio':'410054029',
  'monte cavallo':'411043027',
  'monte cerignone':'411141031',
  'monte compatri':'412058060',
  'monte cremasco':'403019058',
  'monte di malo':'405024063',
  'monte di procida':'415063047',
  'monte giberto':'411109016',
  'monte grimano terme':'411141935',
  'monte isola':'403017111',
  'monte marenzo':'403097052',
  'monte porzio':'411141038',
  'monte porzio catone':'412058064',
  'monte rinaldo':'411109021',
  'monte roberto':'411042029',
  'monte romano':'412056037',
  'monte san biagio':'412059015',
  'monte san giacomo':'415065075',
  'monte san giovanni campano':'412060044',
  'monte san giovanni in sabina':'412057043',
  'monte san giusto':'411043031',
  'monte san martino':'411043032',
  'monte san pietrangeli':'411109023',
  'monte san pietro':'408037042',
  'monte san savino':'409051025',
  'monte san vito':'411042030',
  'monte santa maria tiberina':'410054032',
  'monte sant angelo':'416071033',
  'monte urano':'411109024',
  'monte vidon combatte':'411109025',
  'monte vidon corrado':'411109026',
  'montebello della battaglia':'403018095',
  'montebello di bertona':'413068023',
  'montebello ionico':'418080053',
  'montebello sul sangro':'413069009',
  'montebello vicentino':'405024060',
  'montebelluna':'405026046',
  'montebruno':'407010038',
  'montebuono':'412057040',
  'montecalvo in foglia':'411141030',
  'montecalvo irpino':'415064052',
  'montecalvo versiggia':'403018096',
  'montecarlo':'409046021',
  'montecarotto':'411042026',
  'montecassiano':'411043026',
  'montecastello':'401006105',
  'montecastrilli':'410055017',
  'montecatini val di cecina':'409050019',
  'montecatini-terme':'409047011',
  'montecchia di crosara':'405023049',
  'montecchio':'410055018',
  'montecchio emilia':'408035027',
  'montecchio maggiore':'405024061',
  'montecchio precalcino':'405024062',
  'montechiaro d acqui':'401006106',
  'montechiaro d asti':'401005075',
  'montechiarugolo':'408034023',
  'montecilfone':'414070042',
  'montecopiolo':'411099030',
  'montecorice':'415065071',
  'montecorvino pugliano':'415065072',
  'montecorvino rovella':'415065073',
  'montecosaro':'411043028',
  'montecrestese':'401103046',
  'montecreto':'408036024',
  'montedinove':'411044034',
  'montedoro':'419085011',
  'montefalcione':'415064053',
  'montefalco':'410054030',
  'montefalcone appennino':'411109014',
  'montefalcone di val fortore':'415062042',
  'montefalcone nel sannio':'414070043',
  'montefano':'411043029',
  'montefelcino':'411141034',
  'monteferrante':'413069052',
  'montefiascone':'412056036',
  'montefino':'413067027',
  'montefiore conca':'408099008',
  'montefiore dell aso':'411044036',
  'montefiorino':'408036025',
  'monteflavio':'412058061',
  'monteforte cilento':'415065074',
  'monteforte d alpone':'405023050',
  'monteforte irpino':'415064054',
  'montefortino':'411109015',
  'montefranco':'410055019',
  'montefredane':'415064055',
  'montefusco':'415064056',
  'montegabbione':'410055020',
  'montegalda':'405024064',
  'montegaldella':'405024065',
  'montegallo':'411044038',
  'montegioco':'401006107',
  'montegiordano':'418078082',
  'montegiorgio':'411109017',
  'montegranaro':'411109018',
  'montegridolfo':'408099009',
  'montegrino - valtravaglia':'403012103',
  'montegrosso d asti':'401005076',
  'montegrosso pian latte':'407008037',
  'montegrotto terme':'405028057',
  'monteiasi':'416073016',
  'montelabbate':'411141036',
  'montelanico':'412058062',
  'montelapiano':'413069053',
  'monteleone di fermo':'411109019',
  'monteleone di puglia':'416071032',
  'monteleone di spoleto':'410054031',
  'monteleone d orvieto':'410055021',
  'monteleone rocca doria':'420090040',
  'monteleone sabino':'412057041',
  'montelepre':'419082050',
  'montelibretti':'412058063',
  'montella':'415064057',
  'montello':'403016139',
  'montelongo':'414070044',
  'montelparo':'411109020',
  'montelupo albese':'401004137',
  'montelupo fiorentino':'409048028',
  'montelupone':'411043030',
  'montemaggiore belsito':'419082051',
  'montemagno monferrato':'401005977',
  'montemale di cuneo':'401004138',
  'montemarano':'415064058',
  'montemarciano':'411042027',
  'montemarzino':'401006108',
  'montemesola':'416073017',
  'montemezzo':'403013155',
  'montemignaio':'409051023',
  'montemiletto':'415064059',
  'montemilone':'417076051',
  'montemitro':'414070045',
  'montemonaco':'411044044',
  'montemurlo':'409100003',
  'montemurro':'417076052',
  'montenars':'406030061',
  'montenero di bisaccia':'414070046',
  'montenero sabino':'412057042',
  'montenero val cocchiara':'414094029',
  'montenerodomo':'413069054',
  'monteodorisio':'413069055',
  'montepaone':'418079081',
  'monteparano':'416073018',
  'monteprandone':'411044045',
  'montepulciano':'409052015',
  'monterchi':'409051024',
  'montereale':'413066056',
  'montereale valcellina':'406093027',
  'monterenzio':'408037041',
  'monteriggioni':'409052016',
  'monteroduni':'414094030',
  'monteroni d arbia':'409052017',
  'monteroni di lecce':'416075048',
  'monterosi':'412056038',
  'monterosso al mare':'407011019',
  'monterosso almo':'419088007',
  'monterosso calabro':'418102023',
  'monterosso grana':'401004139',
  'monterotondo':'412058065',
  'monterotondo marittimo':'409053027',
  'monterubbiano':'411109022',
  'montesano salentino':'416075049',
  'montesano sulla marcellana':'415065076',
  'montesarchio':'415062043',
  'montescaglioso':'417077017',
  'montescano':'403018097',
  'montescheno':'401103047',
  'montescudaio':'409050020',
  'montescudo-monte colombo':'408099029',
  'montese':'408036026',
  'montesegale':'403018098',
  'montesilvano':'413068024',
  'montespertoli':'409048030',
  'monteu da po':'401001162',
  'monteu roero':'401004140',
  'montevago':'419084025',
  'montevarchi':'409051026',
  'montevecchia':'403097053',
  'monteverde':'415064060',
  'monteverdi marittimo':'409050021',
  'monteviale':'405024066',
  'montezemolo':'401004141',
  'monti':'420090041',
  'montiano':'408140028',
  'monticelli brusati':'403017112',
  'monticelli d ongina':'408033027',
  'monticelli pavese':'403018099',
  'monticello brianza':'403097054',
  'monticello conte otto':'405024067',
  'monticello d alba':'401004142',
  'montichiari':'403017113',
  'monticiano':'409052018',
  'montieri':'409053017',
  'montiglio monferrato':'401005516',
  'montignoso':'409045011',
  'montirone':'403017114',
  'montjovet':'402007043',
  'montodine':'403019059',
  'montoggio':'407010039',
  'montone':'410054033',
  'montopoli di sabina':'412057044',
  'montopoli in val d arno':'409050022',
  'montorfano':'403013157',
  'montorio al vomano':'413067028',
  'montorio nei frentani':'414070047',
  'montorio romano':'412058066',
  'montoro':'415064121',
  'montorso vicentino':'405024068',
  'montottone':'411109027',
  'montresta':'420091049',
  'montu beccaria':'403018100',
  'monvalle':'403012104',
  'monza':'403108033',
  'monzambano':'403020036',
  'monzuno':'408037044',
  'morano calabro':'418078083',
  'morano sul po':'401006109',
  'moransengo-tonengo':'401005122',
  'moraro':'406031013',
  'morazzone':'403012105',
  'morbegno':'403014045',
  'morbello':'401006110',
  'morciano di leuca':'416075050',
  'morciano di romagna':'408099011',
  'morcone':'415062044',
  'mordano':'408037045',
  'morengo':'403016140',
  'mores':'420090042',
  'moresco':'411109028',
  'moretta':'401004143',
  'morfasso':'408033028',
  'morgano':'405026047',
  'morgex':'402007044',
  'morgongiori':'420095030',
  'mori':'404022123',
  'moriago della battaglia':'405026048',
  'moricone':'412058067',
  'morigerati':'415065077',
  'morimondo':'403015150',
  'morino':'413066057',
  'moriondo torinese':'401001163',
  'morlupo':'412058068',
  'mormanno':'418078084',
  'mornago':'403012106',
  'mornese':'401006111',
  'mornico al serio':'403016141',
  'mornico losana':'403018101',
  'morolo':'412060045',
  'morozzo':'401004144',
  'morra de sanctis':'415064063',
  'morro d alba':'411042031',
  'morro d oro':'413067029',
  'morro reatino':'412057045',
  'morrone del sannio':'414070048',
  'morrovalle':'411043033',
  'morsano al tagliamento':'406093028',
  'morsasco':'401006112',
  'mortara':'403018102',
  'mortegliano':'406030062',
  'morterone':'403097055',
  'moruzzo':'406030063',
  'moscazzano':'403019060',
  'moschiano':'415064064',
  'mosciano sant angelo':'413067030',
  'moscufo':'413068025',
  'moso in passiria':'404021054',
  'mossa':'406031014',
  'mosso':'401096501',
  'motta baluffi':'403019061',
  'motta camastra':'419083058',
  'motta d affermo':'419083059',
  'motta dei conti':'401002082',
  'motta di livenza':'405026049',
  'motta montecorvino':'416071034',
  'motta san giovanni':'418080054',
  'motta santa lucia':'418079083',
  'motta sant anastasia':'419087030',
  'motta visconti':'403015151',
  'mottafollone':'418078085',
  'mottalciata':'401096037',
  'motteggiana':'403020037',
  'mottola':'416073019',
  'mozzagrogna':'413069056',
  'mozzanica':'403016142',
  'mozzate':'403013159',
  'mozzecane':'405023051',
  'mozzo':'403016143',
  'muccia':'411043034',
  'muggia':'406032003',
  'muggio':'403108034',
  'mugnano del cardinale':'415064065',
  'mugnano di napoli':'415063048',
  'mulazzano':'403098041',
  'mulazzo':'409045012',
  'mura':'403017115',
  'muravera':'420092039',
  'murazzano':'401004145',
  'murello':'401004146',
  'murialdo':'407009040',
  'murisengo':'401006113',
  'murlo':'409052019',
  'muro leccese':'416075051',
  'muro lucano':'417076053',
  'muros':'420090043',
  'muscoline':'403017116',
  'musei':'420092040',
  'musile di piave':'405027025',
  'musso':'403013160',
  'mussolente':'405024070',
  'mussomeli':'419085012',
  'muzzana del turgnano':'406030064',
  'muzzano':'401096038',
  'nago-torbole':'404022124',
  'nalles':'404021055',
  'nanto':'405024071',
  'napoli':'415063049',
  'narbolia':'420095031',
  'narcao':'420092041',
  'nardo':'416075052',
  'nardodipace':'418102024',
  'narni':'410055022',
  'naro':'419084026',
  'narzole':'401004147',
  'nasino':'407009041',
  'naso':'419083060',
  'naturno':'404021056',
  'nave':'403017117',
  'navelli':'413066058',
  'naz sciaves':'404021057',
  'nazzano':'412058069',
  'ne':'407010040',
  'nebbiuno':'401003103',
  'negrar di valpolicella':'405023952',
  'neirone':'407010041',
  'neive':'401004148',
  'nembro':'403016144',
  'nemi':'412058070',
  'nemoli':'417076054',
  'neoneli':'420095032',
  'nepi':'412056039',
  'nereto':'413067031',
  'nerola':'412058071',
  'nervesa della battaglia':'405026050',
  'nerviano':'403015154',
  'nespolo':'412057046',
  'nesso':'403013161',
  'netro':'401096039',
  'nettuno':'412058072',
  'neviano':'416075053',
  'neviano degli arduini':'408034024',
  'neviglie':'401004149',
  'niardo':'403017118',
  'nibbiola':'401003104',
  'nibionno':'403097056',
  'nichelino':'401001164',
  'nicolosi':'419087031',
  'nicorvo':'403018103',
  'nicosia':'419086012',
  'nicotera':'418102025',
  'niella belbo':'401004150',
  'niella tanaro':'401004151',
  'nimis':'406030065',
  'niscemi':'419085013',
  'nissoria':'419086013',
  'nizza di sicilia':'419083061',
  'nizza monferrato':'401005080',
  'noale':'405027026',
  'noasca':'401001165',
  'nocara':'418078086',
  'nocciano':'413068026',
  'nocera inferiore':'415065078',
  'nocera superiore':'415065079',
  'nocera terinese':'418079087',
  'nocera umbra':'410054034',
  'noceto':'408034025',
  'noci':'416072031',
  'nociglia':'416075054',
  'noepoli':'417076055',
  'nogara':'405023053',
  'nogaredo':'404022127',
  'nogarole rocca':'405023054',
  'nogarole vicentino':'405024072',
  'noicattaro':'416072032',
  'nola':'415063050',
  'nole':'401001166',
  'noli':'407009042',
  'nomaglio':'401001167',
  'nomi':'404022128',
  'nonantola':'408036027',
  'none':'401001168',
  'nonio':'401103048',
  'noragugume':'420091050',
  'norbello':'420095033',
  'norcia':'410054035',
  'norma':'412059016',
  'nosate':'403015155',
  'notaresco':'413067032',
  'noto':'419089013',
  'nova levante':'404021058',
  'nova milanese':'403108035',
  'nova ponente':'404021059',
  'nova siri':'417077018',
  'novafeltria':'408099023',
  'novaledo':'404022129',
  'novalesa':'401001169',
  'novara':'401003106',
  'novara di sicilia':'419083062',
  'novate mezzola':'403014046',
  'novate milanese':'403015157',
  'nove':'405024073',
  'novedrate':'403013163',
  'novella':'404022253',
  'novellara':'408035028',
  'novello':'401004152',
  'noventa di piave':'405027027',
  'noventa padovana':'405028058',
  'noventa vicentina':'405024074',
  'novi di modena':'408036028',
  'novi ligure':'401006114',
  'novi velia':'415065080',
  'noviglio':'403015158',
  'novoli':'416075055',
  'nucetto':'401004153',
  'nughedu di san nicolo':'420090044',
  'nughedu santa vittoria':'420095034',
  'nule':'420090045',
  'nulvi':'420090046',
  'numana':'411042032',
  'nuoro':'420091051',
  'nurachi':'420095035',
  'nuragus':'420091052',
  'nurallao':'420091053',
  'nuraminis':'420092042',
  'nureci':'420095036',
  'nurri':'420092117',
  'nus':'402007045',
  'nusco':'415064066',
  'nuvolento':'403017119',
  'nuvolera':'403017120',
  'nuxis':'420092043',
  'occhieppo inferiore':'401096040',
  'occhieppo superiore':'401096041',
  'occhiobello':'405029033',
  'occimiano':'401006115',
  'ocre':'413066059',
  'odalengo grande':'401006116',
  'odalengo piccolo':'401006117',
  'oderzo':'405026051',
  'odolo':'403017121',
  'ofena':'413066060',
  'offagna':'411042033',
  'offanengo':'403019062',
  'offida':'411044054',
  'offlaga':'403017122',
  'oggebbio':'401103049',
  'oggiona con santo stefano':'403012107',
  'oggiono':'403097057',
  'oglianico':'401001170',
  'ogliastro cilento':'415065081',
  'olbia':'420090047',
  'olcenengo':'401002088',
  'oldenico':'401002089',
  'oleggio':'401003108',
  'oleggio castello':'401003109',
  'olevano di lomellina':'403018104',
  'olevano romano':'412058073',
  'olevano sul tusciano':'415065082',
  'olgiate comasco':'403013165',
  'olgiate molgora':'403097058',
  'olgiate olona':'403012108',
  'olginate':'403097059',
  'oliena':'420091055',
  'oliva gessi':'403018105',
  'olivadi':'418079088',
  'oliveri':'419083063',
  'oliveto citra':'415065083',
  'oliveto lario':'403097060',
  'oliveto lucano':'417077019',
  'olivetta san michele':'407008038',
  'olivola':'401006118',
  'ollastra simaxis':'420095037',
  'ollolai':'420091056',
  'ollomont':'402007046',
  'olmedo':'420090048',
  'olmeneta':'403019063',
  'olmo al brembo':'403016145',
  'olmo gentile':'401005081',
  'oltre il colle':'403016146',
  'oltressenda alta':'403016147',
  'oltrona di san mamette':'403013169',
  'olzai':'420091057',
  'ome':'403017123',
  'omegna':'401103050',
  'omignano':'415065084',
  'onani':'420091058',
  'onano':'412056040',
  'oncino':'401004154',
  'oneta':'403016148',
  'onifai':'420091059',
  'oniferi':'420091060',
  'ono san pietro':'403017124',
  'onore':'403016149',
  'onzo':'407009043',
  'opera':'403015159',
  'opi':'413066061',
  'oppeano':'405023055',
  'oppido lucano':'417076056',
  'oppido mamertina':'418080055',
  'ora':'404021060',
  'orani':'420091061',
  'oratino':'414070049',
  'orbassano':'401001171',
  'orbetello':'409053018',
  'orciano pisano':'409050023',
  'orco feglino':'407009044',
  'ordona':'416071063',
  'orero':'407010042',
  'orgiano':'405024075',
  'orgosolo':'420091062',
  'oria':'416074011',
  'oricola':'413066062',
  'origgio':'403012109',
  'orino':'403012110',
  'orio al serio':'403016150',
  'orio canavese':'401001172',
  'orio litta':'403098042',
  'oriolo':'418078087',
  'oriolo romano':'412056041',
  'oristano':'420095038',
  'ormea':'401004155',
  'ormelle':'405026052',
  'ornago':'403108036',
  'ornavasso':'401103051',
  'ornica':'403016151',
  'orosei':'420091063',
  'orotelli':'420091064',
  'orria':'415065085',
  'orroli':'420092118',
  'orsago':'405026053',
  'orsara bormida':'401006119',
  'orsara di puglia':'416071035',
  'orsenigo':'403013170',
  'orsogna':'413069057',
  'orsomarso':'418078088',
  'orta di atella':'415061053',
  'orta nova':'416071036',
  'orta san giulio':'401003112',
  'ortacesus':'420092044',
  'orte':'412056042',
  'ortelle':'416075056',
  'ortezzano':'411109029',
  'ortignano raggiolo':'409051027',
  'ortisei':'404021061',
  'ortona':'413069058',
  'ortona dei marsi':'413066063',
  'ortovero':'407009045',
  'ortucchio':'413066064',
  'ortueri':'420091066',
  'orune':'420091067',
  'orvieto':'410055023',
  'orvinio':'412057047',
  'orzinuovi':'403017125',
  'orzivecchi':'403017126',
  'osasco':'401001173',
  'osasio':'401001174',
  'oschiri':'420090049',
  'osidda':'420091068',
  'osiglia':'407009046',
  'osilo':'420090050',
  'osimo':'411042034',
  'osini':'420091069',
  'osio sopra':'403016152',
  'osio sotto':'403016153',
  'osnago':'403097061',
  'osoppo':'406030066',
  'ospedaletti':'407008039',
  'ospedaletto':'404022130',
  'ospedaletto d alpinolo':'415064067',
  'ospedaletto euganeo':'405028059',
  'ospedaletto lodigiano':'403098043',
  'ospitale di cadore':'405025035',
  'ospitaletto bresciano':'403017127',
  'ossago lodigiano':'403098044',
  'ossana':'404022131',
  'ossi':'420090051',
  'ossimo':'403017128',
  'ossona':'403015164',
  'ostana':'401004156',
  'ostellato':'408038017',
  'ostiano':'403019064',
  'ostiglia':'403020038',
  'ostra':'411042035',
  'ostra vetere':'411042036',
  'ostuni':'416074012',
  'otranto':'416075057',
  'otricoli':'410055024',
  'ottana':'420091070',
  'ottati':'415065086',
  'ottaviano':'415063051',
  'ottiglio':'401006120',
  'ottobiano':'403018106',
  'ottone':'408033030',
  'oulx':'401001175',
  'ovada':'401006121',
  'ovaro':'406030067',
  'oviglio':'401006122',
  'ovindoli':'413066065',
  'ovodda':'420091071',
  'oyace':'402007047',
  'ozegna':'401001176',
  'ozieri':'420090052',
  'ozzano dell emilia':'408037046',
  'ozzano monferrato':'401006123',
  'ozzero':'403015165',
  'pabillonis':'420092045',
  'pace del mela':'419083064',
  'paceco':'419081013',
  'pacentro':'413066066',
  'pachino':'419089014',
  'paciano':'410054036',
  'padenghe sul garda':'403017129',
  'paderna':'401006124',
  'paderno d adda':'403097062',
  'paderno dugnano':'403015166',
  'paderno franciacorta':'403017130',
  'paderno ponchielli':'403019065',
  'padova':'405028060',
  'padria':'420090053',
  'padru':'420090090',
  'padula':'415065087',
  'paduli':'415062045',
  'paesana':'401004157',
  'paese':'405026055',
  'pagani':'415065088',
  'paganico sabino':'412057048',
  'pagazzano':'403016154',
  'pagliara':'419083065',
  'paglieta':'413069059',
  'pagnacco':'406030068',
  'pagno':'401004158',
  'pagnona':'403097063',
  'pago del vallo di lauro':'415064068',
  'pago veiano':'415062046',
  'paisco loveno':'403017131',
  'paitone':'403017132',
  'paladina':'403016155',
  'palagano':'408036029',
  'palagianello':'416073020',
  'palagiano':'416073021',
  'palagonia':'419087032',
  'palaia':'409050024',
  'palanzano':'408034026',
  'palata':'414070050',
  'palau':'420090054',
  'palazzago':'403016156',
  'palazzo adriano':'419082052',
  'palazzo canavese':'401001177',
  'palazzo pignano':'403019066',
  'palazzo san gervasio':'417076057',
  'palazzolo acreide':'419089015',
  'palazzolo dello stella':'406030069',
  'palazzolo sull oglio':'403017133',
  'palazzolo vercellese':'401002090',
  'palazzuolo sul senio':'409048031',
  'palena':'413069060',
  'palermiti':'418079089',
  'palermo':'419082053',
  'palestrina':'412058074',
  'palestro':'403018107',
  'paliano':'412060046',
  'palizzi':'418080056',
  'pallagorio':'418101016',
  'pallanzeno':'401103052',
  'pallare':'407009047',
  'palma campania':'415063052',
  'palma di montechiaro':'419084027',
  'palmanova':'406030070',
  'palmariggi':'416075058',
  'palmas arborea':'420095039',
  'palmi':'418080057',
  'palmiano':'411044056',
  'palmoli':'413069061',
  'palo del colle':'416072033',
  'palombara sabina':'412058075',
  'palombaro':'413069062',
  'palomonte':'415065089',
  'palosco':'403016157',
  'palu':'405023056',
  'palu del fersina':'404022133',
  'paludi':'418078089',
  'paluzza':'406030071',
  'pamparato':'401004159',
  'pancalieri':'401001178',
  'pancarana':'403018108',
  'panchia':'404022134',
  'pandino':'403019067',
  'panettieri':'418078090',
  'panicale':'410054037',
  'pannarano':'415062047',
  'panni':'416071037',
  'pantelleria':'419081014',
  'pantigliate':'403015167',
  'paola':'418078091',
  'paolisi':'415062048',
  'papasidero':'418078092',
  'papozze':'405029034',
  'parabiago':'403015168',
  'parabita':'416075059',
  'paratico':'403017134',
  'parcines':'404021062',
  'parella':'401001179',
  'parenti':'418078093',
  'parete':'415061054',
  'pareto':'401006125',
  'parghelia':'418102026',
  'parlasco':'403097064',
  'parma':'408034027',
  'parodi ligure':'401006126',
  'paroldo':'401004160',
  'parolise':'415064069',
  'parona':'403018109',
  'parrano':'410055025',
  'parre':'403016158',
  'partanna':'419081015',
  'partinico':'419082054',
  'paruzzaro':'401003114',
  'parzanica':'403016159',
  'pasian di prato':'406030072',
  'pasiano di pordenone':'406093029',
  'paspardo':'403017135',
  'passerano marmorito':'401005082',
  'passignano sul trasimeno':'410054038',
  'passirano':'403017136',
  'pastena':'412060047',
  'pastorano':'415061055',
  'pastrengo':'405023057',
  'pasturana':'401006127',
  'pasturo':'403097065',
  'paterno':'417076100',
  'paterno':'419087033',
  'paterno calabro':'418078094',
  'paternopoli':'415064070',
  'patrica':'412060048',
  'pattada':'420090055',
  'patti':'419083066',
  'patu':'416075060',
  'pau':'420095040',
  'paularo':'406030073',
  'pauli arbarei':'420092046',
  'paulilatino':'420095041',
  'paullo':'403015169',
  'paupisi':'415062049',
  'pavarolo':'401001180',
  'pavia':'403018110',
  'pavia di udine':'406030074',
  'pavone canavese':'401001181',
  'pavone del mella':'403017137',
  'pavullo nel frignano':'408036030',
  'pazzano':'418080058',
  'peccioli':'409050025',
  'pecetto di valenza':'401006128',
  'pecetto torinese':'401001183',
  'pedara':'419087034',
  'pedaso':'411109030',
  'pedavena':'405025036',
  'pedemonte':'405024076',
  'pederobba':'405026056',
  'pedesina':'403014047',
  'pedivigliano':'418078096',
  'pedrengo':'403016160',
  'peglio':'411141041',
  'pegognaga':'403020039',
  'peia':'403016161',
  'peio':'404022136',
  'pelago':'409048032',
  'pella':'401003115',
  'pellegrino parmense':'408034028',
  'pellezzano':'415065090',
  'pellizzano':'404022137',
  'pelugo':'404022138',
  'penango':'401005083',
  'penna in teverina':'410055026',
  'penna san giovanni':'411043035',
  'penna sant andrea':'413067033',
  'pennabilli':'408099024',
  'pennadomo':'413069063',
  'pennapiedimonte':'413069064',
  'penne':'413068027',
  'pentone':'418079092',
  'perano':'413069065',
  'perarolo di cadore':'405025037',
  'perca':'404021063',
  'percile':'412058076',
  'perdasdefogu':'420091072',
  'perdaxius':'420092047',
  'perdifumo':'415065091',
  'pereto':'413066067',
  'perfugas':'420090056',
  'pergine valsugana':'404022139',
  'pergola':'411141043',
  'perinaldo':'407008040',
  'perito':'415065092',
  'perledo':'403097067',
  'perletto':'401004161',
  'perlo':'401004162',
  'perloz':'402007048',
  'pernumia':'405028061',
  'pero':'403015170',
  'perosa argentina':'401001184',
  'perosa canavese':'401001185',
  'perrero':'401001186',
  'persico dosimo':'403019068',
  'pertengo':'401002091',
  'pertica alta':'403017139',
  'pertica bassa':'403017140',
  'pertosa':'415065093',
  'pertusio':'401001187',
  'perugia':'410054039',
  'pesaro':'411141044',
  'pescaglia':'409046022',
  'pescantina':'405023058',
  'pescara':'413068028',
  'pescarolo ed uniti':'403019069',
  'pescasseroli':'413066068',
  'pescate':'403097068',
  'pesche':'414094031',
  'peschici':'416071038',
  'peschiera borromeo':'403015171',
  'peschiera del garda':'405023059',
  'pescia':'409047012',
  'pescina':'413066069',
  'pesco sannita':'415062050',
  'pescocostanzo':'413066070',
  'pescolanciano':'414094032',
  'pescopagano':'417076058',
  'pescopennataro':'414094033',
  'pescorocchiano':'412057049',
  'pescosansonesco':'413068029',
  'pescosolido':'412060049',
  'pessano con bornago':'403015172',
  'pessina cremonese':'403019070',
  'pessinetto':'401001188',
  'petacciato':'414070051',
  'petilia policastro':'418101017',
  'petina':'415065094',
  'petralia soprana':'419082055',
  'petralia sottana':'419082056',
  'petrella salto':'412057050',
  'petrella tifernina':'414070052',
  'petriano':'411141045',
  'petriolo':'411043036',
  'petritoli':'411109031',
  'petrizzi':'418079094',
  'petrona':'418079095',
  'petrosino':'419081024',
  'petruro irpino':'415064071',
  'pettenasco':'401003116',
  'pettinengo':'401096042',
  'pettineo':'419083067',
  'pettoranello del molise':'414094034',
  'pettorano sul gizio':'413066071',
  'pettorazza grimani':'405029035',
  'peveragno':'401004163',
  'pezzana':'401002093',
  'pezzaze':'403017141',
  'pezzolo valle uzzone':'401004164',
  'piacenza':'408033032',
  'piacenza d adige':'405028062',
  'piadena drizzona':'403019116',
  'piaggine':'415065095',
  'pian camuno':'403017142',
  'piana crixia':'407009048',
  'piana degli albanesi':'419082057',
  'piana di monte verna':'415061056',
  'piancastagnaio':'409052020',
  'piancogno':'403017206',
  'piandimeleto':'411141047',
  'piane crati':'418078097',
  'pianella':'413068030',
  'pianello del lario':'403013183',
  'pianello val tidone':'408033033',
  'pianengo':'403019072',
  'pianezza':'401001189',
  'pianezze':'405024077',
  'pianfei':'401004165',
  'pianico':'403016162',
  'pianiga':'405027028',
  'piano di sorrento':'415063053',
  'pianopoli':'418079096',
  'pianoro':'408037047',
  'piansano':'412056043',
  'piantedo':'403014048',
  'piario':'403016163',
  'piasco':'401004166',
  'piateda':'403014049',
  'piatto':'401096043',
  'piazza al serchio':'409046023',
  'piazza armerina':'419086014',
  'piazza brembana':'403016164',
  'piazzatorre':'403016165',
  'piazzola sul brenta':'405028063',
  'piazzolo':'403016166',
  'picciano':'413068031',
  'picerno':'417076059',
  'picinisco':'412060050',
  'pico':'412060051',
  'piea':'401005084',
  'piedicavallo':'401096044',
  'piedimonte etneo':'419087035',
  'piedimonte matese':'415061057',
  'piedimonte san germano':'412060052',
  'piedimulera':'401103053',
  'piegaro':'410054040',
  'pienza':'409052021',
  'pieranica':'403019073',
  'pietra de giorgi':'403018111',
  'pietra ligure':'407009049',
  'pietra marazzi':'401006129',
  'pietrabbondante':'414094035',
  'pietrabruna':'407008041',
  'pietracamela':'413067034',
  'pietracatella':'414070053',
  'pietracupa':'414070054',
  'pietradefusi':'415064072',
  'pietraferrazzana':'413069103',
  'pietrafitta':'418078098',
  'pietragalla':'417076060',
  'pietralunga':'410054041',
  'pietramelara':'415061058',
  'pietramontecorvino':'416071039',
  'pietranico':'413068032',
  'pietrapaola':'418078099',
  'pietrapertosa':'417076061',
  'pietraperzia':'419086015',
  'pietraporzio':'401004167',
  'pietraroia':'415062051',
  'pietrarubbia':'411141048',
  'pietrasanta':'409046024',
  'pietrastornina':'415064073',
  'pietravairano':'415061059',
  'pietrelcina':'415062052',
  'pieve a nievole':'409047013',
  'pieve albignola':'403018112',
  'pieve del cairo':'403018113',
  'pieve del grappa':'405026096',
  'pieve di bono-prezzo':'404022234',
  'pieve di cadore':'405025039',
  'pieve di cento':'408037048',
  'pieve di soligo':'405026057',
  'pieve di teco':'407008042',
  'pieve d olmi':'403019074',
  'pieve emanuele':'403015173',
  'pieve fissiraga':'403098045',
  'pieve fosciana':'409046025',
  'pieve ligure':'407010043',
  'pieve porto morone':'403018114',
  'pieve san giacomo':'403019075',
  'pieve santo stefano':'409051030',
  'pieve tesino':'404022142',
  'pieve torina':'411043038',
  'pieve vergonte':'401103054',
  'pievepelago':'408036031',
  'piglio':'412060053',
  'pigna':'407008043',
  'pignataro interamna':'412060054',
  'pignataro maggiore':'415061060',
  'pignola':'417076062',
  'pignone':'407011021',
  'pigra':'403013184',
  'pila':'401002096',
  'pimentel':'420092048',
  'pimonte':'415063054',
  'pinarolo po':'403018115',
  'pinasca':'401001190',
  'pincara':'405029036',
  'pinerolo':'401001191',
  'pineto':'413067035',
  'pino d asti':'401005085',
  'pino torinese':'401001192',
  'pinzano al tagliamento':'406093030',
  'pinzolo':'404022143',
  'piobbico':'411141049',
  'piobesi d alba':'401004168',
  'piobesi torinese':'401001193',
  'piode':'401002097',
  'pioltello':'403015175',
  'piombino':'409049012',
  'piombino dese':'405028064',
  'pioraco':'411043039',
  'piossasco':'401001194',
  'piova massaia':'401005086',
  'piove di sacco':'405028065',
  'piovene rocchette':'405024078',
  'piozzano':'408033034',
  'piozzo':'401004169',
  'piraino':'419083068',
  'pisa':'409050026',
  'pisano':'401003119',
  'piscina':'401001195',
  'piscinas':'420092107',
  'pisciotta':'415065096',
  'pisogne':'403017143',
  'pisoniano':'412058077',
  'pisticci':'417077020',
  'pistoia':'409047014',
  'pitigliano':'409053019',
  'piubega':'403020041',
  'piuro':'403014050',
  'piverone':'401001196',
  'pizzale':'403018116',
  'pizzighettone':'403019076',
  'pizzo':'418102027',
  'pizzoferrato':'413069066',
  'pizzoli':'413066072',
  'pizzone':'414094036',
  'pizzoni':'418102028',
  'placanica':'418080059',
  'plataci':'418078100',
  'platania':'418079099',
  'plati':'418080060',
  'plaus':'404021064',
  'plesio':'403013185',
  'ploaghe':'420090057',
  'plodio':'407009050',
  'pocapaglia':'401004170',
  'pocenia':'406030075',
  'podenzana':'409045013',
  'podenzano':'408033035',
  'pofi':'412060055',
  'poggiardo':'416075061',
  'poggibonsi':'409052022',
  'poggio a caiano':'409100004',
  'poggio bustone':'412057051',
  'poggio catino':'412057052',
  'poggio imperiale':'416071040',
  'poggio mirteto':'412057053',
  'poggio moiano':'412057054',
  'poggio nativo':'412057055',
  'poggio picenze':'413066073',
  'poggio renatico':'408038018',
  'poggio rusco':'403020042',
  'poggio san lorenzo':'412057056',
  'poggio san marcello':'411042037',
  'poggio san vicino':'411043040',
  'poggio sannita':'414094037',
  'poggio torriana':'408099028',
  'poggiodomo':'410054042',
  'poggiofiorito':'413069067',
  'poggiomarino':'415063055',
  'poggioreale':'419081016',
  'poggiorsini':'416072034',
  'poggiridenti':'403014051',
  'pogliano milanese':'403015176',
  'pognana lario':'403013186',
  'pognano':'403016167',
  'pogno':'401003120',
  'poirino':'401001197',
  'pojana maggiore':'405024079',
  'polaveno':'403017144',
  'polcenigo':'406093031',
  'polesella':'405029037',
  'polesine zibello':'408034050',
  'poli':'412058078',
  'polia':'418102029',
  'policoro':'417077021',
  'polignano a mare':'416072035',
  'polinago':'408036032',
  'polino':'410055027',
  'polistena':'418080061',
  'polizzi generosa':'419082058',
  'polla':'415065097',
  'pollein':'402007049',
  'pollena trocchia':'415063056',
  'pollenza':'411043041',
  'pollica':'415065098',
  'pollina':'419082059',
  'pollone':'401096046',
  'pollutri':'413069068',
  'polonghera':'401004171',
  'polpenazze':'403017145',
  'polverara':'405028066',
  'polverigi':'411042038',
  'pomarance':'409050027',
  'pomaretto':'401001198',
  'pomarico':'417077022',
  'pomaro monferrato':'401006131',
  'pomarolo':'404022144',
  'pombia':'401003121',
  'pomezia':'412058079',
  'pomigliano d arco':'415063057',
  'pompei':'415063058',
  'pompeiana':'407008044',
  'pompiano':'403017146',
  'pomponesco':'403020043',
  'pompu':'420095042',
  'poncarale':'403017147',
  'ponderano':'401096047',
  'ponna':'403013187',
  'ponsacco':'409050028',
  'ponso':'405028067',
  'pont canavese':'401001199',
  'pontassieve':'409048033',
  'pontboset':'402007050',
  'ponte':'415062053',
  'ponte buggianese':'409047016',
  'ponte dell olio':'408033036',
  'ponte di legno':'403017148',
  'ponte di piave':'405026058',
  'ponte gardena':'404021065',
  'ponte in valtellina':'403014052',
  'ponte lambro':'403013188',
  'ponte nelle alpi':'405025040',
  'ponte nizza':'403018117',
  'ponte nossa':'403016168',
  'ponte san nicolo':'405028069',
  'ponte san pietro':'403016170',
  'pontebba':'406030076',
  'pontecagnano faiano':'415065099',
  'pontecchio polesine':'405029038',
  'pontechianale':'401004172',
  'pontecorvo':'412060056',
  'pontecurone':'401006132',
  'pontedassio':'407008045',
  'pontedera':'409050029',
  'pontelandolfo':'415062054',
  'pontelatone':'415061061',
  'pontelongo':'405028068',
  'pontenure':'408033037',
  'ponteranica':'403016169',
  'pontestura':'401006133',
  'pontevico':'403017149',
  'pontey':'402007051',
  'ponti':'401006134',
  'ponti sul mincio':'403020044',
  'pontida':'403016171',
  'pontinia':'412059017',
  'pontinvrea':'407009051',
  'pontirolo nuovo':'403016172',
  'pontoglio':'403017150',
  'pontremoli':'409045014',
  'pont-saint-martin':'402007052',
  'ponza':'412059018',
  'ponzano di fermo':'411109032',
  'ponzano monferrato':'401006135',
  'ponzano romano':'412058080',
  'ponzano veneto':'405026059',
  'ponzone':'401006136',
  'popoli terme':'413068933',
  'poppi':'409051031',
  'porano':'410055028',
  'porcari':'409046026',
  'porcia':'406093032',
  'pordenone':'406093033',
  'porlezza':'403013189',
  'pornassio':'407008046',
  'porpetto':'406030077',
  'portacomaro':'401005087',
  'portalbera':'403018118',
  'porte':'401001200',
  'porte di rendena':'404022244',
  'portici':'415063059',
  'portico di caserta':'415061062',
  'portico e san benedetto':'408140031',
  'portigliola':'418080062',
  'porto azzurro':'409049013',
  'porto ceresio':'403012113',
  'porto cesareo':'416075097',
  'porto empedocle':'419084028',
  'porto mantovano':'403020045',
  'porto recanati':'411043042',
  'porto san giorgio':'411109033',
  'porto sant elpidio':'411109034',
  'porto tolle':'405029039',
  'porto torres':'420090058',
  'porto valtravaglia':'403012114',
  'porto viro':'405029052',
  'portobuffole':'405026060',
  'portocannone':'414070055',
  'portoferraio':'409049014',
  'portofino':'407010044',
  'portogruaro':'405027029',
  'portomaggiore':'408038019',
  'portopalo di capo passero':'419089020',
  'portoscuso':'420092049',
  'portovenere':'407011022',
  'portula':'401096048',
  'posada':'420091073',
  'posina':'405024080',
  'positano':'415065100',
  'possagno':'405026061',
  'posta':'412057057',
  'posta fibreno':'412060057',
  'postal':'404021066',
  'postalesio':'403014053',
  'postiglione':'415065101',
  'postua':'401002102',
  'potenza':'417076063',
  'potenza picena':'411043043',
  'pove del grappa':'405024081',
  'povegliano':'405026062',
  'povegliano veronese':'405023060',
  'poviglio':'408035029',
  'povoletto':'406030078',
  'pozzaglia sabino':'412057058',
  'pozzaglio ed uniti':'403019077',
  'pozzallo':'419088008',
  'pozzilli':'414094038',
  'pozzo d adda':'403015177',
  'pozzol groppo':'401006137',
  'pozzolengo':'403017151',
  'pozzoleone':'405024082',
  'pozzolo formigaro':'401006138',
  'pozzomaggiore':'420090059',
  'pozzonovo':'405028070',
  'pozzuoli':'415063060',
  'pozzuolo del friuli':'406030079',
  'pozzuolo martesana':'403015178',
  'pradalunga':'403016173',
  'pradamano':'406030080',
  'pradleves':'401004173',
  'pragelato':'401001201',
  'praia a mare':'418078101',
  'praiano':'415065102',
  'pralboino':'403017152',
  'prali':'401001202',
  'pralormo':'401001203',
  'pralungo':'401096049',
  'pramaggiore':'405027030',
  'pramollo':'401001204',
  'prarolo':'401002104',
  'prarostino':'401001205',
  'prasco':'401006139',
  'prascorsano':'401001206',
  'prata camportaccio':'403014054',
  'prata d ansidonia':'413066074',
  'prata di pordenone':'406093034',
  'prata di principato ultra':'415064074',
  'prata sannita':'415061063',
  'pratella':'415061064',
  'pratiglione':'401001207',
  'prato':'409100005',
  'prato allo stelvio':'404021067',
  'prato carnico':'406030081',
  'prato sesia':'401003122',
  'pratola peligna':'413066075',
  'pratola serra':'415064075',
  'pratovecchio stia':'409051041',
  'pravisdomini':'406093035',
  'pray':'401096050',
  'prazzo':'401004174',
  'precenicco':'406030082',
  'preci':'410054043',
  'predaia':'404022230',
  'predappio':'408140032',
  'predazzo':'404022147',
  'predoi':'404021068',
  'predore':'403016174',
  'predosa':'401006140',
  'preganziol':'405026063',
  'pregnana milanese':'403015179',
  'prela':'407008047',
  'premana':'403097069',
  'premariacco':'406030083',
  'premeno':'401103055',
  'premia':'401103056',
  'premilcuore':'408140033',
  'premolo':'403016175',
  'premosello-chiovenda':'401103057',
  'preone':'406030084',
  'prepotto':'406030085',
  'pre -saint-didier':'402007053',
  'preseglie':'403017153',
  'presenzano':'415061065',
  'presezzo':'403016176',
  'presicce-acquarica':'416075098',
  'pressana':'405023061',
  'pretoro':'413069069',
  'prevalle':'403017155',
  'prezza':'413066076',
  'priero':'401004175',
  'prignano cilento':'415065103',
  'prignano sulla secchia':'408036033',
  'primaluna':'403097070',
  'primiero san martino di castrozza':'404022245',
  'priocca':'401004176',
  'priola':'401004177',
  'priolo gargallo':'419089021',
  'priverno':'412059019',
  'prizzi':'419082060',
  'proceno':'412056044',
  'procida':'415063061',
  'propata':'407010045',
  'proserpio':'403013192',
  'prossedi':'412059020',
  'provaglio d iseo':'403017156',
  'provaglio val sabbia':'403017157',
  'proves':'404021069',
  'provvidenti':'414070056',
  'prunetto':'401004178',
  'puegnago sul garda':'403017158',
  'puglianello':'415062055',
  'pula':'420092050',
  'pulfero':'406030086',
  'pulsano':'416073022',
  'pumenengo':'403016177',
  'pusiano':'403013193',
  'putifigari':'420090060',
  'putignano':'416072036',
  'quadrelle':'415064076',
  'quadri':'413069070',
  'quagliuzzo':'401001208',
  'qualiano':'415063062',
  'quaranti':'401005088',
  'quaregna cerreto':'401096087',
  'quargnento':'401006141',
  'quarna sopra':'401103058',
  'quarna sotto':'401103059',
  'quarona':'401002107',
  'quarrata':'409047017',
  'quart':'402007054',
  'quarto':'415063063',
  'quarto d altino':'405027031',
  'quartu sant elena':'420092051',
  'quartucciu':'420092105',
  'quassolo':'401001209',
  'quattordio':'401006142',
  'quattro castella':'408035030',
  'quiliano':'407009052',
  'quincinetto':'401001210',
  'quindici':'415064077',
  'quingentole':'403020046',
  'quintano':'403019078',
  'quinto di treviso':'405026064',
  'quinto vercellese':'401002108',
  'quinto vicentino':'405024083',
  'quinzano d oglio':'403017159',
  'quistello':'403020047',
  'rabbi':'404022150',
  'racale':'416075063',
  'racalmuto':'419084029',
  'racconigi':'401004179',
  'raccuja':'419083069',
  'racines':'404021070',
  'radda in chianti':'409052023',
  'raddusa':'419087036',
  'radicofani':'409052024',
  'radicondoli':'409052025',
  'raffadali':'419084030',
  'ragalna':'419087058',
  'ragogna':'406030087',
  'ragusa':'419088009',
  'raiano':'413066077',
  'ramacca':'419087037',
  'rancio valcuvia':'403012115',
  'ranco':'403012116',
  'randazzo':'419087038',
  'ranica':'403016178',
  'ranzanico':'403016179',
  'ranzo':'407008048',
  'rapagnano':'411109035',
  'rapallo':'407010046',
  'rapino':'413069071',
  'rapolano terme':'409052026',
  'rapolla':'417076064',
  'rapone':'417076065',
  'rassa':'401002110',
  'rasun anterselva':'404021071',
  'rasura':'403014055',
  'ravanusa':'419084031',
  'ravarino':'408036034',
  'ravascletto':'406030088',
  'ravello':'415065104',
  'ravenna':'408039014',
  'raveo':'406030089',
  'raviscanina':'415061066',
  're':'401103060',
  'rea':'403018119',
  'realmonte':'419084032',
  'reana del rojale':'406030090',
  'reano':'401001211',
  'recale':'415061067',
  'recanati':'411043044',
  'recco':'407010047',
  'recetto':'401003129',
  'recoaro terme':'405024084',
  'redavalle':'403018120',
  'redondesco':'403020048',
  'refrancore':'401005089',
  'refrontolo':'405026065',
  'regalbuto':'419086016',
  'reggello':'409048035',
  'reggio calabria':'418080063',
  'reggio emilia':'408035033',
  'reggiolo':'408035032',
  'reino':'415062056',
  'reitano':'419083070',
  'remanzacco':'406030091',
  'remedello':'403017160',
  'renate':'403108037',
  'rende':'418078102',
  'renon':'404021072',
  'resana':'405026066',
  'rescaldina':'403015181',
  'resia':'406030092',
  'resiutta':'406030093',
  'resuttano':'419085014',
  'retorbido':'403018121',
  'revello':'401004180',
  'revigliasco d asti':'401005090',
  'revine lago':'405026067',
  'rezzago':'403013195',
  'rezzato':'403017161',
  'rezzo':'407008049',
  'rezzoaglio':'407010048',
  'rhemes-notre-dame':'402007055',
  'rhemes-saint-georges':'402007056',
  'rho':'403015182',
  'riace':'418080064',
  'rialto':'407009053',
  'riano':'412058081',
  'riardo':'415061068',
  'ribera':'419084033',
  'ribordone':'401001212',
  'ricadi':'418102030',
  'ricaldone':'401006143',
  'riccia':'414070057',
  'riccione':'408099013',
  'ricco del golfo di spezia':'407011023',
  'ricengo':'403019079',
  'ricigliano':'415065105',
  'riese pio x':'405026068',
  'riesi':'419085015',
  'rieti':'412057059',
  'rifiano':'404021073',
  'rifreddo':'401004181',
  'rignano flaminio':'412058082',
  'rignano garganico':'416071041',
  'rignano sull arno':'409048036',
  'rigolato':'406030094',
  'rimella':'401002113',
  'rimini':'408099014',
  'rio':'409049021',
  'rio di pusteria':'404021074',
  'rio saliceto':'408035034',
  'riofreddo':'412058083',
  'riola sardo':'420095043',
  'riolo terme':'408039015',
  'riolunato':'408036035',
  'riomaggiore':'407011024',
  'rionero in vulture':'417076066',
  'rionero sannitico':'414094039',
  'ripa teatina':'413069072',
  'ripabottoni':'414070058',
  'ripacandida':'417076067',
  'ripalimosani':'414070059',
  'ripalta arpina':'403019080',
  'ripalta cremasca':'403019081',
  'ripalta guerina':'403019082',
  'riparbella':'409050030',
  'ripatransone':'411044063',
  'ripe san ginesio':'411043045',
  'ripi':'412060058',
  'riposto':'419087039',
  'rittana':'401004182',
  'riva del garda':'404022153',
  'riva del po':'408038029',
  'riva di solto':'403016180',
  'riva ligure':'407008050',
  'riva presso chieri':'401001215',
  'rivalba':'401001213',
  'rivalta bormida':'401006144',
  'rivalta di torino':'401001214',
  'rivamonte agordino':'405025043',
  'rivanazzano terme':'403018999',
  'rivara':'401001216',
  'rivarolo canavese':'401001217',
  'rivarolo del re ed uniti':'403019083',
  'rivarolo mantovano':'403020050',
  'rivarone':'401006145',
  'rivarossa':'401001218',
  'rive':'401002115',
  'rive d arcano':'406030095',
  'rivello':'417076068',
  'rivergaro':'408033038',
  'rivignano teor':'406030188',
  'rivisondoli':'413066078',
  'rivodutri':'412057060',
  'rivoli':'401001219',
  'rivoli veronese':'405023062',
  'rivolta d adda':'403019084',
  'rizziconi':'418080065',
  'roana':'405024085',
  'roaschia':'401004183',
  'roascio':'401004184',
  'roasio':'401002116',
  'roatto':'401005091',
  'robassomero':'401001220',
  'robbiate':'403097071',
  'robbio':'403018123',
  'robecchetto con induno':'403015183',
  'robecco d oglio':'403019085',
  'robecco pavese':'403018124',
  'robecco sul naviglio':'403015184',
  'robella':'401005092',
  'robilante':'401004185',
  'roburent':'401004186',
  'rocca canavese':'401001221',
  'rocca canterano':'412058084',
  'rocca ciglie':'401004188',
  'rocca d arazzo':'401005093',
  'rocca d arce':'412060059',
  'rocca de baldi':'401004189',
  'rocca de giorgi':'403018125',
  'rocca d evandro':'415061069',
  'rocca di botte':'413066080',
  'rocca di cambio':'413066081',
  'rocca di cave':'412058085',
  'rocca di mezzo':'413066082',
  'rocca di neto':'418101019',
  'rocca di papa':'412058086',
  'rocca grimalda':'401006147',
  'rocca imperiale':'418078103',
  'rocca massima':'412059022',
  'rocca pia':'413066083',
  'rocca pietore':'405025044',
  'rocca priora':'412058088',
  'rocca san casciano':'408140036',
  'rocca san felice':'415064079',
  'rocca san giovanni':'413069074',
  'rocca santa maria':'413067036',
  'rocca santo stefano':'412058089',
  'rocca sinibalda':'412057062',
  'rocca susella':'403018126',
  'roccabascerana':'415064078',
  'roccabernarda':'418101018',
  'roccabianca':'408034030',
  'roccabruna':'401004187',
  'roccacasale':'413066079',
  'roccadaspide':'415065106',
  'roccafiorita':'419083071',
  'roccafluvione':'411044064',
  'roccaforte del greco':'418080066',
  'roccaforte ligure':'401006146',
  'roccaforte mondovi':'401004190',
  'roccaforzata':'416073023',
  'roccafranca':'403017162',
  'roccagiovine':'412058087',
  'roccagloriosa':'415065107',
  'roccagorga':'412059021',
  'roccalbegna':'409053020',
  'roccalumera':'419083072',
  'roccamandolfi':'414094040',
  'roccamena':'419082061',
  'roccamonfina':'415061070',
  'roccamontepiano':'413069073',
  'roccamorice':'413068034',
  'roccanova':'417076069',
  'roccantica':'412057061',
  'roccapalumba':'419082062',
  'roccapiemonte':'415065108',
  'roccarainola':'415063065',
  'roccaraso':'413066084',
  'roccaromana':'415061071',
  'roccascalegna':'413069075',
  'roccasecca':'412060060',
  'roccasecca dei volsci':'412059023',
  'roccasicura':'414094041',
  'roccasparvera':'401004191',
  'roccaspinalveti':'413069076',
  'roccastrada':'409053021',
  'roccavaldina':'419083073',
  'roccaverano':'401005094',
  'roccavignale':'407009054',
  'roccavione':'401004192',
  'roccavivara':'414070060',
  'roccella ionica':'418080067',
  'roccella valdemone':'419083074',
  'rocchetta a volturno':'414094042',
  'rocchetta belbo':'401004193',
  'rocchetta di vara':'407011025',
  'rocchetta e croce':'415061072',
  'rocchetta ligure':'401006148',
  'rocchetta nervina':'407008051',
  'rocchetta palafea':'401005095',
  'rocchetta sant antonio':'416071042',
  'rocchetta tanaro':'401005096',
  'rodano':'403015185',
  'roddi':'401004194',
  'roddino':'401004195',
  'rodello':'401004196',
  'rodengo':'404021075',
  'rodengo-saiano':'403017163',
  'rodero':'403013197',
  'rodi garganico':'416071043',
  'rodi milici':'419083075',
  'rodigo':'403020051',
  'roe volciano':'403017164',
  'rofrano':'415065109',
  'rogeno':'403097072',
  'roggiano gravina':'418078104',
  'roghudi':'418080068',
  'rogliano':'418078105',
  'rognano':'403018127',
  'rogno':'403016182',
  'rogolo':'403014056',
  'roiate':'412058090',
  'roio del sangro':'413069077',
  'roisan':'402007057',
  'roletto':'401001222',
  'rolo':'408035035',
  'roma':'412058091',
  'romagnano al monte':'415065110',
  'romagnano sesia':'401003130',
  'romagnese':'403018128',
  'romana':'420090061',
  'romanengo':'403019086',
  'romano canavese':'401001223',
  'romano d ezzelino':'405024086',
  'romano di lombardia':'403016183',
  'romans d isonzo':'406031015',
  'rombiolo':'418102031',
  'romeno':'404022155',
  'romentino':'401003131',
  'rometta':'419083076',
  'ronca':'405023063',
  'roncade':'405026069',
  'roncadelle':'403017165',
  'roncaro':'403018129',
  'roncegno':'404022156',
  'roncello':'403108055',
  'ronchi dei legionari':'406031016',
  'ronchi valsugana':'404022157',
  'ronchis':'406030097',
  'ronciglione':'412056045',
  'ronco all adige':'405023064',
  'ronco biellese':'401096053',
  'ronco briantino':'403108038',
  'ronco canavese':'401001224',
  'ronco scrivia':'407010049',
  'roncobello':'403016184',
  'roncoferraro':'403020052',
  'roncofreddo':'408140037',
  'roncola':'403016185',
  'rondanina':'407010050',
  'rondissone':'401001225',
  'ronsecco':'401002118',
  'ronzo-chienis':'404022135',
  'ronzone':'404022159',
  'roppolo':'401096054',
  'rora':'401001226',
  'roreto chisone':'401001227',
  'rosa':'405024087',
  'rosarno':'418080069',
  'rosasco':'403018130',
  'rosate':'403015188',
  'rosazza':'401096055',
  'rosciano':'413068035',
  'roscigno':'415065111',
  'rose':'418078106',
  'rosello':'413069078',
  'roseto capo spulico':'418078107',
  'roseto degli abruzzi':'413067037',
  'roseto valfortore':'416071044',
  'rosignano marittimo':'409049017',
  'rosignano monferrato':'401006149',
  'rosolina':'405029040',
  'rosolini':'419089016',
  'rosora':'411042040',
  'rossa':'401002121',
  'rossana':'401004197',
  'rossano veneto':'405024088',
  'rossiglione':'407010051',
  'rosta':'401001228',
  'rota d imagna':'403016186',
  'rota greca':'418078109',
  'rotella':'411044065',
  'rotello':'414070061',
  'rotonda':'417076070',
  'rotondella':'417077023',
  'rotondi':'415064080',
  'rottofreno':'408033039',
  'rotzo':'405024089',
  'roure':'401001571',
  'rovasenda':'401002122',
  'rovato':'403017166',
  'rovegno':'407010052',
  'rovellasca':'403013201',
  'rovello porro':'403013202',
  'roverbella':'403020053',
  'roverchiara':'405023065',
  'rovere della luna':'404022160',
  'rovere veronese':'405023067',
  'roveredo di gua':'405023066',
  'roveredo in piano':'406093036',
  'rovereto':'404022161',
  'rovescala':'403018131',
  'rovetta':'403016187',
  'roviano':'412058092',
  'rovigo':'405029041',
  'rovito':'418078110',
  'rovolon':'405028071',
  'rozzano':'403015189',
  'rubano':'405028072',
  'rubiana':'401001229',
  'rubiera':'408035036',
  'ruda':'406030098',
  'rudiano':'403017167',
  'rueglio':'401001230',
  'ruffano':'416075064',
  'ruffia':'401004198',
  'ruffre -mendola':'404022962',
  'rufina':'409048037',
  'ruinas':'420095044',
  'rumo':'404022163',
  'ruoti':'417076071',
  'russi':'408039016',
  'rutigliano':'416072037',
  'rutino':'415065112',
  'ruviano':'415061073',
  'ruvo del monte':'417076072',
  'ruvo di puglia':'416072038',
  'sabaudia':'412059024',
  'sabbio chiese':'403017168',
  'sabbioneta':'403020054',
  'sacco':'415065113',
  'saccolongo':'405028073',
  'sacile':'406093037',
  'sacrofano':'412058093',
  'sadali':'420091074',
  'sagama':'420091075',
  'sagliano micca':'401096056',
  'sagrado':'406031017',
  'sagron mis':'404022164',
  'saint-christophe':'402007058',
  'saint-denis':'402007059',
  'saint-marcel':'402007060',
  'saint-nicolas':'402007061',
  'saint-oyen':'402007062',
  'saint-pierre':'402007063',
  'saint-rhemy-en-bosses':'402007964',
  'saint-vincent':'402007065',
  'sala baganza':'408034031',
  'sala biellese':'401096057',
  'sala bolognese':'408037050',
  'sala comacina':'403013203',
  'sala consilina':'415065114',
  'sala monferrato':'401006150',
  'salandra':'417077024',
  'salaparuta':'419081017',
  'salara':'405029042',
  'salasco':'401002126',
  'salassa':'401001231',
  'salbertrand':'401001232',
  'salcedo':'405024090',
  'salcito':'414070062',
  'sale':'401006151',
  'sale delle langhe':'401004199',
  'sale marasino':'403017169',
  'sale san giovanni':'401004200',
  'salemi':'419081018',
  'salento':'415065115',
  'salerano canavese':'401001233',
  'salerano sul lambro':'403098046',
  'salerno':'415065116',
  'salgareda':'405026070',
  'sali vercellese':'401002127',
  'salice salentino':'416075065',
  'saliceto':'401004201',
  'salisano':'412057063',
  'salizzole':'405023068',
  'salle':'413068036',
  'salmour':'401004202',
  'salo':'403017170',
  'salorno sulla strada del vino':'404021976',
  'salsomaggiore terme':'408034032',
  'saltrio':'403012117',
  'saludecio':'408099015',
  'saluggia':'401002128',
  'salussola':'401096058',
  'saluzzo':'401004203',
  'salve':'416075066',
  'salvirola':'403019087',
  'salvitelle':'415065117',
  'salza di pinerolo':'401001234',
  'salza irpina':'415064081',
  'salzano':'405027032',
  'samarate':'403012118',
  'samassi':'420092052',
  'samatzai':'420092053',
  'sambuca di sicilia':'419084034',
  'sambuca pistoiese':'409047018',
  'sambuci':'412058094',
  'sambuco':'401004204',
  'sammichele di bari':'416072039',
  'samo':'418080070',
  'samolaco':'403014057',
  'samone':'404022165',
  'sampeyre':'401004205',
  'samugheo':'420095045',
  'san bartolomeo al mare':'407008052',
  'san bartolomeo in galdo':'415062057',
  'san bartolomeo val cavargna':'403013204',
  'san basile':'418078111',
  'san basilio':'420092054',
  'san bassano':'403019088',
  'san bellino':'405029043',
  'san benedetto belbo':'401004206',
  'san benedetto dei marsi':'413066085',
  'san benedetto del tronto':'411044066',
  'san benedetto in perillis':'413066086',
  'san benedetto po':'403020055',
  'san benedetto ullano':'418078112',
  'san benedetto val di sambro':'408037051',
  'san benigno canavese':'401001236',
  'san bernardino verbano':'401103061',
  'san biagio della cima':'407008053',
  'san biagio di callalta':'405026071',
  'san biagio platani':'419084035',
  'san biagio saracinisco':'412060061',
  'san biase':'414070063',
  'san bonifacio':'405023069',
  'san buono':'413069079',
  'san calogero':'418102032',
  'san candido':'404021077',
  'san canzian d isonzo':'406031018',
  'san carlo canavese':'401001237',
  'san casciano dei bagni':'409052027',
  'san casciano in val di pesa':'409048038',
  'san cassiano':'416075095',
  'san cataldo':'419085016',
  'san cesareo':'412058119',
  'san cesario di lecce':'416075068',
  'san cesario sul panaro':'408036036',
  'san chirico nuovo':'417076073',
  'san chirico raparo':'417076074',
  'san cipirello':'419082063',
  'san cipriano d aversa':'415061074',
  'san cipriano picentino':'415065118',
  'san cipriano po':'403018133',
  'san clemente':'408099016',
  'san colombano al lambro':'403015191',
  'san colombano belmonte':'401001238',
  'san colombano certenoli':'407010053',
  'san cono':'419087040',
  'san cosmo albanese':'418078113',
  'san costantino albanese':'417076075',
  'san costantino calabro':'418102033',
  'san costanzo':'411141051',
  'san cristoforo':'401006152',
  'san damiano al colle':'403018134',
  'san damiano d asti':'401005097',
  'san damiano macra':'401004207',
  'san daniele del friuli':'406030099',
  'san daniele po':'403019089',
  'san demetrio corone':'418078114',
  'san demetrio ne vestini':'413066087',
  'san didero':'401001239',
  'san dona di piave':'405027033',
  'san donaci':'416074013',
  'san donato di lecce':'416075069',
  'san donato di ninea':'418078115',
  'san donato milanese':'403015192',
  'san donato val di comino':'412060062',
  'san dorligo della valle':'406032004',
  'san fele':'417076076',
  'san felice a cancello':'415061075',
  'san felice circeo':'412059025',
  'san felice del benaco':'403017171',
  'san felice del molise':'414070064',
  'san felice sul panaro':'408036037',
  'san ferdinando':'418080097',
  'san ferdinando di puglia':'416110007',
  'san fermo della battaglia':'403013206',
  'san fili':'418078116',
  'san filippo del mela':'419083077',
  'san fior':'405026072',
  'san fiorano':'403098047',
  'san floriano del collio':'406031019',
  'san floro':'418079108',
  'san francesco al campo':'401001240',
  'san fratello':'419083078',
  'san gavino monreale':'420092055',
  'san gemini':'410055029',
  'san genesio atesino':'404021079',
  'san genesio ed uniti':'403018135',
  'san gennaro vesuviano':'415063066',
  'san germano chisone':'401001242',
  'san germano vercellese':'401002131',
  'san gervasio bresciano':'403017172',
  'san giacomo degli schiavoni':'414070065',
  'san giacomo delle segnate':'403020056',
  'san giacomo filippo':'403014058',
  'san giacomo vercellese':'401002035',
  'san gillio':'401001243',
  'san gimignano':'409052028',
  'san ginesio':'411043046',
  'san giorgio a cremano':'415063067',
  'san giorgio a liri':'412060063',
  'san giorgio albanese':'418078118',
  'san giorgio bigarello':'403020957',
  'san giorgio canavese':'401001244',
  'san giorgio del sannio':'415062058',
  'san giorgio della richinvelda':'406093038',
  'san giorgio delle pertiche':'405028075',
  'san giorgio di lomellina':'403018136',
  'san giorgio di nogaro':'406030100',
  'san giorgio di piano':'408037052',
  'san giorgio in bosco':'405028076',
  'san giorgio ionico':'416073024',
  'san giorgio la molara':'415062059',
  'san giorgio lucano':'417077025',
  'san giorgio monferrato':'401006153',
  'san giorgio morgeto':'418080071',
  'san giorgio piacentino':'408033040',
  'san giorgio scarampi':'401005098',
  'san giorgio su legnano':'403015194',
  'san giorio di susa':'401001245',
  'san giovanni a piro':'415065119',
  'san giovanni al natisone':'406030101',
  'san giovanni bianco':'403016188',
  'san giovanni del dosso':'403020058',
  'san giovanni di fassa-sen jan':'404022950',
  'san giovanni di gerace':'418080072',
  'san giovanni gemini':'419084036',
  'san giovanni ilarione':'405023070',
  'san giovanni in croce':'403019090',
  'san giovanni in fiore':'418078119',
  'san giovanni in galdo':'414070066',
  'san giovanni in marignano':'408099017',
  'san giovanni in persiceto':'408037053',
  'san giovanni incarico':'412060064',
  'san giovanni la punta':'419087041',
  'san giovanni lipioni':'413069080',
  'san giovanni lupatoto':'405023071',
  'san giovanni rotondo':'416071046',
  'san giovanni suergiu':'420092056',
  'san giovanni teatino':'413069081',
  'san giovanni valdarno':'409051033',
  'san giuliano del sannio':'414070067',
  'san giuliano di puglia':'414070068',
  'san giuliano milanese':'403015195',
  'san giuliano terme':'409050031',
  'san giuseppe iato':'419082064',
  'san giuseppe vesuviano':'415063068',
  'san giustino':'410054044',
  'san giusto canavese':'401001246',
  'san godenzo':'409048039',
  'san gregorio da sassola':'412058095',
  'san gregorio di catania':'419087042',
  'san gregorio d ippona':'418102034',
  'san gregorio magno':'415065120',
  'san gregorio matese':'415061076',
  'san gregorio nelle alpi':'405025045',
  'san lazzaro di savena':'408037054',
  'san leo':'408099025',
  'san leonardo':'406030102',
  'san leonardo in passiria':'404021080',
  'san leucio del sannio':'415062060',
  'san lorenzello':'415062061',
  'san lorenzo':'418080073',
  'san lorenzo al mare':'407008054',
  'san lorenzo bellizzi':'418078120',
  'san lorenzo del vallo':'418078121',
  'san lorenzo di sebato':'404021081',
  'san lorenzo dorsino':'404022231',
  'san lorenzo in campo':'411141054',
  'san lorenzo isontino':'406031020',
  'san lorenzo maggiore':'415062062',
  'san lorenzo nuovo':'412056047',
  'san luca':'418080074',
  'san lucido':'418078122',
  'san lupo':'415062063',
  'san mango d aquino':'418079110',
  'san mango piemonte':'415065121',
  'san mango sul calore':'415064082',
  'san marcellino':'415061077',
  'san marcello':'411042041',
  'san marcello piteglio':'409047024',
  'san marco argentano':'418078123',
  'san marco d alunzio':'419083079',
  'san marco dei cavoti':'415062064',
  'san marco evangelista':'415061104',
  'san marco in lamis':'416071047',
  'san marco la catola':'416071048',
  'san martino al tagliamento':'406093039',
  'san martino alfieri':'401005099',
  'san martino buon albergo':'405023073',
  'san martino canavese':'401001247',
  'san martino d agri':'417076077',
  'san martino dall argine':'403020059',
  'san martino del lago':'403019091',
  'san martino di finita':'418078124',
  'san martino di lupari':'405028077',
  'san martino di venezze':'405029044',
  'san martino in badia':'404021082',
  'san martino in passiria':'404021083',
  'san martino in pensilis':'414070069',
  'san martino in rio':'408035037',
  'san martino in strada':'403098048',
  'san martino sannita':'415062065',
  'san martino siccomario':'403018137',
  'san martino sulla marrucina':'413069082',
  'san martino valle caudina':'415064083',
  'san marzano di san giuseppe':'416073025',
  'san marzano oliveto':'401005100',
  'san marzano sul sarno':'415065122',
  'san massimo':'414070070',
  'san maurizio canavese':'401001248',
  'san maurizio d opaglio':'401003133',
  'san mauro castelverde':'419082065',
  'san mauro cilento':'415065123',
  'san mauro di saline':'405023074',
  'san mauro forte':'417077026',
  'san mauro la bruca':'415065124',
  'san mauro marchesato':'418101020',
  'san mauro pascoli':'408140041',
  'san mauro torinese':'401001249',
  'san michele al tagliamento':'405027034',
  'san michele all adige':'404022167',
  'san michele di ganzaria':'419087043',
  'san michele di serino':'415064084',
  'san michele mondovi':'401004210',
  'san michele salentino':'416074014',
  'san miniato':'409050032',
  'san nazzaro':'415062066',
  'san nazzaro sesia':'401003134',
  'san nazzaro val cavargna':'403013207',
  'san nicandro garganico':'416071049',
  'san nicola arcella':'418078125',
  'san nicola baronia':'415064085',
  'san nicola da crissa':'418102035',
  'san nicola dell alto':'418101021',
  'san nicola la strada':'415061078',
  'san nicola manfredi':'415062067',
  'san nicolo d arcidano':'420095046',
  'san nicolo di comelico':'405025046',
  'san nicolo gerrei':'420092058',
  'san pancrazio':'404021084',
  'san pancrazio salentino':'416074015',
  'san paolo':'403017138',
  'san paolo albanese':'417076020',
  'san paolo bel sito':'415063069',
  'san paolo d argon':'403016189',
  'san paolo di civitate':'416071050',
  'san paolo di jesi':'411042042',
  'san paolo solbrito':'401005101',
  'san pellegrino terme':'403016190',
  'san pier d isonzo':'406031021',
  'san pier niceto':'419083080',
  'san piero patti':'419083081',
  'san pietro a maida':'418079114',
  'san pietro al natisone':'406030103',
  'san pietro al tanagro':'415065125',
  'san pietro apostolo':'418079115',
  'san pietro avellana':'414094043',
  'san pietro clarenza':'419087044',
  'san pietro di cadore':'405025047',
  'san pietro di carida':'418080075',
  'san pietro di feletto':'405026073',
  'san pietro di morubio':'405023075',
  'san pietro in amantea':'418078126',
  'san pietro in cariano':'405023076',
  'san pietro in casale':'408037055',
  'san pietro in cerro':'408033041',
  'san pietro in gu':'405028078',
  'san pietro in guarano':'418078127',
  'san pietro in lama':'416075071',
  'san pietro infine':'415061079',
  'san pietro mosezzo':'401003135',
  'san pietro mussolino':'405024094',
  'san pietro val lemina':'401001250',
  'san pietro vernotico':'416074016',
  'san pietro viminario':'405028079',
  'san pio delle camere':'413066088',
  'san polo dei cavalieri':'412058096',
  'san polo d enza':'408035038',
  'san polo di piave':'405026074',
  'san polo matese':'414070071',
  'san ponso':'401001251',
  'san possidonio':'408036038',
  'san potito sannitico':'415061080',
  'san potito ultra':'415064086',
  'san prisco':'415061081',
  'san procopio':'418080076',
  'san prospero':'408036039',
  'san quirico d orcia':'409052030',
  'san quirino':'406093040',
  'san raffaele cimena':'401001252',
  'san roberto':'418080077',
  'san rocco al porto':'403098049',
  'san romano in garfagnana':'409046027',
  'san rufo':'415065126',
  'san salvatore di fitalia':'419083082',
  'san salvatore monferrato':'401006154',
  'san salvatore telesino':'415062068',
  'san salvo':'413069083',
  'san sebastiano al vesuvio':'415063070',
  'san sebastiano curone':'401006155',
  'san sebastiano da po':'401001253',
  'san secondo di pinerolo':'401001254',
  'san secondo parmense':'408034033',
  'san severino lucano':'417076078',
  'san severino marche':'411043047',
  'san severo':'416071051',
  'san siro':'403013248',
  'san sossio baronia':'415064087',
  'san sostene':'418079116',
  'san sosti':'418078128',
  'san sperate':'420092059',
  'san stino di livenza':'405027936',
  'san tammaro':'415061085',
  'san teodoro':'420091076',
  'san tomaso agordino':'405025049',
  'san valentino in abruzzo citeriore':'413068038',
  'san valentino torio':'415065132',
  'san venanzo':'410055030',
  'san vendemiano':'405026076',
  'san vero milis':'420095050',
  'san vincenzo':'409049018',
  'san vincenzo la costa':'418078135',
  'san vincenzo valle roveto':'413066092',
  'san vitaliano':'415063075',
  'san vito':'420092064',
  'san vito al tagliamento':'406093041',
  'san vito al torre':'406030105',
  'san vito chietino':'413069086',
  'san vito dei normanni':'416074017',
  'san vito di cadore':'405025051',
  'san vito di fagagna':'406030106',
  'san vito di leguzzano':'405024096',
  'san vito lo capo':'419081020',
  'san vito romano':'412058100',
  'san vito sullo ionio':'418079122',
  'san vittore del lazio':'412060070',
  'san vittore olona':'403015201',
  'san zeno di montagna':'405023079',
  'san zeno naviglio':'403017173',
  'san zenone al lambro':'403015202',
  'san zenone al po':'403018145',
  'san zenone degli ezzelini':'405026077',
  'sanarica':'416075067',
  'sandigliano':'401096059',
  'sandrigo':'405024091',
  'sanfre':'401004208',
  'sanfront':'401004209',
  'sangano':'401001241',
  'sangiano':'403012141',
  'sangineto':'418078117',
  'sanguinetto':'405023072',
  'sanluri':'420092057',
  'sannazzaro de burgondi':'403018138',
  'sannicandro di bari':'416072040',
  'sannicola':'416075070',
  'sanremo':'407008055',
  'sansepolcro':'409051034',
  'santa brigida':'403016191',
  'santa caterina albanese':'418078129',
  'santa caterina dello ionio':'418079117',
  'santa caterina d este':'405028108',
  'santa caterina villarmosa':'419085017',
  'santa cesarea terme':'416075072',
  'santa cristina d aspromonte':'418080078',
  'santa cristina e bissone':'403018139',
  'santa cristina gela':'419082066',
  'santa cristina valgardena':'404021085',
  'santa croce camerina':'419088010',
  'santa croce del sannio':'415062069',
  'santa croce di magliano':'414070072',
  'santa croce sull arno':'409050033',
  'santa domenica talao':'418078130',
  'santa domenica vittoria':'419083083',
  'santa elisabetta':'419084037',
  'santa fiora':'409053022',
  'santa flavia':'419082067',
  'santa giuletta':'403018140',
  'santa giusta':'420095047',
  'santa giustina':'405025048',
  'santa giustina in colle':'405028080',
  'santa luce':'409050034',
  'santa lucia del mela':'419083086',
  'santa lucia di piave':'405026075',
  'santa lucia di serino':'415064088',
  'santa margherita di belice':'419084038',
  'santa margherita di staffora':'403018142',
  'santa margherita ligure':'407010054',
  'santa maria a monte':'409050035',
  'santa maria a vico':'415061082',
  'santa maria capua vetere':'415061083',
  'santa maria coghinas':'420090087',
  'santa maria del cedro':'418078132',
  'santa maria del molise':'414094045',
  'santa maria della versa':'403018143',
  'santa maria di licodia':'419087047',
  'santa maria di sala':'405027035',
  'santa maria hoe':'403097074',
  'santa maria imbaro':'413069084',
  'santa maria la carita':'415063090',
  'santa maria la fossa':'415061084',
  'santa maria la longa':'406030104',
  'santa maria maggiore':'401103062',
  'santa maria nuova':'411042043',
  'santa marina':'415065127',
  'santa marina salina':'419083087',
  'santa marinella':'412058097',
  'santa ninfa':'419081019',
  'santa paolina':'415064093',
  'santa severina':'418101022',
  'santa sofia':'408140043',
  'santa sofia d epiro':'418078133',
  'santa teresa di riva':'419083089',
  'santa teresa gallura':'420090063',
  'santa venerina':'419087048',
  'santa vittoria d alba':'401004212',
  'santa vittoria in matenano':'411109036',
  'santadi':'420092060',
  'sant agapito':'414094044',
  'sant agata bolognese':'408037056',
  'sant agata de goti':'415062070',
  'sant agata del bianco':'418080079',
  'sant agata di esaro':'418078131',
  'sant agata di militello':'419083084',
  'sant agata di puglia':'416071052',
  'sant agata feltria':'408099026',
  'sant agata fossili':'401006156',
  'sant agata li battiati':'419087045',
  'sant agata sul santerno':'408039017',
  'sant agnello':'415063071',
  'sant albano stura':'401004211',
  'sant alessio con vialone':'403018141',
  'sant alessio in aspromonte':'418080080',
  'sant alessio siculo':'419083085',
  'sant alfio':'419087046',
  'sant ambrogio di torino':'401001255',
  'sant ambrogio di valpolicella':'405023077',
  'sant ambrogio sul garigliano':'412060065',
  'sant anastasia':'415063072',
  'sant anatolia di narco':'410054045',
  'sant andrea apostolo dello ionio':'418079118',
  'sant andrea del garigliano':'412060066',
  'sant andrea di conza':'415064089',
  'sant andrea frius':'420092061',
  'sant angelo a cupolo':'415062071',
  'sant angelo a fasanella':'415065128',
  'sant angelo a scala':'415064091',
  'sant angelo all esca':'415064090',
  'sant angelo d alife':'415061086',
  'sant angelo dei lombardi':'415064092',
  'sant angelo del pesco':'414094046',
  'sant angelo di brolo':'419083088',
  'sant angelo di piove di sacco':'405028082',
  'sant angelo in pontano':'411043048',
  'sant angelo in vado':'411141057',
  'sant angelo le fratte':'417076079',
  'sant angelo limosano':'414070073',
  'sant angelo lodigiano':'403098050',
  'sant angelo lomellina':'403018144',
  'sant angelo muxaro':'419084039',
  'sant angelo romano':'412058098',
  'sant anna arresi':'420092062',
  'sant anna d alfaedo':'405023078',
  'sant antimo':'415063073',
  'sant antioco':'420092063',
  'sant antonino di susa':'401001256',
  'sant antonio abate':'415063074',
  'sant antonio di gallura':'420090085',
  'sant apollinare':'412060067',
  'sant arcangelo':'417076080',
  'santarcangelo di romagna':'408099018',
  'sant arcangelo trimonte':'415062078',
  'sant arpino':'415061087',
  'sant arsenio':'415065129',
  'sante marie':'413066089',
  'sant egidio alla vibrata':'413067038',
  'sant egidio del monte albino':'415065130',
  'sant elena':'405028083',
  'sant elena sannita':'414094047',
  'sant elia a pianisi':'414070074',
  'sant elia fiumerapido':'412060068',
  'sant elpidio a mare':'411109037',
  'santena':'401001257',
  'santeramo in colle':'416072041',
  'sant eufemia a maiella':'413068037',
  'sant eufemia d aspromonte':'418080081',
  'sant eusanio del sangro':'413069085',
  'sant eusanio forconese':'413066090',
  'santhia':'401002133',
  'santi cosma e damiano':'412059026',
  'sant ilario dello ionio':'418080082',
  'sant ilario d enza':'408035039',
  'sant ippolito':'411141058',
  'santo stefano al mare':'407008056',
  'santo stefano belbo':'401004213',
  'santo stefano d aveto':'407010056',
  'santo stefano del sole':'415064095',
  'santo stefano di cadore':'405025050',
  'santo stefano di camastra':'419083091',
  'santo stefano di magra':'407011026',
  'santo stefano di rogliano':'418078134',
  'santo stefano di sessanio':'413066091',
  'santo stefano in aspromonte':'418080083',
  'santo stefano lodigiano':'403098051',
  'santo stefano quisquina':'419084040',
  'santo stefano roero':'401004214',
  'santo stefano ticino':'403015200',
  'sant olcese':'407010055',
  'santomenna':'415065131',
  'sant omero':'413067039',
  'sant omobono terme':'403016992',
  'sant onofrio':'418102036',
  'santopadre':'412060069',
  'sant oreste':'412058099',
  'santorso':'405024095',
  'sant orsola terme':'404022168',
  'santu lussurgiu':'420095049',
  'sant urbano':'405028084',
  'sanza':'415065133',
  'sanzeno':'404022169',
  'saonara':'405028085',
  'saponara':'419083092',
  'sappada':'405030189',
  'sapri':'415065134',
  'saracena':'418078136',
  'saracinesco':'412058101',
  'sarcedo':'405024097',
  'sarconi':'417076081',
  'sardara':'420092065',
  'sardigliano':'401006157',
  'sarego':'405024098',
  'sarentino':'404021086',
  'sarezzano':'401006158',
  'sarezzo':'403017174',
  'sarmato':'408033042',
  'sarmede':'405026078',
  'sarnano':'411043049',
  'sarnico':'403016193',
  'sarno':'415065135',
  'sarnonico':'404022170',
  'saronno':'403012119',
  'sarre':'402007066',
  'sarroch':'420092066',
  'sarsina':'408140044',
  'sarteano':'409052031',
  'sartirana lomellina':'403018146',
  'sarule':'420091077',
  'sarzana':'407011027',
  'sassano':'415065136',
  'sassari':'420090064',
  'sassello':'407009055',
  'sassetta':'409049019',
  'sassinoro':'415062072',
  'sasso di castalda':'417076082',
  'sasso marconi':'408037057',
  'sassocorvaro auditore':'411141071',
  'sassofeltrio':'411099031',
  'sassoferrato':'411042044',
  'sassuolo':'408036040',
  'satriano':'418079123',
  'satriano di lucania':'417076083',
  'sauris':'406030107',
  'sauze di cesana':'401001258',
  'sauze d oulx':'401001259',
  'sava':'416073026',
  'savelli':'418101023',
  'saviano':'415063076',
  'savigliano':'401004215',
  'savignano irpino':'415064096',
  'savignano sul panaro':'408036041',
  'savignano sul rubicone':'408140045',
  'savignone':'407010057',
  'saviore dell adamello':'403017175',
  'savoca':'419083093',
  'savogna':'406030108',
  'savogna d isonzo':'406031022',
  'savoia di lucania':'417076084',
  'savona':'407009056',
  'scafa':'413068039',
  'scafati':'415065137',
  'scagnello':'401004216',
  'scala':'415065138',
  'scala coeli':'418078137',
  'scaldasole':'403018147',
  'scalea':'418078138',
  'scalenghe':'401001260',
  'scaletta zanclea':'419083094',
  'scampitella':'415064097',
  'scandale':'418101024',
  'scandiano':'408035040',
  'scandicci':'409048041',
  'scandolara ravara':'403019092',
  'scandolara ripa d oglio':'403019093',
  'scandriglia':'412057064',
  'scanno':'413066093',
  'scano di montiferro':'420095051',
  'scansano':'409053023',
  'scanzano jonico':'417077031',
  'scanzorosciate':'403016194',
  'scapoli':'414094048',
  'scarlino':'409053024',
  'scarmagno':'401001261',
  'scarnafigi':'401004217',
  'scarperia e san piero':'409048053',
  'scena':'404021087',
  'scerni':'413069087',
  'scheggia e pascelupo':'410054046',
  'scheggino':'410054047',
  'schiavi di abruzzo':'413069088',
  'schiavon':'405024099',
  'schignano':'403013211',
  'schilpario':'403016195',
  'schio':'405024100',
  'schivenoglia':'403020060',
  'sciacca':'419084041',
  'sciara':'419082068',
  'scicli':'419088011',
  'scido':'418080084',
  'scigliano':'418078139',
  'scilla':'418080085',
  'scillato':'419082081',
  'sciolze':'401001262',
  'scisciano':'415063077',
  'sclafani bagni':'419082069',
  'scontrone':'413066094',
  'scopa':'401002134',
  'scopello':'401002135',
  'scoppito':'413066095',
  'scordia':'419087049',
  'scorrano':'416075073',
  'scorze':'405027037',
  'scurcola marsicana':'413066096',
  'scurelle':'404022171',
  'scurzolengo':'401005103',
  'seborga':'407008057',
  'secinaro':'413066097',
  'secli':'416075074',
  'secugnago':'403098052',
  'sedegliano':'406030109',
  'sedico':'405025053',
  'sedilo':'420095052',
  'sedini':'420090065',
  'sedriano':'403015204',
  'sedrina':'403016196',
  'sefro':'411043050',
  'segariu':'420092067',
  'seggiano':'409053025',
  'segni':'412058102',
  'segonzano':'404022172',
  'segrate':'403015205',
  'segusino':'405026079',
  'selargius':'420092068',
  'selci':'412057065',
  'selegas':'420092069',
  'sella giudicarie':'404022246',
  'sellano':'410054048',
  'sellero':'403017176',
  'sellia':'418079126',
  'sellia marina':'418079127',
  'selva dei molini':'404021088',
  'selva di cadore':'405025054',
  'selva di progno':'405023080',
  'selva di val gardena':'404021089',
  'selvazzano dentro':'405028086',
  'selvino':'403016197',
  'semestene':'420090066',
  'semiana':'403018148',
  'seminara':'418080086',
  'semproniano':'409053028',
  'senago':'403015206',
  'senales':'404021091',
  'senale-san felice':'404021118',
  'seneghe':'420095053',
  'senerchia':'415064098',
  'seniga':'403017177',
  'senigallia':'411042045',
  'senis':'420095054',
  'senise':'417076085',
  'senna comasco':'403013212',
  'senna lodigiana':'403098053',
  'sennariolo':'420095055',
  'sennori':'420090067',
  'senorbi':'420092070',
  'sepino':'414070075',
  'sequals':'406093042',
  'seravezza':'409046028',
  'serdiana':'420092071',
  'seregno':'403108039',
  'seren del grappa':'405025055',
  'sergnano':'403019094',
  'seriate':'403016198',
  'serina':'403016199',
  'serino':'415064099',
  'serle':'403017178',
  'sermide e felonica':'403020961',
  'sermoneta':'412059027',
  'sernaglia della battaglia':'405026080',
  'sernio':'403014059',
  'serole':'401005104',
  'serra d aiello':'418078140',
  'serra de conti':'411042046',
  'serra ricco':'407010058',
  'serra san bruno':'418102037',
  'serra san quirico':'411042047',
  'serra sant abbondio':'411141061',
  'serracapriola':'416071053',
  'serradifalco':'419085018',
  'serralunga d alba':'401004218',
  'serralunga di crea':'401006159',
  'serramanna':'420092072',
  'serramazzoni':'408036042',
  'serramezzana':'415065139',
  'serramonacesca':'413068040',
  'serrapetrona':'411043051',
  'serrara fontana':'415063078',
  'serrastretta':'418079129',
  'serrata':'418080087',
  'serravalle a po':'403020062',
  'serravalle di chienti':'411043052',
  'serravalle langhe':'401004219',
  'serravalle pistoiese':'409047020',
  'serravalle scrivia':'401006160',
  'serravalle sesia':'401002137',
  'serre':'415065140',
  'serrenti':'420092073',
  'serri':'420092120',
  'serrone':'412060071',
  'sersale':'418079130',
  'servigliano':'411109038',
  'sessa aurunca':'415061088',
  'sessa cilento':'415065141',
  'sessame':'401005105',
  'sessano del molise':'414094049',
  'sesta godano':'407011028',
  'sestino':'409051035',
  'sesto':'404021092',
  'sesto al reghena':'406093043',
  'sesto calende':'403012120',
  'sesto campano':'414094050',
  'sesto ed uniti':'403019095',
  'sesto fiorentino':'409048043',
  'sesto san giovanni':'403015209',
  'sestola':'408036043',
  'sestri levante':'407010059',
  'sestriere':'401001263',
  'sestu':'420092074',
  'settala':'403015210',
  'settefrati':'412060072',
  'setteville':'405025075',
  'settime':'401005106',
  'settimo milanese':'403015211',
  'settimo rottaro':'401001264',
  'settimo san pietro':'420092075',
  'settimo torinese':'401001265',
  'settimo vittone':'401001266',
  'settingiano':'418079131',
  'setzu':'420092076',
  'seui':'420091081',
  'seulo':'420091082',
  'seveso':'403108040',
  'sezzadio':'401006161',
  'sezze':'412059028',
  'sfruz':'404022173',
  'sgonico':'406032005',
  'sgurgola':'412060073',
  'siamaggiore':'420095056',
  'siamanna':'420095057',
  'siano':'415065142',
  'siapiccia':'420095076',
  'sicignano degli alburni':'415065143',
  'siculiana':'419084042',
  'siddi':'420092077',
  'siderno':'418080088',
  'siena':'409052032',
  'sigillo':'410054049',
  'signa':'409048044',
  'silandro':'404021093',
  'silanus':'420091083',
  'silea':'405026081',
  'siligo':'420090068',
  'siliqua':'420092078',
  'silius':'420092079',
  'sillano giuncugnano':'409046037',
  'sillavengo':'401003138',
  'silvano d orba':'401006162',
  'silvano pietra':'403018149',
  'silvi':'413067040',
  'simala':'420095058',
  'simaxis':'420095059',
  'simbario':'418102038',
  'simeri crichi':'418079133',
  'sinagra':'419083095',
  'sinalunga':'409052033',
  'sindia':'420091084',
  'sini':'420095060',
  'sinio':'401004220',
  'siniscola':'420091085',
  'sinnai':'420092080',
  'sinopoli':'418080089',
  'siracusa':'419089017',
  'sirignano':'415064100',
  'siris':'420095061',
  'sirmione':'403017179',
  'sirolo':'411042048',
  'sirone':'403097075',
  'sirtori':'403097076',
  'sissa trecasali':'408034049',
  'siurgus donigala':'420092081',
  'siziano':'403018150',
  'sizzano':'401003139',
  'sluderno':'404021094',
  'smerillo':'411109039',
  'soave':'405023081',
  'socchieve':'406030110',
  'soddi':'420095078',
  'sogliano al rubicone':'408140046',
  'sogliano cavour':'416075075',
  'soglio':'401005107',
  'soiano del lago':'403017180',
  'solagna':'405024101',
  'solarino':'419089018',
  'solaro':'403015213',
  'solarolo':'408039018',
  'solarolo rainerio':'403019096',
  'solarussa':'420095062',
  'solbiate arno':'403012121',
  'solbiate con cagno':'403013255',
  'solbiate olona':'403012122',
  'soldano':'407008058',
  'soleminis':'420092082',
  'solero':'401006163',
  'solesino':'405028087',
  'soleto':'416075076',
  'solferino':'403020063',
  'soliera':'408036044',
  'solignano':'408034035',
  'solofra':'415064101',
  'solonghello':'401006164',
  'solopaca':'415062073',
  'solto collina':'403016200',
  'solza':'403016251',
  'somaglia':'403098054',
  'somano':'401004221',
  'somma lombardo':'403012123',
  'somma vesuviana':'415063079',
  'sommacampagna':'405023082',
  'sommariva del bosco':'401004222',
  'sommariva perno':'401004223',
  'sommatino':'419085019',
  'sommo':'403018151',
  'sona':'405023083',
  'soncino':'403019097',
  'sondalo':'403014060',
  'sondrio':'403014061',
  'songavazzo':'403016201',
  'sonico':'403017181',
  'sonnino':'412059029',
  'sora':'412060074',
  'soraga di fassa':'404022976',
  'soragna':'408034036',
  'sorano':'409053026',
  'sorbo san basile':'418079134',
  'sorbo serpico':'415064102',
  'sorbolo mezzani':'408034051',
  'sordevolo':'401096063',
  'sordio':'403098055',
  'soresina':'403019098',
  'sorga':'405023084',
  'sorgono':'420091086',
  'sori':'407010060',
  'sorianello':'418102039',
  'soriano calabro':'418102040',
  'soriano nel cimino':'412056048',
  'sorico':'403013216',
  'soriso':'401003140',
  'sorisole':'403016202',
  'sormano':'403013217',
  'sorradile':'420095063',
  'sorrento':'415063080',
  'sorso':'420090069',
  'sortino':'419089019',
  'sospiro':'403019099',
  'sospirolo':'405025056',
  'sossano':'405024102',
  'sostegno':'401096064',
  'sotto il monte giovanni xxiii':'403016203',
  'sover':'404022177',
  'soverato':'418079137',
  'sovere':'403016204',
  'soveria mannelli':'418079138',
  'soveria simeri':'418079139',
  'soverzene':'405025057',
  'sovicille':'409052034',
  'sovico':'403108041',
  'sovizzo':'405024128',
  'sovramonte':'405025058',
  'sozzago':'401003141',
  'spadafora':'419083096',
  'spadola':'418102041',
  'sparanise':'415061089',
  'sparone':'401001267',
  'specchia':'416075077',
  'spello':'410054050',
  'sperlinga':'419086017',
  'sperlonga':'412059030',
  'sperone':'415064103',
  'spessa':'403018152',
  'spezzano albanese':'418078142',
  'spezzano della sila':'418078143',
  'spiazzo':'404022179',
  'spigno monferrato':'401006165',
  'spigno saturnia':'412059031',
  'spilamberto':'408036045',
  'spilimbergo':'406093044',
  'spilinga':'418102042',
  'spinadesco':'403019100',
  'spinazzola':'416110008',
  'spinea':'405027038',
  'spineda':'403019101',
  'spinete':'414070076',
  'spineto scrivia':'401006166',
  'spinetoli':'411044071',
  'spino d adda':'403019102',
  'spinone al lago':'403016205',
  'spinoso':'417076086',
  'spirano':'403016206',
  'spoleto':'410054051',
  'spoltore':'413068041',
  'spongano':'416075078',
  'spormaggiore':'404022180',
  'sporminore':'404022181',
  'spotorno':'407009057',
  'spresiano':'405026082',
  'spriana':'403014062',
  'squillace':'418079142',
  'squinzano':'416075079',
  'staffolo':'411042049',
  'stagno lombardo':'403019103',
  'staiti':'418080090',
  'staletti':'418079143',
  'stanghella':'405028088',
  'staranzano':'406031023',
  'statte':'416073029',
  'stazzano':'401006167',
  'stazzema':'409046030',
  'stazzona':'403013218',
  'stefanaconi':'418102043',
  'stella':'407009058',
  'stella cilento':'415065144',
  'stellanello':'407009059',
  'stelvio':'404021095',
  'stenico':'404022182',
  'sternatia':'416075080',
  'stezzano':'403016207',
  'stienta':'405029045',
  'stigliano':'417077027',
  'stignano':'418080091',
  'stilo':'418080092',
  'stimigliano':'412057066',
  'stintino':'420090089',
  'stio':'415065145',
  'stornara':'416071054',
  'stornarella':'416071055',
  'storo':'404022183',
  'stra':'405027039',
  'stradella':'403018153',
  'strambinello':'401001268',
  'strambino':'401001269',
  'strangolagalli':'412060075',
  'stregna':'406030111',
  'strembo':'404022184',
  'stresa':'401103064',
  'strevi':'401006168',
  'striano':'415063081',
  'strona':'401096065',
  'stroncone':'410055031',
  'strongoli':'418101025',
  'stroppiana':'401002142',
  'stroppo':'401004224',
  'strozza':'403016208',
  'sturno':'415064104',
  'suardi':'403018154',
  'subbiano':'409051037',
  'subiaco':'412058103',
  'succivo':'415061090',
  'sueglio':'403097077',
  'suelli':'420092083',
  'suello':'403097078',
  'suisio':'403016209',
  'sulbiate':'403108042',
  'sulmona':'413066098',
  'sulzano':'403017182',
  'sumirago':'403012124',
  'summonte':'415064105',
  'suni':'420091087',
  'suno':'401003143',
  'supersano':'416075081',
  'supino':'412060076',
  'surano':'416075082',
  'surbo':'416075083',
  'susa':'401001270',
  'susegana':'405026083',
  'sustinente':'403020064',
  'sutera':'419085020',
  'sutri':'412056049',
  'sutrio':'406030112',
  'suvereto':'409049020',
  'suzzara':'403020065',
  'taceno':'403097079',
  'tadasuni':'420095064',
  'taggia':'407008059',
  'tagliacozzo':'413066099',
  'taglio di po':'405029046',
  'tagliolo monferrato':'401006169',
  'taibon agordino':'405025059',
  'taino':'403012125',
  'taipana':'406030113',
  'talamello':'408099027',
  'talamona':'403014063',
  'talana':'420091088',
  'taleggio':'403016210',
  'talla':'409051038',
  'talmassons':'406030114',
  'tambre':'405025060',
  'taormina':'419083097',
  'tarano':'412057067',
  'taranta peligna':'413069089',
  'tarantasca':'401004225',
  'taranto':'416073027',
  'tarcento':'406030116',
  'tarquinia':'412056050',
  'tarsia':'418078145',
  'tartano':'403014064',
  'tarvisio':'406030117',
  'tarzo':'405026084',
  'tassarolo':'401006170',
  'taurano':'415064106',
  'taurasi':'415064107',
  'taurianova':'418080093',
  'taurisano':'416075084',
  'tavagnacco':'406030118',
  'tavagnasco':'401001271',
  'tavazzano con villavesco':'403098056',
  'tavenna':'414070077',
  'taverna':'418079146',
  'tavernerio':'403013222',
  'tavernola bergamasca':'403016211',
  'tavernole sul mella':'403017183',
  'taviano':'416075085',
  'tavigliano':'401096066',
  'tavoleto':'411141064',
  'tavullia':'411141065',
  'teana':'417076087',
  'teano':'415061091',
  'teggiano':'415065146',
  'teglio':'403014065',
  'teglio veneto':'405027040',
  'telese terme':'415062074',
  'telgate':'403016212',
  'telti':'420090080',
  'telve':'404022188',
  'telve di sopra':'404022189',
  'tempio pausania':'420090070',
  'temu':'403017184',
  'tenna':'404022190',
  'tenno':'404022191',
  'teolo':'405028089',
  'teora':'415064108',
  'teramo':'413067041',
  'terdobbiate':'401003144',
  'terelle':'412060077',
  'terento':'404021096',
  'terenzo':'408034038',
  'tergu':'420090086',
  'terlano':'404021097',
  'terlizzi':'416072043',
  'terme vigliatore':'419083106',
  'termeno sulla strada del vino':'404021098',
  'termini imerese':'419082070',
  'termoli':'414070078',
  'ternate':'403012126',
  'ternengo':'401096067',
  'terni':'410055032',
  'terno d isola':'403016213',
  'terracina':'412059032',
  'terragnolo':'404022193',
  'terralba':'420095065',
  'terranova da sibari':'418078146',
  'terranova dei passerini':'403098057',
  'terranova di pollino':'417076088',
  'terranova sappo minulio':'418080094',
  'terranuova bracciolini':'409051039',
  'terrasini':'419082071',
  'terrassa padovana':'405028090',
  'terravecchia':'418078147',
  'terrazzo':'405023085',
  'terre d adige':'404022251',
  'terre del reno':'408038028',
  'terre roveresche':'411141070',
  'terricciola':'409050036',
  'terruggia':'401006171',
  'tertenia':'420091089',
  'terzigno':'415063082',
  'terzo':'401006172',
  'terzo di aquileia':'406030120',
  'terzolas':'404022195',
  'terzorio':'407008060',
  'tesero':'404022196',
  'tesimo':'404021099',
  'tessennano':'412056051',
  'testico':'407009060',
  'teti':'420091090',
  'teulada':'420092084',
  'teverola':'415061092',
  'tezze sul brenta':'405024104',
  'thiene':'405024105',
  'thiesi':'420090071',
  'tiana':'420091091',
  'ticengo':'403019104',
  'ticineto':'401006173',
  'tiggiano':'416075086',
  'tiglieto':'407010061',
  'tigliole':'401005108',
  'tignale':'403017185',
  'tinnura':'420091092',
  'tione degli abruzzi':'413066100',
  'tione di trento':'404022199',
  'tirano':'403014066',
  'tires':'404021100',
  'tiriolo':'418079147',
  'tirolo':'404021101',
  'tissi':'420090072',
  'tito':'417076089',
  'tivoli':'412058104',
  'tizzano val parma':'408034039',
  'toano':'408035041',
  'tocco caudio':'415062075',
  'tocco da casauria':'413068042',
  'toceno':'401103065',
  'todi':'410054052',
  'toffia':'412057068',
  'toirano':'407009061',
  'tolentino':'411043053',
  'tolfa':'412058105',
  'tollegno':'401096068',
  'tollo':'413069090',
  'tolmezzo':'406030121',
  'tolve':'417076090',
  'tombolo':'405028091',
  'ton':'404022200',
  'tonara':'420091093',
  'tonco':'401005109',
  'tonezza del cimone':'405024106',
  'tora e piccilli':'415061093',
  'torano castello':'418078148',
  'torano nuovo':'413067042',
  'torbole casaglia':'403017186',
  'torcegno':'404022202',
  'torchiara':'415065147',
  'torchiarolo':'416074018',
  'torella dei lombardi':'415064109',
  'torella del sannio':'414070079',
  'torgiano':'410054053',
  'torgnon':'402007067',
  'torino':'401001272',
  'torino di sangro':'413069091',
  'toritto':'416072044',
  'torlino vimercati':'403019105',
  'tornaco':'401003146',
  'tornareccio':'413069092',
  'tornata':'403019106',
  'tornimparte':'413066101',
  'torno':'403013223',
  'tornolo':'408034040',
  'toro':'414070080',
  'torpe':'420091094',
  'torraca':'415065148',
  'torralba':'420090073',
  'torrazza coste':'403018155',
  'torrazza piemonte':'401001273',
  'torrazzo':'401096069',
  'torre annunziata':'415063083',
  'torre beretti e castellaro':'403018156',
  'torre boldone':'403016214',
  'torre bormida':'401004226',
  'torre cajetani':'412060078',
  'torre canavese':'401001274',
  'torre d arese':'403018157',
  'torre de busi':'403016215',
  'torre de passeri':'413068043',
  'torre de picenardi':'403019107',
  'torre de roveri':'403016216',
  'torre dei negri':'403018158',
  'torre del greco':'415063084',
  'torre di mosto':'405027041',
  'torre di ruggiero':'418079148',
  'torre di santa maria':'403014067',
  'torre d isola':'403018159',
  'torre le nocelle':'415064110',
  'torre mondovi':'401004227',
  'torre orsaia':'415065149',
  'torre pallavicina':'403016217',
  'torre pellice':'401001275',
  'torre san giorgio':'401004228',
  'torre san patrizio':'411109040',
  'torre santa susanna':'416074019',
  'torreano':'406030122',
  'torrebelvicino':'405024107',
  'torrebruna':'413069093',
  'torrecuso':'415062076',
  'torreglia':'405028092',
  'torregrotta':'419083098',
  'torremaggiore':'416071056',
  'torrenova':'419083108',
  'torresina':'401004229',
  'torretta':'419082072',
  'torrevecchia pia':'403018160',
  'torrevecchia teatina':'413069094',
  'torri del benaco':'405023086',
  'torri di quartesolo':'405024108',
  'torri in sabina':'412057070',
  'torrice':'412060079',
  'torricella':'416073028',
  'torricella del pizzo':'403019108',
  'torricella in sabina':'412057069',
  'torricella peligna':'413069095',
  'torricella sicura':'413067043',
  'torricella verzate':'403018161',
  'torriglia':'407010062',
  'torrile':'408034041',
  'torrioni':'415064111',
  'torrita di siena':'409052035',
  'torrita tiberina':'412058106',
  'tortoli':'420091095',
  'tortona':'401006174',
  'tortora':'418078149',
  'tortorella':'415065150',
  'tortoreto':'413067044',
  'tortorici':'419083099',
  'torviscosa':'406030123',
  'toscolano maderno':'403017187',
  'tossicia':'413067045',
  'tovo di sant agata':'403014068',
  'tovo san giacomo':'407009062',
  'trabia':'419082073',
  'tradate':'403012127',
  'tramatza':'420095066',
  'trambileno':'404022203',
  'tramonti':'415065151',
  'tramonti di sopra':'406093045',
  'tramonti di sotto':'406093046',
  'tramutola':'417076091',
  'trana':'401001276',
  'trani':'416110009',
  'traona':'403014069',
  'trapani':'419081021',
  'trappeto':'419082074',
  'trarego-viggiona':'401103066',
  'trasacco':'413066102',
  'trasaghis':'406030124',
  'trasquera':'401103067',
  'tratalias':'420092085',
  'travaco siccomario':'403018162',
  'travagliato':'403017188',
  'travedona-monate':'403012128',
  'traversella':'401001278',
  'traversetolo':'408034042',
  'traves':'401001279',
  'travesio':'406093047',
  'travo':'408033043',
  'tre ville':'404022247',
  'trebaseleghe':'405028093',
  'trebisacce':'418078150',
  'trecase':'415063091',
  'trecastagni':'419087050',
  'trecastelli':'411042050',
  'trecate':'401003149',
  'trecchina':'417076092',
  'trecenta':'405029047',
  'tredozio':'408140049',
  'treglio':'413069096',
  'tregnago':'405023087',
  'treia':'411043054',
  'treiso':'401004230',
  'tremestieri etneo':'419087051',
  'tremezzina':'403013252',
  'tremosine sul garda':'403017989',
  'trentinara':'415065152',
  'trento':'404022205',
  'trentola-ducenta':'415061094',
  'trenzano':'403017190',
  'treppo grande':'406030126',
  'treppo ligosullo':'406030191',
  'trepuzzi':'416075087',
  'trequanda':'409052036',
  'tresana':'409045015',
  'trescore balneario':'403016218',
  'trescore cremasco':'403019109',
  'tresignana':'408038030',
  'tresivio':'403014070',
  'tresnuraghes':'420095067',
  'trevenzuolo':'405023088',
  'trevi':'410054054',
  'trevi nel lazio':'412060080',
  'trevico':'415064112',
  'treviglio':'403016219',
  'trevignano':'405026085',
  'trevignano romano':'412058107',
  'treville':'401006175',
  'treviolo':'403016220',
  'treviso':'405026086',
  'treviso bresciano':'403017191',
  'trezzano rosa':'403015219',
  'trezzano sul naviglio':'403015220',
  'trezzo sull adda':'403015221',
  'trezzo tinella':'401004231',
  'trezzone':'403013226',
  'tribano':'405028094',
  'tribiano':'403015222',
  'tribogna':'407010063',
  'tricarico':'417077028',
  'tricase':'416075088',
  'tricerro':'401002147',
  'tricesimo':'406030127',
  'triei':'420091097',
  'trieste':'406032006',
  'triggiano':'416072046',
  'trigolo':'403019110',
  'trinita':'401004232',
  'trinita d agultu e vignola':'420090074',
  'trinitapoli':'416110010',
  'trino':'401002148',
  'triora':'407008061',
  'tripi':'419083100',
  'trisobbio':'401006176',
  'trissino':'405024110',
  'triuggio':'403108043',
  'trivento':'414070081',
  'trivigliano':'412060081',
  'trivignano udinese':'406030128',
  'trivigno':'417076093',
  'trivolzio':'403018163',
  'trodena nel parco naturale':'404021902',
  'trofarello':'401001280',
  'troia':'416071058',
  'troina':'419086018',
  'tromello':'403018164',
  'trontano':'401103068',
  'tronzano lago maggiore':'403012129',
  'tronzano vercellese':'401002150',
  'tropea':'418102044',
  'trovo':'403018165',
  'truccazzano':'403015224',
  'tubre':'404021103',
  'tufara':'414070082',
  'tufillo':'413069097',
  'tufino':'415063085',
  'tufo':'415064113',
  'tuglie':'416075089',
  'tuili':'420092086',
  'tula':'420090075',
  'tuoro sul trasimeno':'410054055',
  'turania':'412057071',
  'turano lodigiano':'403098058',
  'turate':'403013227',
  'turbigo':'403015226',
  'turi':'416072047',
  'turri':'420092087',
  'turriaco':'406031024',
  'turrivalignani':'413068044',
  'tursi':'417077029',
  'tusa':'419083101',
  'tuscania':'412056052',
  'ubiale clanezzo':'403016221',
  'uboldo':'403012130',
  'ucria':'419083102',
  'udine':'406030129',
  'ugento':'416075090',
  'uggiano la chiesa':'416075091',
  'uggiate con ronago':'403013256',
  'ula tirso':'420095068',
  'ulassai':'420091098',
  'ultimo':'404021104',
  'umbertide':'410054056',
  'umbriatico':'418101026',
  'urago d oglio':'403017192',
  'uras':'420095069',
  'urbana':'405028095',
  'urbania':'411141066',
  'urbe':'407009063',
  'urbino':'411141067',
  'urbisaglia':'411043055',
  'urgnano':'403016222',
  'uri':'420090076',
  'ururi':'414070083',
  'urzulei':'420091099',
  'uscio':'407010064',
  'usellus':'420095070',
  'usini':'420090077',
  'usmate velate':'403108044',
  'ussana':'420092088',
  'ussaramanna':'420092089',
  'ussassai':'420091100',
  'usseaux':'401001281',
  'usseglio':'401001282',
  'ussita':'411043056',
  'ustica':'419082075',
  'uta':'420092090',
  'uzzano':'409047021',
  'vaccarizzo albanese':'418078152',
  'vacone':'412057072',
  'vacri':'413069098',
  'vadena':'404021105',
  'vado ligure':'407009064',
  'vagli sotto':'409046031',
  'vaglia':'409048046',
  'vaglio basilicata':'417076094',
  'vaglio serra':'401005111',
  'vaiano':'409100006',
  'vaiano cremasco':'403019111',
  'vaie':'401001283',
  'vailate':'403019112',
  'vairano patenora':'415061095',
  'vajont':'406093052',
  'val brembilla':'403016253',
  'val della torre':'401001284',
  'val di chy':'401001317',
  'val di nizza':'403018166',
  'val di vizze':'404021107',
  'val di zoldo':'405025073',
  'val liona':'405024123',
  'val masino':'403014074',
  'val rezzo':'403013233',
  'valbondione':'403016223',
  'valbrembo':'403016224',
  'valbrenta':'405024125',
  'valbrevenna':'407010065',
  'valbrona':'403013229',
  'valchiusa':'401001318',
  'valdagno':'405024111',
  'valdaone':'404022232',
  'valdaora':'404021106',
  'valdastico':'405024112',
  'valdengo':'401096071',
  'valderice':'419081022',
  'valdidentro':'403014071',
  'valdieri':'401004233',
  'valdilana':'401096088',
  'valdina':'419083103',
  'valdisotto':'403014072',
  'valdobbiadene':'405026087',
  'valduggia':'401002152',
  'valeggio':'403018167',
  'valeggio sul mincio':'405023089',
  'valentano':'412056053',
  'valenza':'401006177',
  'valenzano':'416072048',
  'valera fratta':'403098059',
  'valfabbrica':'410054057',
  'valfenera':'401005112',
  'valfloriana':'404022209',
  'valfornace':'411043058',
  'valfurva':'403014073',
  'valganna':'403012131',
  'valgioie':'401001285',
  'valgoglio':'403016225',
  'valgrana':'401004234',
  'valgreghentino':'403097082',
  'valgrisenche':'402007068',
  'valguarnera caropepe':'419086019',
  'vallada agordina':'405025062',
  'vallanzengo':'401096072',
  'vallarsa':'404022210',
  'vallata':'415064114',
  'valle agricola':'415061096',
  'valle aurina':'404021108',
  'valle cannobina':'401103079',
  'valle castellana':'413067046',
  'valle dell angelo':'415065153',
  'valle di cadore':'405025063',
  'valle di casies':'404021109',
  'valle di maddaloni':'415061097',
  'valle lomellina':'403018168',
  'valle salimbene':'403018169',
  'valle san nicolao':'401096074',
  'vallebona':'407008062',
  'vallecorsa':'412060082',
  'vallecrosia':'407008063',
  'valledolmo':'419082076',
  'valledoria':'420090079',
  'vallefiorita':'418079151',
  'vallefoglia':'411141068',
  'vallelaghi':'404022248',
  'vallelonga':'418102045',
  'vallelunga pratameno':'419085021',
  'vallemaio':'412060083',
  'vallepietra':'412058108',
  'vallerano':'412056054',
  'vallermosa':'420092091',
  'vallerotonda':'412060084',
  'vallesaccarda':'415064115',
  'valleve':'403016226',
  'valli del pasubio':'405024113',
  'vallinfreda':'412058109',
  'vallio terme':'403017999',
  'vallo della lucania':'415065154',
  'vallo di nera':'410054058',
  'vallo torinese':'401001286',
  'valloriate':'401004235',
  'valmacca':'401006178',
  'valmadrera':'403097083',
  'valmontone':'412058110',
  'valmorea':'403013232',
  'valmozzola':'408034044',
  'valnegra':'403016227',
  'valpelline':'402007069',
  'valperga':'401001287',
  'valprato soana':'401001288',
  'valsamoggia':'408037061',
  'valsavarenche':'402007070',
  'valsinni':'417077030',
  'valsolda':'403013234',
  'valstrona':'401103069',
  'valtopina':'410054059',
  'valtorta':'403016229',
  'valtournenche':'402007071',
  'valva':'415065155',
  'valvarrone':'403097093',
  'valvasone arzene':'406093053',
  'valverde':'419087052',
  'valvestino':'403017194',
  'vandoies':'404021110',
  'vanzaghello':'403015249',
  'vanzago':'403015229',
  'vanzone con san carlo':'401103070',
  'vaprio d adda':'403015230',
  'vaprio d agogna':'401003153',
  'varallo':'401002156',
  'varallo pombia':'401003154',
  'varano borghi':'403012132',
  'varano de melegari':'408034045',
  'varapodio':'418080095',
  'varazze':'407009065',
  'varco sabino':'412057073',
  'varedo':'403108045',
  'varenna':'403097084',
  'varese':'403012133',
  'varese ligure':'407011029',
  'varisella':'401001289',
  'varmo':'406030130',
  'varna':'404021111',
  'varsi':'408034046',
  'varzi':'403018171',
  'varzo':'401103071',
  'vasanello':'412056055',
  'vasia':'407008064',
  'vasto':'413069099',
  'vastogirardi':'414094051',
  'vauda canavese':'401001290',
  'vazzano':'418102046',
  'vazzola':'405026088',
  'vecchiano':'409050037',
  'vedano al lambro':'403108046',
  'vedano olona':'403012134',
  'vedelago':'405026089',
  'vedeseta':'403016230',
  'veduggio con colzano':'403108047',
  'veggiano':'405028096',
  'veglie':'416075092',
  'veglio':'401096075',
  'vejano':'412056056',
  'veleso':'403013236',
  'velezzo lomellina':'403018172',
  'velletri':'412058111',
  'vellezzo bellini':'403018173',
  'velo d astico':'405024115',
  'velo veronese':'405023090',
  'velturno':'404021116',
  'venafro':'414094052',
  'venaria reale':'401001292',
  'venarotta':'411044073',
  'venasca':'401004237',
  'venaus':'401001291',
  'vendone':'407009066',
  'venegono inferiore':'403012136',
  'venegono superiore':'403012137',
  'venetico':'419083104',
  'venezia':'405027042',
  'veniano':'403013238',
  'venosa':'417076095',
  'ventasso':'408035046',
  'venticano':'415064116',
  'ventimiglia':'407008065',
  'ventimiglia di sicilia':'419082077',
  'ventotene':'412059033',
  'venzone':'406030131',
  'verano':'404021112',
  'verano brianza':'403108048',
  'verbania':'401103072',
  'verbicaro':'418078153',
  'vercana':'403013239',
  'verceia':'403014075',
  'vercelli':'401002158',
  'vercurago':'403097086',
  'verdellino':'403016232',
  'verdello':'403016233',
  'verderio':'403097091',
  'verduno':'401004238',
  'vergato':'408037059',
  'verghereto':'408140050',
  'vergiate':'403012138',
  'vermezzo con zelo':'403015251',
  'vermiglio':'404022213',
  'vernante':'401004239',
  'vernasca':'408033044',
  'vernate':'403015236',
  'vernazza':'407011030',
  'vernio':'409100007',
  'vernole':'416075093',
  'verolanuova':'403017195',
  'verolavecchia':'403017196',
  'verolengo':'401001293',
  'veroli':'412060085',
  'verona':'405023091',
  'veronella':'405023092',
  'verrayes':'402007072',
  'verres':'402007073',
  'verretto':'403018174',
  'verrone':'401096076',
  'verrua po':'403018175',
  'verrua savoia':'401001294',
  'vertemate con minoprio':'403013242',
  'vertova':'403016234',
  'verucchio':'408099020',
  'vervio':'403014076',
  'verzegnis':'406030132',
  'verzino':'418101027',
  'verzuolo':'401004240',
  'vescovana':'405028097',
  'vescovato':'403019113',
  'vesime':'401005113',
  'vespolate':'401003158',
  'vessalico':'407008066',
  'vestenanova':'405023093',
  'vestigne':'401001295',
  'vestone':'403017197',
  'vetralla':'412056057',
  'vetto':'408035042',
  'vezza d alba':'401004241',
  'vezza d oglio':'403017198',
  'vezzano ligure':'407011031',
  'vezzano sul crostolo':'408035043',
  'vezzi portio':'407009067',
  'viadana':'403020066',
  'viadanica':'403016235',
  'viagrande':'419087053',
  'viale d asti':'401005114',
  'vialfre':'401001296',
  'viano':'408035044',
  'viareggio':'409046033',
  'viarigi':'401005115',
  'vibo valentia':'418102047',
  'vibonati':'415065156',
  'vicalvi':'412060086',
  'vicari':'419082078',
  'vicchio':'409048049',
  'vicenza':'405024116',
  'vico del gargano':'416071059',
  'vico equense':'415063086',
  'vico nel lazio':'412060087',
  'vicoforte':'401004242',
  'vicoli':'413068045',
  'vicolungo':'401003159',
  'vicopisano':'409050038',
  'vicovaro':'412058112',
  'viddalba':'420090082',
  'vidigulfo':'403018176',
  'vidor':'405026090',
  'vidracco':'401001298',
  'vieste':'416071060',
  'vietri di potenza':'417076096',
  'vietri sul mare':'415065157',
  'vigano':'403097090',
  'vigano san martino':'403016236',
  'vigarano mainarda':'408038022',
  'vigasio':'405023094',
  'vigevano':'403018177',
  'viggianello':'417076097',
  'viggiano':'417076098',
  'viggiu':'403012139',
  'vigliano biellese':'401096077',
  'vigliano d asti':'401005116',
  'vignale monferrato':'401006179',
  'vignanello':'412056058',
  'vignate':'403015237',
  'vignola':'408036046',
  'vignola-falesina':'404022216',
  'vignole borbera':'401006180',
  'vignolo':'401004243',
  'vignone':'401103074',
  'vigo di cadore':'405025065',
  'vigodarzere':'405028099',
  'vigolo':'403016237',
  'vigolzone':'408033045',
  'vigone':'401001299',
  'vigonovo':'405027043',
  'vigonza':'405028100',
  'viguzzolo':'401006181',
  'villa bartolomea':'405023095',
  'villa basilica':'409046034',
  'villa biscossi':'403018178',
  'villa carcina':'403017199',
  'villa castelli':'416074020',
  'villa celiera':'413068046',
  'villa collemandina':'409046035',
  'villa cortese':'403015248',
  'villa d adda':'403016238',
  'villa d alme':'403016239',
  'villa del bosco':'401096078',
  'villa del conte':'405028101',
  'villa di briano':'415061098',
  'villa di chiavenna':'403014077',
  'villa di serio':'403016240',
  'villa di tirano':'403014078',
  'villa d ogna':'403016241',
  'villa estense':'405028102',
  'villa faraldi':'407008067',
  'villa guardia':'403013245',
  'villa lagarina':'404022222',
  'villa latina':'412060088',
  'villa literno':'415061099',
  'villa minozzo':'408035045',
  'villa san giovanni':'418080096',
  'villa san giovanni in tuscia':'412056046',
  'villa san pietro':'420092099',
  'villa san secondo':'401005119',
  'villa santa lucia':'412060089',
  'villa santa lucia degli abruzzi':'413066104',
  'villa santa maria':'413069102',
  'villa sant angelo':'413066105',
  'villa sant antonio':'420095048',
  'villa santina':'406030133',
  'villa santo stefano':'412060090',
  'villa verde':'420095073',
  'villabassa':'404021113',
  'villabate':'419082079',
  'villachiara':'403017200',
  'villacidro':'420092092',
  'villadeati':'401006182',
  'villadose':'405029048',
  'villadossola':'401103075',
  'villafalletto':'401004244',
  'villafranca d asti':'401005117',
  'villafranca di verona':'405023096',
  'villafranca in lunigiana':'409045016',
  'villafranca padovana':'405028103',
  'villafranca piemonte':'401001300',
  'villafranca sicula':'419084043',
  'villafranca tirrena':'419083105',
  'villafrati':'419082080',
  'villaga':'405024117',
  'villagrande strisaili':'420091101',
  'villalago':'413066103',
  'villalba':'419085022',
  'villalfonsina':'413069100',
  'villalvernia':'401006183',
  'villamagna':'413069101',
  'villamaina':'415064117',
  'villamar':'420092093',
  'villamarzana':'405029049',
  'villamassargia':'420092094',
  'villamiroglio':'401006184',
  'villandro':'404021114',
  'villanova biellese':'401096079',
  'villanova canavese':'401001301',
  'villanova d albenga':'407009068',
  'villanova d ardenghi':'403018179',
  'villanova d asti':'401005118',
  'villanova del battista':'415064118',
  'villanova del ghebbo':'405029050',
  'villanova del sillaro':'403098060',
  'villanova di camposampiero':'405028104',
  'villanova marchesana':'405029051',
  'villanova mondovi':'401004245',
  'villanova monferrato':'401006185',
  'villanova monteleone':'420090078',
  'villanova solaro':'401004246',
  'villanova sull arda':'408033046',
  'villanova truschedu':'420095071',
  'villanova tulo':'420091102',
  'villanovaforru':'420092095',
  'villanovafranca':'420092096',
  'villanterio':'403018180',
  'villanuova sul clisi':'403017201',
  'villaperuccio':'420092104',
  'villapiana':'418078154',
  'villaputzu':'420092097',
  'villar dora':'401001303',
  'villar focchiardo':'401001305',
  'villar pellice':'401001306',
  'villar perosa':'401001307',
  'villar san costanzo':'401004247',
  'villarbasse':'401001302',
  'villarboit':'401002163',
  'villareggia':'401001304',
  'villaricca':'415063087',
  'villaromagnano':'401006186',
  'villarosa':'419086020',
  'villasalto':'420092098',
  'villasanta':'403108049',
  'villasimius':'420092100',
  'villasor':'420092101',
  'villaspeciosa':'420092102',
  'villastellone':'401001308',
  'villata':'401002164',
  'villaurbana':'420095072',
  'villavallelonga':'413066106',
  'villaverla':'405024118',
  'ville d anaunia':'404022249',
  'ville di fiemme':'404022254',
  'villeneuve':'402007074',
  'villesse':'406031025',
  'villetta barrea':'413066107',
  'villette':'401103076',
  'villimpenta':'403020068',
  'villongo':'403016242',
  'villorba':'405026091',
  'vilminore di scalve':'403016243',
  'vimercate':'403108050',
  'vimodrone':'403015242',
  'vinadio':'401004248',
  'vinchiaturo':'414070084',
  'vinchio':'401005120',
  'vinci':'409048050',
  'vinovo':'401001309',
  'vinzaglio':'401003164',
  'viola':'401004249',
  'vione':'403017202',
  'vipiteno':'404021115',
  'virle piemonte':'401001310',
  'visano':'403017203',
  'vische':'401001311',
  'visciano':'415063088',
  'visco':'406030135',
  'visone':'401006187',
  'visso':'411043057',
  'vistarino':'403018181',
  'vistrorio':'401001312',
  'vita':'419081023',
  'viterbo':'412056059',
  'viticuso':'412060091',
  'vito d asio':'406093049',
  'vitorchiano':'412056060',
  'vittoria':'419088012',
  'vittorio veneto':'405026092',
  'vittorito':'413066108',
  'vittuone':'403015243',
  'vitulano':'415062077',
  'vitulazio':'415061100',
  'viu':'401001313',
  'vivaro':'406093050',
  'vivaro romano':'412058113',
  'viverone':'401096080',
  'vizzini':'419087054',
  'vizzola ticino':'403012140',
  'vizzolo predabissi':'403015244',
  'vo':'405028105',
  'vobarno':'403017204',
  'vobbia':'407010066',
  'vocca':'401002166',
  'vodo di cadore':'405025066',
  'voghera':'403018182',
  'voghiera':'408038023',
  'vogogna':'401103077',
  'volano':'404022224',
  'volla':'415063089',
  'volongo':'403019114',
  'volpago del montello':'405026093',
  'volpara':'403018183',
  'volpedo':'401006188',
  'volpeglino':'401006189',
  'volpiano':'401001314',
  'volta mantovana':'403020070',
  'voltaggio':'401006190',
  'voltago agordino':'405025067',
  'volterra':'409050039',
  'voltido':'403019115',
  'volturara appula':'416071061',
  'volturara irpina':'415064119',
  'volturino':'416071062',
  'volvera':'401001315',
  'vottignasco':'401004250',
  'zaccanopoli':'418102048',
  'zafferana etnea':'419087055',
  'zagarise':'418079157',
  'zagarolo':'412058114',
  'zambrone':'418102049',
  'zandobbio':'403016244',
  'zane':'405024119',
  'zanica':'403016245',
  'zapponeta':'416071064',
  'zavattarello':'403018184',
  'zeccone':'403018185',
  'zeddiani':'420095074',
  'zelbio':'403013246',
  'zelo buon persico':'403098061',
  'zeme':'403018186',
  'zenevredo':'403018187',
  'zenson di piave':'405026094',
  'zerba':'408033047',
  'zerbo':'403018188',
  'zerbolo':'403018189',
  'zerfaliu':'420095075',
  'zeri':'409045017',
  'zermeghedo':'405024120',
  'zero branco':'405026095',
  'zevio':'405023097',
  'ziano di fiemme':'404022226',
  'ziano piacentino':'408033048',
  'zibido san giacomo':'403015247',
  'zignago':'407011032',
  'zimella':'405023098',
  'zimone':'401096081',
  'zinasco':'403018190',
  'zoagli':'407010067',
  'zocca':'408036047',
  'zogno':'403016246',
  'zola predosa':'408037060',
  'zollino':'416075094',
  'zone':'403017205',
  'zoppe di cadore':'405025069',
  'zoppola':'406093051',
  'zovencedo':'405024121',
  'zubiena':'401096082',
  'zuccarello':'407009069',
  'zugliano':'405024122',
  'zuglio':'406030136',
  'zumaglia':'401096083',
  'zumpano':'418078155',
  'zungoli':'415064120',
  'zungri':'418102050'
};

function getComuneCodice_(nome) {
  if (!nome) return '         ';  // 9 spazi
  var key = normalizeAlloggiatiKey_(nome);
  if (ALLOGGIATI_COMUNI_[key]) return ALLOGGIATI_COMUNI_[key];
  for (var k in ALLOGGIATI_COMUNI_) {
    if (key === k || key.indexOf(k) >= 0 || k.indexOf(key) >= 0)
      return ALLOGGIATI_COMUNI_[k];
  }
  Logger.log('⚠️ getComuneCodice_: comune non trovato = "' + nome + '" (key normalizzata: "' + key + '")');
  return '         ';  // 9 spazi — comune non trovato
}

// ── Tabella ISTAT province (cifre 3-5 del cod. comune → sigla) ─────
//  Es. '416075091' → posizioni 3-5 = '075' → 'LE'
var ALLOGGIATI_PROVINCE_ = {
  '001':'TO','002':'VC','003':'NO','004':'CN','005':'AT','006':'AL',
  '007':'AO','008':'IM','009':'SV','010':'GE','011':'SP','012':'VA',
  '013':'CO','014':'SO','015':'MI','016':'BG','017':'BS','018':'PV',
  '019':'CR','020':'MN','021':'BZ','022':'TN','023':'VR','024':'VI',
  '025':'BL','026':'TV','027':'VE','028':'PD','029':'RO','030':'UD',
  '031':'GO','032':'TS','033':'PC','034':'PR','035':'RE','036':'MO',
  '037':'BO','038':'FE','039':'RA','040':'FC','041':'PU','042':'AN',
  '043':'MC','044':'AP','045':'MS','046':'LU','047':'PT','048':'FI',
  '049':'LI','050':'PI','051':'AR','052':'SI','053':'GR','054':'PG',
  '055':'TR','056':'VT','057':'RI','058':'RM','059':'LT','060':'FR',
  '061':'CE','062':'BN','063':'NA','064':'AV','065':'SA','066':'AQ',
  '067':'TE','068':'PE','069':'CH','070':'CB','071':'FG','072':'BA',
  '073':'TA','074':'BR','075':'LE','076':'PZ','077':'MT','078':'CS',
  '079':'CZ','080':'RC','081':'TP','082':'PA','083':'ME','084':'AG',
  '085':'CL','086':'EN','087':'CT','088':'RG','089':'SR','090':'SS',
  '091':'NU','092':'CA','093':'OR','094':'IS','095':'PN','096':'KR',
  '097':'VV','098':'BI','099':'RN','100':'PO','103':'VB',
  '104':'LC','105':'LO','141':'PE'
};

function getProvinciaSigla_(istatComuneCode) {
  if (!istatComuneCode || !String(istatComuneCode).trim()) return '  ';
  // Codice 9 cifre (es. 416075091): le cifre 3-5 (0-indexed) sono il cod. provincia
  var prov = String(istatComuneCode).trim().substring(3, 6);
  return ALLOGGIATI_PROVINCE_[prov] || '  ';
}

// ── Costruisce una singola riga schedina (168 chars — Tabella 1) ─────
//  Il separatore CR+LF (2 chars) è aggiunto da buildAlloggiatiText_
//  tramite join('\r\n'), quindi ogni stringa è 168 chars.
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

  // [0-1]  Tipo Alloggiato (2)
  var tipo      = padR(ospite.tipo || '16', 2);
  // [2-11] Data Arrivo (10)
  var arrivo    = fmtDate(dataArrivo || ospite.data_arrivo);
  // [12-13] Numero Giorni Permanenza (2) — max 30
  var giorni    = Math.min(Math.max(parseInt(notti || ospite.notti || 1), 1), 30);
  var giorniStr = padL(String(giorni), 2);
  // [14-63] Cognome (50)
  var cognome   = padR(ospite.cognome, 50);
  // [64-93] Nome (30)
  var nome      = padR(ospite.nome, 30);
  // [94]   Sesso (1)
  var sesso     = String(ospite.sesso || '1').trim().toUpperCase();
  if (sesso === 'M' || sesso === 'MASCHIO' || sesso === 'MALE')   sesso = '1';
  if (sesso === 'F' || sesso === 'FEMMINA' || sesso === 'FEMALE') sesso = '2';
  sesso = sesso.charAt(0);
  // [95-104] Data Nascita (10)
  var nascita   = fmtDate(ospite.data_nascita);

  // [105-113] Comune Nascita (9) e [114-115] Provincia Nascita (2)
  // Obbligatori SOLO se nato in Italia (spec. Alloggiati Web, Tabella 1).
  // Se stato_nascita ≠ Italia → 11 spazi bianchi (9+2).
  var statoNascStr  = String(ospite.stato_nascita || '').trim();
  var cittStr       = String(ospite.cittadinanza  || '').trim();
  var statoNascNorm = normalizeAlloggiatiKey_(statoNascStr);
  var cittNorm      = normalizeAlloggiatiKey_(cittStr);

  // Determina se nato in Italia:
  // - stato esplicito Italia/Italiana/Italiano/Italy → sì
  // - stato vuoto + cittadinanza italiana/vuota → assume Italia (ospiti italiani standard)
  // - stato vuoto + cittadinanza NON italiana → non-Italia (usa citta come proxy per il codice)
  // - stato qualsiasi non-Italia → no
  var isItaliano;
  if (!statoNascStr) {
    var isItaCitt = !cittNorm || cittNorm === 'italiana' || cittNorm === 'italiano' || cittNorm === 'italia';
    isItaliano = isItaCitt;
  } else {
    isItaliano = statoNascNorm === 'italia' || statoNascNorm === 'italiana' ||
                 statoNascNorm === 'italiano' || statoNascNorm === 'italy';
  }

  // Codice ISTAT stato di nascita.
  // Se getStatoCodice_ dà il fallback Italia per stato non riconosciuto,
  // tenta la cittadinanza come proxy per evitare inconsistenze nel record.
  var statoNascCod;
  if (isItaliano) {
    statoNascCod = '100000100';
  } else {
    var sc = getStatoCodice_(statoNascStr);
    if (sc === '100000100' && cittStr &&
        cittNorm !== 'italiana' && cittNorm !== 'italiano' && cittNorm !== 'italia') {
      var sc2 = getStatoCodice_(cittStr);
      if (sc2 !== '100000100') sc = sc2;
    }
    statoNascCod = sc;
  }
  // Comune e Provincia SOLO se nato in Italia (statoNascCod = '100000100').
  // Per qualsiasi altro stato → sempre 9+2 spazi, senza eccezioni.
  var comuneNasc, provinciaNasc;
  if (statoNascCod === '100000100' && ospite.comune_nascita) {
    var codCom = getComuneCodice_(ospite.comune_nascita);
    if (codCom.trim()) {
      comuneNasc    = padR(codCom, 9);
      provinciaNasc = padR(getProvinciaSigla_(codCom), 2);
    } else {
      Logger.log('⚠️ Comune nascita non trovato per "' + ospite.comune_nascita + '" — schedina potrebbe essere rifiutata');
      comuneNasc    = padR('', 9);
      provinciaNasc = padR('', 2);
    }
  } else {
    comuneNasc    = padR('', 9);  // estero o comune non richiesto
    provinciaNasc = padR('', 2);
  }
  // [116-124] Stato Nascita (9)
  var statoNasc = padR(statoNascCod, 9);
  // [125-133] Cittadinanza (9)
  var citt      = padR(getStatoCodice_(ospite.cittadinanza || 'Italiana'), 9);
  // [134-138] Tipo Documento (5) — richiesto anche per FAMILIARE (tipo 18)
  // [139-158] Numero Documento (20) — blank per tipo 18
  // [159-167] Luogo Rilascio Documento (9) — blank se numero non presente
  var hasTipoDoc = (ospite.tipo_doc && String(ospite.tipo_doc).trim());
  var hasNumDoc  = (ospite.num_doc  && String(ospite.num_doc).trim());

  var row = tipo + arrivo + giorniStr + cognome + nome + sesso + nascita +
            comuneNasc + provinciaNasc + statoNasc + citt;

  if (hasTipoDoc) {
    // Tipo 16/17: documento obbligatorio — aggiunge i 34 campi doc (pos. 134-167)
    var tipoDoc = padR(getDocCodice_(ospite.tipo_doc), 5);
    var numDoc  = padR(ospite.num_doc, 20);
    var luogoRil;
    if (!hasNumDoc) {
      luogoRil = padR('', 9);
    } else {
      var isItalRil = (getStatoCodice_(ospite.stato_rilascio || 'Italia') === '100000100');
      if (isItalRil && ospite.comune_rilascio) {
        luogoRil = padR(getComuneCodice_(ospite.comune_rilascio), 9);
      } else {
        luogoRil = padR(getStatoCodice_(ospite.stato_rilascio || 'Italia'), 9);
      }
    }
    row += tipoDoc + numDoc + luogoRil;
  } else {
    // Tipo 19/20 (FAMILIARE/MEMBRO GRUPPO): 34 blank per i campi documento
    row += padR('', 34);
  }

  var expectedLen = 168;
  if (row.length !== expectedLen) {
    Logger.log('ATTENZIONE: riga schedina lunghezza ' + row.length + ' (attesa ' + expectedLen + ')');
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
      trip_type:      String(r[8]  || '').trim(),
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

  var hasGuests = (checkinData.guests && checkinData.guests.length > 0);

  // Determina il tipo alloggiato in base al tipo soggiorno:
  //   16 = ospite singolo (nessun accompagnatore)
  //   17 = capo famiglia / coppia  +  19 = familiare/membro nucleo
  //   18 = capo gruppo (amici)     +  20 = membro gruppo
  var tripNorm = (checkinData.trip_type || '').toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  var isGruppo  = /amici|gruppo|group|friend/.test(tripNorm);
  var isFamilia = /famig|coppia|couple|family|partner/.test(tripNorm);

  var tipoCapo, tipoAccomp;
  if (!hasGuests) {
    tipoCapo   = '16';  // ospite singolo
    tipoAccomp = '16';  // non usato
  } else if (isGruppo) {
    tipoCapo   = '18';  // capo gruppo
    tipoAccomp = '20';  // membro gruppo
  } else {
    // famiglia / coppia (default quando ci sono accompagnatori)
    tipoCapo   = '17';  // capo famiglia
    tipoAccomp = '19';  // familiare/membro nucleo
  }
  lines.push(buildSchedinRow_({
    tipo:           tipoCapo,
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

  // Accompagnatori: tipo dipende dal gruppo (19 = familiare, 20 = membro gruppo)
  //  Campi documento sempre blank (pos. 134-167 = 34 spazi).
  (checkinData.guests || []).forEach(function(g) {
    lines.push(buildSchedinRow_({
      tipo:           tipoAccomp,
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

// ── Azione GET: alloggiati-validate ─────────────────────────────────
//  Valida una schedina tramite SOAP Test senza inviarla.
function doGetAlloggiatiValidate_(e) {
  try {
    var key = (e && e.parameter && e.parameter.key) ? decodeURIComponent(e.parameter.key) : '';
    if (!key) throw new Error('Parametro "key" mancante');

    var due = getAlloggiatiDue_();
    var found = null;
    for (var i = 0; i < due.length; i++) {
      if (due[i].key === key) { found = due[i]; break; }
    }
    if (!found) throw new Error('Check-in non trovato per la chiave specificata');

    var cfg = getAlloggiatiConfig_();
    if (!cfg.user || !cfg.wsKey) throw new Error('Credenziali Alloggiati non configurate');

    var auth  = alloggiatiAuthenticate_(cfg);
    var testo = buildAlloggiatiText_(found);
    var rows  = testo.split('\r\n');
    var result = alloggiatiSoapTest_(cfg.user, auth.token, rows);

    // Estrai esito generale
    var genM    = result.xml.match(/<TestResult>[\s\S]*?<esito>(true|false)<\/esito>/i);
    var genEsito = genM ? genM[1].toLowerCase() === 'true' : false;
    var valideM  = result.xml.match(/<SchedineValide>(\d+)<\/SchedineValide>/i);
    var valide   = valideM ? parseInt(valideM[1]) : 0;

    // Estrai esito per riga
    var righe  = [];
    var re     = /<EsitoOperazioneServizio>([\s\S]*?)<\/EsitoOperazioneServizio>/gi;
    var m;
    while ((m = re.exec(result.xml)) !== null) {
      var ch  = m[1];
      var ok  = (ch.match(/<esito>(true|false)<\/esito>/i) || [])[1] || '?';
      var cod = (ch.match(/<ErroreCod>([^<]+)<\/ErroreCod>/i) || [])[1] || '';
      var des = (ch.match(/<ErroreDes>([^<]+)<\/ErroreDes>/i) || [])[1] || '';
      var det = (ch.match(/<ErroreDettaglio>([^<]+)<\/ErroreDettaglio>/i) || [])[1] || '';
      righe.push({ ok: ok === 'true', cod: cod, des: des, det: det });
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        status:   'ok',
        genEsito: genEsito,
        valide:   valide,
        totale:   rows.length,
        righe:    righe
      }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
  var xml   = resp.xml;

  // Esito generale (SendResult)
  var esitoMatch = xml.match(/<SendResult>([\s\S]*?)<\/SendResult>/i);
  var esitoBlock = esitoMatch ? esitoMatch[1] : '';
  var esito      = (esitoBlock.match(/<esito>(true|false)<\/esito>/i) || [])[1];
  var sendOk     = esito && esito.toLowerCase() === 'true';

  if (!sendOk) {
    var errDes = (esitoBlock.match(/<ErroreDes>([^<]+)<\/ErroreDes>/i)       || [])[1] || '';
    var errDet = (esitoBlock.match(/<ErroreDettaglio>([^<]+)<\/ErroreDettaglio>/i) || [])[1] || '';
    var errMsg = (errDes || 'Invio fallito') + (errDet ? ' — ' + errDet : '');
    // Fallback al testo XML grezzo se non c'è errore parsato
    if (!errDes) errMsg = 'Invio fallito. Risposta: ' + xml.substring(0, 400);
    logAlloggiatiSend_(found, 'ERRORE', '', errMsg);
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', error: errMsg }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Numero schedine valide (usato come ricevuta)
  var valideMatch = xml.match(/<SchedineValide>(\d+)<\/SchedineValide>/i);
  var numRicevuta = valideMatch ? valideMatch[1] : '';

  logAlloggiatiSend_(found, 'OK', numRicevuta, '');

  // Notifica email invio schedina
  try {
    GmailApp.sendEmail(
      NOTIFICATION_EMAIL,
      'Casa Paolina — Schedina Questura inviata ✓',
      'Invio schedina Alloggiati Web completato con successo.\n\n' +
      'Ospite: ' + (found.nome + ' ' + found.cognome).trim() + '\n' +
      'Appartamento: ' + (found.appartamento || '-') + '\n' +
      'Data arrivo: ' + (found.data_arrivo || '-') + '\n' +
      'Notti: ' + (found.notti || '-') + '\n' +
      (resp.NumRicevuta ? 'N\u00b0 ricevuta: ' + resp.NumRicevuta + '\n' : '') +
      '\nInvio effettuato tramite il pannello amministratore Casa Paolina.'
    );
  } catch (mailErr) {
    Logger.log('Avviso: invio mail conferma schedina fallito: ' + mailErr.toString());
  }
  return ContentService
    .createTextOutput(JSON.stringify({
      status:   'ok',
      ricevuta: numRicevuta,
      message:  'Schedina inviata con successo'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}


// ── Azione POST: alloggiati-send-simulate ───────────────────────────
//  Simula l'invio: costruisce la schedina, logga come "SIMULATO",
//  manda email di notifica ma NON chiama il SOAP Alloggiati Web.
function doPostAlloggiatiSendSimulate_(data) {
  var key = data.key;
  if (!key) throw new Error('Chiave check-in mancante');

  var due   = getAlloggiatiDue_();
  var found = null;
  for (var i = 0; i < due.length; i++) {
    if (due[i].key === key) { found = due[i]; break; }
  }
  if (!found) throw new Error('Check-in non trovato');

  var testo = buildAlloggiatiText_(found);
  var righe = testo.split('\r\n');

  // Logga come SIMULATO nel foglio AlloggiatiLog
  logAlloggiatiSend_(found, 'SIMULATO', 'SIM-' + new Date().getTime(), 'Invio simulato — SOAP non chiamato');

  // Email di notifica
  try {
    GmailApp.sendEmail(
      NOTIFICATION_EMAIL,
      'Casa Paolina — Schedina Questura [SIMULATA] ✓',
      'SIMULAZIONE invio schedina Alloggiati Web.\n\n' +
      'Ospite: ' + (found.nome + ' ' + found.cognome).trim() + '\n' +
      'Appartamento: ' + (found.appartamento || '-') + '\n' +
      'Data arrivo: ' + (found.data_arrivo || '-') + '\n' +
      'Notti: ' + (found.notti || '-') + '\n' +
      '\n--- TESTO SCHEDINA (' + righe.length + ' righe) ---\n' +
      righe.join('\n') + '\n\n' +
      '⚠️ ATTENZIONE: questa è una simulazione. Il SOAP NON è stato chiamato.\n' +
      'Abilita l\'invio reale rimuovendo la simulazione dalla dashboard.'
    );
  } catch (mailErr) {
    Logger.log('Avviso: invio mail simulazione schedina fallito: ' + mailErr.toString());
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      status:   'ok',
      ricevuta: '',
      message:  '[SIMULATO] Schedina elaborata correttamente. Email di notifica inviata.',
      righe:    righe.length
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Setup: configura le Script Properties ───────────────────────
//  Modifica i valori qui sotto, poi esegui "setupAlloggiatiProperties".
function setupAlloggiatiProperties() {
  // ⚠️ COMPILARE prima di eseguire:
  var USER           = '';  // es. 'casapaolina'
  var PWD            = '';  // password del portale
  var WSKEY          = '';  // WsKey fornita dalla questura
  var ID_STRUTTURA   = '';  // IdStruttura numerico
  var ID_APPARTAMENTO = ''; // IdAppartamento (es. '4') — solo per Gestione Appartamenti

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
  if (ID_APPARTAMENTO) props.setProperty('ALLOGGIATI_IDAPPARTAMENTO', ID_APPARTAMENTO);

  SpreadsheetApp.getUi().alert('✅ Credenziali Alloggiati Web salvate nelle Script Properties.');
}




var ALLOGGIATI_SOAP_URL_ = 'https://alloggiatiweb.poliziadistato.it/service/service.asmx';



// ── Schedina fittizia per test (Mario Rossi, formato corretto 168 chars) ─
function buildAlloggiatiTestRow_() {
  var today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return buildSchedinRow_({
    tipo:            '16',
    cognome:         'ROSSI',
    nome:            'MARIO',
    sesso:           'M',
    data_nascita:    '1980-03-10',
    stato_nascita:   'Italia',
    comune_nascita:  'Roma',
    cittadinanza:    'Italiana',
    tipo_doc:        "Carta d'Identita",
    num_doc:         'AA1234567',
    stato_rilascio:  'Italia',
    comune_rilascio: 'Roma'
  }, today, 1);
}

// ── Escape caratteri speciali XML ────────────────────────────────
function xmlEscape_(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}





// ── TEST SCHEDINE
//
//  Controlla la correttezza delle schedine SENZA inviarle.
//  Usa le stesse credenziali già configurate (nessuna proprietà
//  aggiuntiva necessaria).
//
//  Seleziona "testAlloggiatiSchedine" e clicca ▶ Esegui.
//  Il log mostrerà:
//    - esito generale (true/false)
//    - per ogni riga: OK oppure codice errore + descrizione
// ════════════════════════════════════════════════════════════════
function testAlloggiatiSchedine() {
  Logger.log('=== TEST schedine (metodo SOAP "Test") ===');

  // 1) Credenziali
  var cfg = getAlloggiatiConfig_();
  Logger.log('Utente:       ' + (cfg.user  || '[MANCANTE]'));
  Logger.log('WsKey:        ' + (cfg.wsKey ? '[impostata]' : '[MANCANTE]'));

  if (!cfg.user || !cfg.pwd || !cfg.wsKey) {
    Logger.log('❌ Credenziali incomplete. Verifica le Script Properties e riprova.');
    return;
  }

  // 2) Autenticazione
  Logger.log('');
  Logger.log('1) Autenticazione...');
  var auth;
  try {
    auth = alloggiatiAuthenticate_(cfg);
    Logger.log('   ✅ Token: ' + auth.token.substring(0, 24) + '...');
  } catch (err) {
    Logger.log('   ❌ Fallita: ' + err.toString());
    return;
  }

  // 3) Dati reali: ultima prenotazione pendente
  Logger.log('');
  Logger.log('2) Recupero ultima prenotazione pendente...');
  var due = getAlloggiatiDue_();
  var schedineRows;
  var descrizione;

  if (due.length > 0) {
    // Usa l'ultima prenotazione (quella più recente in coda)
    var checkin = due[due.length - 1];
    descrizione = checkin.nome + ' ' + checkin.cognome +
                  ' · ' + checkin.data_arrivo +
                  ' · ' + checkin.appartamento;
    Logger.log('   Prenotazione: ' + descrizione);
    Logger.log('   Notti: ' + checkin.notti + ' | Adulti: ' + checkin.adulti + ' | Accompagnatori: ' + checkin.guests.length);

    var testoSchedina = buildAlloggiatiText_(checkin);
    schedineRows = testoSchedina.split('\r\n');
    // Log dei valori raw dei comuni per diagnostica
    Logger.log('   Dati comuni referente: comune_nasc="' + checkin.comune_nascita + '" stato_nasc="' + checkin.stato_nascita + '"');
    (checkin.guests || []).forEach(function(g, gi) {
      Logger.log('   Acc.' + (gi+1) + ' comune_nasc="' + g.comune_nascita + '" stato_nasc="' + g.stato_nascita + '"');
    });
  } else {
    Logger.log('   Nessuna prenotazione pendente — uso dati fittizi.');
    schedineRows = [buildAlloggiatiTestRow_()];
    descrizione = 'DATI FITTIZI (Mario Rossi)';
  }

  // 4) Log di ogni riga con lunghezza e dettaglio campi chiave
  Logger.log('');
  Logger.log('3) Schedine da inviare (' + schedineRows.length + ' riga/e):');
  schedineRows.forEach(function(r, i) {
    Logger.log('   Riga ' + (i+1) + ' (' + r.length + ' chars): ' + r);
    // Sempre: mostra campi chiave per diagnostica
    Logger.log('      tipo:       "' + r.substring(0,2)    + '"');
    Logger.log('      arrivo:     "' + r.substring(2,12)   + '"');
    Logger.log('      giorni:     "' + r.substring(12,14)  + '"');
    Logger.log('      cognome:    "' + r.substring(14,64).trim() + '"');
    Logger.log('      nome:       "' + r.substring(64,94).trim() + '"');
    Logger.log('      sesso:      "' + r.substring(94,95)  + '"');
    Logger.log('      nascita:    "' + r.substring(95,105) + '"');
    Logger.log('      comuneNasc: "' + r.substring(105,114)+ '"  ← deve essere 9 cifre se italiano');
    Logger.log('      provNasc:   "' + r.substring(114,116)+ '"  ← 2 lettere sigla provincia');
    Logger.log('      statoNasc:  "' + r.substring(116,125)+ '"');
    Logger.log('      citt:       "' + r.substring(125,134)+ '"');
    Logger.log('      tipoDoc:    "' + r.substring(134,139)+ '"');
    Logger.log('      numDoc:     "' + r.substring(139,159).trim() + '"');
    Logger.log('      luogoRil:   "' + r.substring(159,168)+ '"');
    if (r.length !== 168) {
      Logger.log('   ⚠️ LUNGHEZZA ERRATA: attesa 168, trovata ' + r.length);
    }
  });

  // 5) Chiamata SOAP Test
  Logger.log('');
  Logger.log('4) Invio chiamata SOAP "Test"...');
  try {
    var result = alloggiatiSoapTest_(cfg.user, auth.token, schedineRows);
    Logger.log('   HTTP status: ' + result.statusCode);
    Logger.log('');
    Logger.log('5) Risposta XML:');
    Logger.log(result.xml);
    Logger.log('');
    Logger.log('6) Analisi risposta:');
    alloggiatiLogSoapTestResult_(result.xml);
  } catch (err) {
    Logger.log('   ❌ Errore chiamata SOAP: ' + err.toString());
  }
}

// ── Chiamata SOAP "Test" (validazione schedine, no invio) ────────
function alloggiatiSoapTest_(utente, token, schedine) {
  // xml:space="preserve" è fondamentale: impedisce al parser XML di rimuovere
  // gli spazi finali della schedina (34 blank per tipo 18 = pos. 134-167).
  var schedineTags = schedine.map(function(s) {
    return '<all:string xml:space="preserve">' + xmlEscape_(s) + '</all:string>';
  }).join('');

  var envelope =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<soap:Envelope' +
      ' xmlns:soap="http://www.w3.org/2003/05/soap-envelope"' +
      ' xmlns:all="AlloggiatiService">' +
      '<soap:Header/>' +
      '<soap:Body>' +
        '<all:Test>' +
          '<all:Utente>'         + xmlEscape_(utente) + '</all:Utente>' +
          '<all:token>'          + xmlEscape_(token)  + '</all:token>' +
          '<all:ElencoSchedine>' + schedineTags        + '</all:ElencoSchedine>' +
        '</all:Test>' +
      '</soap:Body>' +
    '</soap:Envelope>';

  var resp = UrlFetchApp.fetch(ALLOGGIATI_SOAP_URL_, {
    method:      'post',
    contentType: 'application/soap+xml; charset=utf-8',
    payload:     envelope,
    muteHttpExceptions: true,
    headers: { 'SOAPAction': 'AlloggiatiService/Test' }
  });

  return {
    statusCode: resp.getResponseCode(),
    xml:        resp.getContentText('UTF-8')
  };
}

// ── Estrae e logga l'esito della risposta XML "Test" ─────────────
function alloggiatiLogSoapTestResult_(xml) {
  // Esito generale
  var genEsito = xml.match(/<TestResult>[\s\S]*?<esito>(true|false)<\/esito>/i);
  if (genEsito) {
    Logger.log('Esito generale: ' + (genEsito[1].toLowerCase() === 'true' ? '✅ OK' : '❌ ERRORE'));
  }
  var genErrDes = xml.match(/<TestResult>[\s\S]*?<ErroreDes>([^<]+)<\/ErroreDes>/i);
  if (genErrDes && genErrDes[1]) Logger.log('Errore generale: ' + genErrDes[1]);

  // Conta schedine valide
  var valide = xml.match(/<SchedineValide>(\d+)<\/SchedineValide>/i);
  if (valide) Logger.log('SchedineValide: ' + valide[1]);

  // Esito per ogni riga (EsitoOperazioneServizio)
  var righeRe = /<EsitoOperazioneServizio>([\s\S]*?)<\/EsitoOperazioneServizio>/gi;
  var match;
  var idx = 0;
  while ((match = righeRe.exec(xml)) !== null) {
    idx++;
    var chunk  = match[1];
    var esito  = (chunk.match(/<esito>(true|false)<\/esito>/i)  || [])[1] || '?';
    var cod    = (chunk.match(/<ErroreCod>([^<]+)<\/ErroreCod>/i) || [])[1] || '';
    var des    = (chunk.match(/<ErroreDes>([^<]+)<\/ErroreDes>/i) || [])[1] || '';
    var det    = (chunk.match(/<ErroreDettaglio>([^<]+)<\/ErroreDettaglio>/i) || [])[1] || '';
    var stato  = esito.toLowerCase() === 'true' ? '✅' : '❌';
    var errPart = cod ? ' | cod ' + cod + ': ' + des + (det ? ' — ' + det : '') : '';
    Logger.log('  Riga ' + idx + ': ' + stato + errPart);
  }
}