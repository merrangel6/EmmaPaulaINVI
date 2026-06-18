const SHEET_NAME = "Invitados";

function doPost(e) {
  const sheet = getSheet_();
  const data = JSON.parse(e.postData.contents || "{}");

  sheet.appendRow([
    data.fechaRegistro || new Date().toISOString(),
    data.nombre || "",
    Number(data.adultos || 0),
    Number(data.ninos || 0),
    data.comentarios || "",
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const callback = e.parameter.callback || "callback";
  const guests = readGuests_();
  const payload = JSON.stringify({ guests });

  return ContentService
    .createTextOutput(`${callback}(${payload});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Fecha de registro", "Nombre", "Adultos", "Niños", "Comentarios"]);
  }

  return sheet;
}

function readGuests_() {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues().slice(1);

  return rows
    .filter((row) => row.some(Boolean))
    .map((row) => ({
      fechaRegistro: row[0],
      nombre: row[1],
      adultos: row[2],
      ninos: row[3],
      comentarios: row[4],
    }));
}
