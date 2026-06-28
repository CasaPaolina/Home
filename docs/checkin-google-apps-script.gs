var NOTIFICATION_EMAIL = 'casapaolina23@gmail.com';

var PORTAFOGLIO_SHEET = 'Portafoglio';
var APARTMENT_MAP = { '15A': 'celeste', '1': 'suite', '15': 'verde' };
var CHANNEL_MAP   = { 'B': 'Booking.com', 'A': 'Airbnb' };
var PLATFORM_MAP  = { 'B': 'booking', 'P': 'privato', 'A': 'airbnb' };
var INCLUDE_CHANNEL_COLUMN = false;
var MESI_IT = {
  gennaio:0, febbraio:1, marzo:2, aprile:3, maggio:4, giugno:5,
  luglio:6, agosto:7, settembre:8, ottobre:9, novembre:10, dicembre:11
};
var MESI_ABBR = {
  gen:0, feb:1, mar:2, apr:3, mag:4, giu:5,
  lug:6, ago:7, set:8, ott:9, nov:10, dic:11
};

var CALENDAR_APARTMENT_MAP = {
  '15':  'verde',
  '15A': 'celeste',
  '17':  'suite'
};
var CALENDAR_MONTHS_AHEAD = 12;


function setup() {
  var cals = CalendarApp.getAllCalendars();
  Logger.log('Calendari trovati: ' + cals.length);

  GmailApp.sendEmail(
    NOTIFICATION_EMAIL,
    'Casa Paolina - Sistema notifiche attivo',
    'Autorizzazione Gmail + Calendar completata.\n\n' +
    'Il sistema di notifica check-in e\' pronto.\n' +
    'Ora fai il Deploy della Web App.'
  );
  SpreadsheetApp.getUi().alert(
    'Autorizzazione completata!\n\n' +
    'Hai ricevuto una mail di conferma a:\n' + NOTIFICATION_EMAIL + '\n\n' +
    'Ora esegui il Deploy della Web App.'
  );
}


