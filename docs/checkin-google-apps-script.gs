// ═══════════════════════════════════════════════════════════════
//  CASA PAOLINA — Google Apps Script per Check-in Online
//
//  COME DEPLOYARE (una volta sola):
//
//  1. Vai su https://drive.google.com → Crea un nuovo Google Sheet
//     (dai un nome, es. "Check-in Casa Paolina 2026")
//
//  2. Apri il menu Estensioni → Apps Script
//
//  3. Sostituisci tutto il contenuto con questo file
//
//  4. Clicca su Salva (Ctrl+S)
//
//  5. Clicca su Deploy → Nuova distribuzione
//     • Tipo: Web App
//     • Descrizione: "Check-in Form"
//     • Esegui come: Me (il tuo account Google)
//     • Chi può accedere: Chiunque
//
//  6. Clicca "Deploy" → copia l'URL che appare (Web App URL)
//
//  7. Incolla quell'URL in:
//     js/checkin.js → riga 7 → const SHEETS_SCRIPT_URL = '...'
//
//  Fine! Ogni check-in apparirà come nuova riga nel foglio.
// ═══════════════════════════════════════════════════════════════

// NOTA: Lo script deve essere aperto dallo stesso Google Sheet
// in cui vuoi salvare i dati. Non serve specificare uno spreadsheet ID.

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // ── Foglio PRENOTAZIONI (una riga per prenotazione) ──────────
    var sheet = ss.getSheetByName('Prenotazioni') || ss.insertSheet('Prenotazioni');

    // Crea intestazioni se il foglio è vuoto
    if (sheet.getLastRow() === 0) {
      creaIntestazioni(sheet);
    }

    // Costruisci la riga principale
    var row = buildMainRow(data);
    sheet.appendRow(row);

    // ── Foglio OSPITI (una riga per ogni ospite accompagnatore) ──
    if (data.guests && data.guests.length > 0) {
      var guestSheet = ss.getSheetByName('Ospiti') || ss.insertSheet('Ospiti');
      if (guestSheet.getLastRow() === 0) {
        creaIntestazioniOspiti(guestSheet);
      }
      var refId = data.timestamp;
      var refName = (data.r_nome || '') + ' ' + (data.r_cognome || '');
      data.guests.forEach(function(g) {
        guestSheet.appendRow([
          refId,
          refName,
          data.checkin_date,
          data.checkout_date,
          data.appartamento,
          g.nome,
          g.cognome,
          g.sesso,
          g.data_nascita,
          g.comune_nascita,
          g.stato_nascita,
          g.cittadinanza
        ]);
      });
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

// Risponde alle richieste GET (health check)
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok', message: 'Casa Paolina Check-in API' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── RIGA PRINCIPALE ─────────────────────────────────────────────
function buildMainRow(d) {
  var totOspiti = (parseInt(d.adults_count) || 0) + (parseInt(d.children_count) || 0);
  return [
    // Meta
    new Date(d.timestamp),              // A: Data/ora ricezione
    // Soggiorno
    d.appartamento,                      // B: Appartamento
    d.checkin_date,                      // C: Data arrivo
    d.checkout_date,                     // D: Data partenza
    d.adults_count,                      // E: N. adulti
    d.children_count,                    // F: N. bambini
    totOspiti,                           // G: Totale ospiti
    d.trip_type,                         // H: Tipo soggiorno
    d.ora_arrivo,                        // I: Ora arrivo prevista
    // Referente — anagrafica
    d.r_nome,                            // J: Nome
    d.r_cognome,                         // K: Cognome
    d.r_sesso,                           // L: Sesso
    d.r_nascita_data,                    // M: Data di nascita
    d.r_nascita_comune,                  // N: Comune di nascita
    d.r_nascita_stato,                   // O: Stato di nascita
    d.r_cittadinanza,                    // P: Cittadinanza
    // Referente — residenza
    d.r_indirizzo,                       // Q: Indirizzo
    d.r_comune,                          // R: Comune di residenza
    d.r_cap,                             // S: CAP
    d.r_paese,                           // T: Paese di residenza
    // Referente — documento
    d.r_doc_tipo,                        // U: Tipo documento
    d.r_doc_numero,                      // V: Numero documento
    d.r_doc_emissione,                   // W: Data emissione
    d.r_doc_scadenza,                    // X: Data scadenza
    d.r_doc_rilascio,                    // Y: Luogo rilascio
    // Referente — contatti
    d.r_email,                           // Z: Email
    d.r_telefono,                        // AA: Telefono
    // Accompagnatori (riepilogo nel foglio principale)
    d.guests_count,                      // AB: N. accompagnatori
    // Note
    d.note                               // AC: Note
  ];
}

// ── INTESTAZIONI FOGLIO PRENOTAZIONI ────────────────────────────
function creaIntestazioni(sheet) {
  var headers = [
    'Data Ricezione',
    'Appartamento',
    'Data Arrivo', 'Data Partenza',
    'Adulti', 'Bambini', 'Totale Ospiti',
    'Tipo Soggiorno', 'Ora Arrivo Prevista',
    'Nome Referente', 'Cognome Referente',
    'Sesso', 'Data Nascita', 'Comune Nascita', 'Stato Nascita', 'Cittadinanza',
    'Indirizzo', 'Comune Residenza', 'CAP', 'Paese Residenza',
    'Tipo Documento', 'N. Documento', 'Data Emissione Doc.', 'Data Scadenza Doc.', 'Luogo Rilascio',
    'Email', 'Telefono',
    'N. Accompagnatori',
    'Note'
  ];

  sheet.appendRow(headers);

  // Stile intestazioni
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#2c7873');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontSize(10);

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 150); // Data ricezione
  sheet.setColumnWidth(3, 100); // Data arrivo
  sheet.setColumnWidth(4, 100); // Data partenza
}

// ── INTESTAZIONI FOGLIO OSPITI ───────────────────────────────────
function creaIntestazioniOspiti(sheet) {
  var headers = [
    'Ref. Prenotazione', 'Referente', 'Data Arrivo', 'Data Partenza', 'Appartamento',
    'Nome', 'Cognome', 'Sesso', 'Data Nascita', 'Comune Nascita', 'Stato Nascita', 'Cittadinanza'
  ];
  sheet.appendRow(headers);

  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#264653');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontSize(10);
  sheet.setFrozenRows(1);
}