function doPost(e) {
  try {
    var raw  = (e.parameter && e.parameter.data) ? e.parameter.data : e.postData.contents;
    var data = JSON.parse(raw);
    var ss   = SpreadsheetApp.getActiveSpreadsheet();

    var sheet = ss.getSheetByName('Prenotazioni') || ss.insertSheet('Prenotazioni');
    if (sheet.getLastRow() === 0) creaIntestazioni(sheet);
    sheet.appendRow(buildMainRow(data));

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

    try {
      inviaEmail_(data, ss.getUrl());
    } catch (mailErr) {
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

  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Casa Paolina Check-in API' }))
    .setMimeType(ContentService.MimeType.JSON);
}


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

    var lastMatch = null;
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowNome = String(row[10] || '').trim();
      var rowCognome = String(row[11] || '').trim();
      if (rowNome.toLowerCase() === nome.toLowerCase() && rowCognome.toLowerCase() === cognome.toLowerCase()) {
        lastMatch = row;
      }
    }

    if (lastMatch) {
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
              data_nascita: guestData[i][8] || '',
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
            data_arrivo: lastMatch[2],
            data_partenza: lastMatch[3],
            notti: lastMatch[4],
            adulti: lastMatch[5],
            bambini: lastMatch[6],
            totale_ospiti: lastMatch[7],
            tipo_soggiorno: lastMatch[8],
            ora_arrivo: lastMatch[9],
            nome: lastMatch[10],
            cognome: lastMatch[11],
            sesso: lastMatch[12],
            data_nascita: lastMatch[13],
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
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Prenotazioni');
  var existing = {};

  if (!sheet) return existing;

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return existing;

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

    var data = sheet.getDataRange().getValues();
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

    var existingCheckIns = getExistingCheckIns_();

    var bookings = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
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
  var s = String(val).trim();
  var parts = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (parts) return parts[3] + '-' + parts[2].padStart(2,'0') + '-' + parts[1].padStart(2,'0');
  return s;
}


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
  var docRilCom = data.r_doc_rilascio_comune    || '-';
  var email     = data.r_email             || '-';
  var telefono  = data.r_telefono          || '-';
  var note      = data.note               || '';
  var ricevuto  = data.timestamp
                    ? new Date(data.timestamp).toLocaleString('it-IT')
                    : new Date().toLocaleString('it-IT');
  var ospiti    = data.guests || [];

  var subject = 'Casa Paolina - Nuovo Check-in: ' + nome +
                ' > ' + appart + ' (' + arrivo + ' / ' + partenza + ')';

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


function buildMainRow(d) {
  var totOspiti = (parseInt(d.adults_count) || 0) + (parseInt(d.children_count) || 0);
  return [
    new Date(d.timestamp),            // A: Data/ora ricezione
    d.appartamento,                   // B: Appartamento
    d.checkin_date,                   // C: Data arrivo
    d.checkout_date,                  // D: Data partenza
    d.permanenza_notti,               // E: Notti
    d.adults_count,                   // F: N. adulti
    d.children_count,                 // G: N. bambini
    totOspiti,                        // H: Totale ospiti
    d.trip_type,                      // I: Tipo soggiorno
    d.ora_arrivo,                     // J: Ora arrivo prevista
    d.r_nome,                         // K: Nome
    d.r_cognome,                      // L: Cognome
    d.r_sesso,                        // M: Sesso
    d.r_nascita_data,                 // N: Data di nascita
    d.r_nascita_comune   || null,     // O: Comune di nascita
    d.r_nascita_stato    || null,     // P: Stato di nascita
    d.r_cittadinanza     || null,     // Q: Cittadinanza
    d.r_comune           || null,     // R: Comune di residenza
    d.r_paese            || null,     // S: Paese di residenza
    d.r_doc_tipo         || null,     // T: Tipo documento
    d.r_doc_numero       || null,     // U: Numero documento
    d.r_doc_rilascio_stato  || null,  // V: Stato rilascio
    d.r_doc_rilascio_comune || null,  // W: Comune rilascio
    d.r_email,                        // X: Email
    d.r_telefono,                     // Y: Telefono
    d.guests_count,                   // Z: N. accompagnatori
    d.note                            // AA: Note
  ];
}


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


function aggiornaIntestazioni() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

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
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    var lastCol = sheet.getLastColumn();
    if (lastCol > headers.length) {
      sheet.deleteColumns(headers.length + 1, lastCol - headers.length);
    }
    var r = sheet.getRange(1, 1, 1, headers.length);
    r.setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
    Logger.log('Intestazioni Prenotazioni aggiornate: ' + headers.length + ' colonne.');
  } else {
    Logger.log('Foglio "Prenotazioni" non trovato.');
  }

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

function countPersone_(line) {
  var m = String(line).match(/👤/g);
  return m ? m.length : 0;
}

function splitCamelCase_(s) {
  if (!s) return s;
  return String(s).replace(/([a-zà-ÿ])([A-ZÀ-Þ])/g, '$1 $2');
}

function mapAppartamento_(line) {
  var code = String(line || '').trim().toUpperCase().replace(/\s+/g, '');
  return APARTMENT_MAP[code] || null;
}

function parseDateRange_(line) {
  if (!line) return null;
  var s = String(line).replace(/\s+/g, ' ').trim();

  s = s.replace(/\s*[–—→]\s*/g, '|')
       .replace(/\s+-\s+/g, '|')
       .replace(/(\d)\s*-\s*(?=\d)/g, '$1|')
       .replace(/\s+(?:al|a)\s+/gi, '|');

  var parts = s.split('|');
  if (parts.length < 2) return null;

  var left  = parseDateToken_(parts[0]);
  var right = parseDateToken_(parts[parts.length - 1]);
  if (!left || !right) return null;

  if (left.month === null)  left.month  = right.month;
  if (right.month === null) right.month = left.month;
  if (left.month === null || right.month === null) return null;

  var endYear   = right.year;
  var startYear = left.year;
  if (endYear === null)   endYear   = (startYear !== null) ? startYear : new Date().getFullYear();
  if (startYear === null) {
    startYear = endYear;
    if (left.month > right.month) startYear = endYear - 1;
  }

  var start = new Date(startYear, left.month, left.day);
  var end   = new Date(endYear, right.month, right.day);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  return { start: start, end: end };
}

function resolveMese_(name) {
  if (name == null) return undefined;
  var key = String(name).toLowerCase().replace(/\./g, '').trim();
  if (MESI_IT[key] !== undefined) return MESI_IT[key];
  var abbr = key.slice(0, 3);
  if (MESI_ABBR[abbr] !== undefined) return MESI_ABBR[abbr];
  return undefined;
}

function parseDateToken_(token) {
  if (!token) return null;
  token = String(token).trim();
  if (!token) return null;

  var slash = token.match(/^(\d{1,2})[\/\.](\d{1,2})(?:[\/\.](\d{2,4}))?$/);
  if (slash) {
    var yr = slash[3] ? parseInt(slash[3], 10) : null;
    if (yr !== null && yr < 100) yr += 2000;
    return { day: parseInt(slash[1], 10), month: parseInt(slash[2], 10) - 1, year: yr };
  }

  var dm = token.match(/^(\d{1,2})[\s\-]+([A-Za-zÀ-ù]+)\.?(?:[\s\-]+(\d{4}))?$/);
  if (dm) {
    var m = resolveMese_(dm[2]);
    if (m === undefined) return null;
    return { day: parseInt(dm[1], 10), month: m, year: dm[3] ? parseInt(dm[3], 10) : null };
  }

  var d = token.match(/^(\d{1,2})$/);
  if (d) return { day: parseInt(d[1], 10), month: null, year: null };

  return null;
}

function buildPortafoglioRow_(rec) {
  var row = [
    rec.checkIn,
    rec.checkOut,
    rec.appartamento,
    rec.nome,
    rec.cognome,
    rec.persone
  ];
  if (INCLUDE_CHANNEL_COLUMN) row.push(rec.canale);
  return row;
}

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
  ensureEventIdColumn_(sheet, cols);
  var index = getBookingIndex_(sheet, cols);

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
        if (rec.eventId) seenEventIds[rec.eventId] = true;
        if (rec.error) { errors.push({ raw: rec.raw, error: rec.error }); return; }

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

  var toDelete = [];
  index.managed.forEach(function(m) {
    if (seenEventIds[m.eventId]) return;
    if (!m.ciTime) return;
    if (m.ciTime < start.getTime()) return;
    if (m.ciTime > end.getTime())  return;
    toDelete.push(m);
  });
  toDelete.sort(function(a, b) { return b.row - a.row; });
  toDelete.forEach(function(m) {
    cancelled.push({ nome: m.nome, cognome: m.cogn, appartamento: m.apt, checkIn: m.ciStr });
    sheet.deleteRow(m.row);
  });

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

function parseCalendarEvent_(ev, calApt) {
  var title = ev.getTitle ? (ev.getTitle() || '') : '';
  var descr = ev.getDescription ? (ev.getDescription() || '') : '';
  var text  = (title + '\n' + descr).trim();
  var rec   = { raw: title, appartamento: calApt || '' };

  rec.persone = (text.match(/👤/g) || []).length;

  var nameMatch = text.match(/\(([^)]+)\)/);
  if (nameMatch) {
    var parts = nameMatch[1].trim().split(/\s+/);
    rec.nome = splitCamelCase_(parts.shift() || '');
    rec.cognome = splitCamelCase_(parts.join(' '));
    if (!rec.persone) rec.persone = 1;

    var after = text.slice(text.indexOf(nameMatch[0]) + nameMatch[0].length);
    var chM = after.match(/^\s*([A-Za-z]+)/);
    rec.canaleCode = chM ? chM[1].toUpperCase() : '';
    rec.canale = CHANNEL_MAP[rec.canaleCode] || rec.canaleCode || '';
    rec.piattaforma = PLATFORM_MAP[rec.canaleCode.charAt(0)] || '';
  } else {
    rec.nome = '';
    rec.cognome = '';
  }

  if (ev.getStartTime) {
    rec.checkIn  = stripTime_(ev.getStartTime());
    rec.checkOut = stripTime_(ev.getEndTime());
  } else {
    var dates = parseDateRange_(text.replace(/\n/g, ' '));
    if (dates) {
      rec.checkIn  = stripTime_(dates.start);
      rec.checkOut = stripTime_(dates.end);
    }
  }

  if (rec.checkIn && rec.checkOut && rec.checkOut.getTime() <= rec.checkIn.getTime()) {
    rec.checkOut = new Date(rec.checkIn.getTime() + 86400000);
  }

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

function ensureEventIdColumn_(sheet, cols) {
  if (cols.evid >= 0) return cols.evid;
  var newColIdx0 = cols.width;
  sheet.getRange(1, cols.width + 1).setValue('EventId')
    .setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
  cols.width = cols.width + 1;
  cols.evid  = newColIdx0;
  return cols.evid;
}

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

  if (cols.evid >= 0) {
    var newEv = rec.eventId || row[cols.evid] || '';
    if (!bookingValuesEqual_(row[cols.evid], newEv)) { row[cols.evid] = newEv; anyChange = true; }
  }

  if (anyChange) range.setValues([row]);
  return dataChanged;
}

function bookingValuesEqual_(a, b) {
  if (a instanceof Date || b instanceof Date) {
    var da = (a instanceof Date) ? stripTime_(a) : (a ? new Date(formatSheetDate_(a)) : null);
    var db = (b instanceof Date) ? stripTime_(b) : (b ? new Date(formatSheetDate_(b)) : null);
    if (!da || !db || isNaN(da.getTime()) || isNaN(db.getTime())) return false;
    return da.getTime() === db.getTime();
  }
  return String(a == null ? '' : a).trim() === String(b == null ? '' : b).trim();
}

function sortBookingByCheckin_(sheet, cols) {
  if (cols.cin < 0) return;
  var last = sheet.getLastRow();
  if (last < 3) return;
  var range = sheet.getRange(2, 1, last - 1, cols.width);
  var rows = range.getValues();

  function ciTime_(r) {
    var v = r[cols.cin];
    var t = (v instanceof Date) ? stripTime_(v).getTime()
          : (v ? new Date(formatSheetDate_(v)).getTime() : NaN);
    return isNaN(t) ? Infinity : t;
  }

  rows.sort(function(a, b) { return ciTime_(a) - ciTime_(b); });
  range.setValues(rows);
}

function creaIntestazioniBooking_(sheet) {
  var headers = ['CHECK-IN', 'CHECK-OUT', 'Appartamento', 'Nome', 'Cognome', 'N° Ospiti', 'Piattaforma', 'EventId'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
  sheet.getRange(1, headers.length + 1, 1, 8).setBackground('#d9e8e6');
  sheet.setFrozenRows(1);
}

function aggiornaIntestazioniBooking() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getBookingSheet_(ss);
  if (!sheet) { SpreadsheetApp.getUi().alert('Foglio "Booking" non trovato.'); return; }

  var cols = getBookingColumns_(sheet);

  if (cols.piat < 0) {
    var afterCol = (cols.n >= 0) ? cols.n + 1 : sheet.getLastColumn();
    sheet.insertColumnAfter(afterCol);
    sheet.getRange(1, afterCol + 1).setValue('Piattaforma')
      .setFontWeight('bold').setBackground('#2c7873').setFontColor('#ffffff').setFontSize(10);
    cols = getBookingColumns_(sheet);
  }

  ensureEventIdColumn_(sheet, cols);
  cols = getBookingColumns_(sheet);

  var startReserved = sheet.getLastColumn() + 1;
  sheet.getRange(1, startReserved, 1, 8).setBackground('#d9e8e6');

  SpreadsheetApp.getUi().alert(
    'Foglio Booking aggiornato.\n\n' +
    'Aggiunta la colonna "Piattaforma" e riservate 8 colonne vuote.\n' +
    'Premi "Aggiorna" nella dashboard per popolare la Piattaforma.'
  );
}


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
