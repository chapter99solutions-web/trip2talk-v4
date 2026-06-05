/**
 * Trip2Talk V4 — Apps Script Web App (deploy as "Anyone" can access).
 *
 * Spreadsheet: Trip2Talk master sheet (Trips_Data, Customer_Bookings, Consents).
 * Default ID below is used unless Script property SPREADSHEET_ID overrides it.
 *
 * Owner deploy steps: see docs/GAS_TRIPS_DATA.md
 */
// ชื่อแท็บ (tab) ที่อ่านข้อมูลทริป — ใช้แท็บ "Trip info" ที่มีอยู่แล้วในชีตใหม่
// (เดิมคือ 'Trips_Data'). เปลี่ยนมาอ่านจาก "Trip info" เพื่อไม่ต้องสร้างแท็บใหม่.
const GAS_VERSION = '3.0';
const TRIPS_TAB = 'Trip info';
const BOOKINGS_TAB = 'Customer_Bookings';
// แท็บปลายทางสำหรับ append แถวการจอง + settlement (มีอยู่แล้วในชีตใหม่)
const SETTLEMENTS_TAB = 'Tax_Year_2025_2026_Settlements';

/** Trip2Talk master Google Sheet — https://docs.google.com/spreadsheets/d/1L1VUu0qvL0-G0C1z9byscU11kKcuMCM0iajNLjxH9eE/edit */
const SPREADSHEET_ID = '1L1VUu0qvL0-G0C1z9byscU11kKcuMCM0iajNLjxH9eE';

/** Prefer container-bound spreadsheet when IDs match; else openById. */
function ss_() {
  var id = spreadsheetId_();
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active && active.getId() === id) {
      Logger.log('[Trip2Talk] ss_ container-bound spreadsheet ' + id);
      return active;
    }
  } catch (err) {
    Logger.log('[Trip2Talk] ss_ no active spreadsheet: ' + err);
  }
  Logger.log('[Trip2Talk] ss_ openById ' + id);
  return SpreadsheetApp.openById(id);
}

function tripsReadMeta_(spreadsheetId, sheetNames, totalRows, tripCount, headers, debug) {
  if (!debug) return undefined;
  return {
    spreadsheetId: spreadsheetId,
    tab: TRIPS_TAB,
    sheetNames: sheetNames,
    totalRowsIncludingHeader: totalRows,
    tripCount: tripCount,
    headers: headers,
  };
}

function spreadsheetId_() {
  const fromProps = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const id =
    fromProps && fromProps !== 'YOUR_SPREADSHEET_ID' ? fromProps : SPREADSHEET_ID;
  if (!id) {
    throw new Error('Missing SPREADSHEET_ID');
  }
  return id;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  const actionNorm = String(action).trim().toLowerCase();
  const rawSheet = (e && e.parameter && (e.parameter.sheet || e.parameter.tab)) || '';
  // Normalise legacy alias: ?sheet=Trips_Data → treated as the current "Trip info" tab
  const sheet = rawSheet === 'Trips_Data' ? TRIPS_TAB : rawSheet;
  const sheetNorm = String(sheet).trim().toLowerCase();
  const tripsTabNorm = TRIPS_TAB.toLowerCase();
  const debug =
    e &&
    e.parameter &&
    (e.parameter.debug === '1' || String(e.parameter.debug).toLowerCase() === 'true');

  try {
    if (
      actionNorm === 'gettrips' ||
      actionNorm === 'readtrips' ||
      actionNorm === 'listtrips' ||
      actionNorm === 'gettripinfo' ||
      sheetNorm === tripsTabNorm ||
      sheetNorm === 'trips_data'
    ) {
      return json_(readTrips_({ debug: debug }));
    }
    if (actionNorm === 'list' && (sheetNorm === tripsTabNorm || sheetNorm === 'trips_data')) {
      return json_(readTrips_({ debug: debug }));
    }
    if (actionNorm === 'seedtripinfosheet') {
      return json_(seedTripInfoSheet_());
    }
    if (action === 'seedTrips' || action === 'seedMasterTrips') {
      return json_(seedMasterTrips_());
    }
    if (action === 'addTrip') {
      var tripJson = (e && e.parameter && e.parameter.trip) || '';
      if (!tripJson) {
        return json_({ status: 'error', message: 'Missing trip JSON parameter' });
      }
      return json_(upsertTrip_(JSON.parse(tripJson)));
    }
    if (action === 'getBookings') {
      return json_(readBookings_());
    }
    if (action === 'seedTestBooking') {
      return json_(seedTestBooking_());
    }
    if (action === 'seedTestBookings') {
      return json_(seedTestBookings_());
    }
    if (action === 'getBookingStatus') {
      var bookingId = (e && e.parameter && e.parameter.bookingId) || '';
      return json_(getBookingStatus_({ bookingId: bookingId }));
    }
    if (action === 'getPendingIntakes') {
      return json_(getPendingIntakes_());
    }
    return json_(readTrips_({ debug: debug }));
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  }
}

function readTrips_(options) {
  options = options || {};
  var debug = options.debug === true;
  var spreadsheetId = spreadsheetId_();

  Logger.log(
    '[Trip2Talk] readTrips_ v' +
      GAS_VERSION +
      ' spreadsheetId=' +
      spreadsheetId +
      ' tab="' +
      TRIPS_TAB +
      '"'
  );

  var ss = ss_();
  var sheetNames = ss.getSheets().map(function (s) {
    return s.getName();
  });
  Logger.log('[Trip2Talk] available tabs: ' + sheetNames.join(', '));

  var sh = ss.getSheetByName(TRIPS_TAB);
  if (!sh) {
    var missingMsg =
      'Missing tab: "' + TRIPS_TAB + '" (found: ' + sheetNames.join(', ') + ')';
    Logger.log('[Trip2Talk] ERROR ' + missingMsg);
    throw new Error(missingMsg);
  }

  var values = sh.getDataRange().getValues();
  var totalRows = values.length;
  Logger.log('[Trip2Talk] rows in "' + TRIPS_TAB + '" (incl. header): ' + totalRows);

  if (totalRows < 2) {
    Logger.log('[Trip2Talk] no data rows — header only or empty tab');
    return {
      ok: true,
      status: 'ok',
      version: GAS_VERSION,
      trips: [],
      data: [],
      read: tripsReadMeta_(spreadsheetId, sheetNames, totalRows, 0, [], debug),
    };
  }

  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });
  Logger.log('[Trip2Talk] header row: ' + headers.join(' | '));

  var trips = [];
  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    if (
      !row.some(function (c) {
        return String(c || '').trim() !== '';
      })
    ) {
      Logger.log('[Trip2Talk] skip empty row ' + (r + 1));
      continue;
    }
    var obj = {};
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      obj[headers[c]] = row[c];
    }
    var normalized = normalizeTripRow_(obj);
    Logger.log(
      '[Trip2Talk] row ' +
        (r + 1) +
        ' tourCode=' +
        (normalized.tourCode || '(missing)') +
        ' tourName=' +
        (normalized.tourName || '')
    );
    if (!normalized.tourCode) {
      Logger.log('[Trip2Talk] WARN row ' + (r + 1) + ' has no Trip/Tour Code — skipped');
      continue;
    }
    trips.push(normalized);
  }

  Logger.log('[Trip2Talk] parsed trip count: ' + trips.length);

  return {
    ok: true,
    status: 'ok',
    version: GAS_VERSION,
    trips: trips,
    data: trips,
    read: tripsReadMeta_(spreadsheetId, sheetNames, totalRows, trips.length, headers, debug),
  };
}

/** Row 1 headers for the public Trip info tab (20 columns, Title Case). */
function tripInfoSheetHeaders_() {
  return [
    'Trip Code',
    'Tour Name',
    'Cover',
    'Price',
    'Max Pax',
    'Departure Date',
    'Duration',
    'Highlight 1',
    'Highlight 2',
    'Highlight 3',
    'Highlight 4',
    'Itinerary',
    'Meeting Point',
    'Included',
    'Excluded',
    'Note',
    'Status',
    'Installment 1',
    'Installment 2',
    'Installment 3',
  ];
}

function durationDaysFromDurationLabel_(label) {
  var m = String(label || '').match(/(\d+)\s*Day/i);
  return m ? Number(m[1]) : 1;
}

function meetingPointLabel_(pickupType) {
  if (pickupType === 'airport_terminal') {
    return 'Sydney Airport Terminal (overnight trips)';
  }
  return 'Thai Town, Sydney (Dixon St)';
}

function itinerarySummary_(days) {
  return days
    .map(function (d) {
      return 'Day ' + d.day + ': ' + d.title + ' — ' + d.desc;
    })
    .join(' | ');
}

function joinList_(items) {
  return items.join('; ');
}

function installmentAmounts_(standardPrice, durationDays) {
  if (durationDays <= 1) {
    return { i1: 100, i2: '', i3: '' };
  }
  var remaining = Math.max(0, Number(standardPrice) - 100);
  var half = Math.round(remaining / 2);
  return { i1: 100, i2: half, i3: remaining - half };
}

function padHighlights_(list) {
  var out = ['', '', '', ''];
  for (var i = 0; i < 4 && i < list.length; i++) {
    out[i] = list[i];
  }
  return out;
}

/** Canonical 8 trips — aligned with src/data/tours.ts + src/lib/realTourCodes.ts */
function tripInfoSeedDefinitions_() {
  var portfolio = 'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio';
  return [
    {
      tourCode: 'TAS-3D2N',
      tourName: 'Tasmania Mini Aurora Hunt (3D2N)',
      coverUrl:
        portfolio +
        '/Tasmania/Launceston/596811714_1428639069261190_2753284779604496226_n.jpg',
      standardPrice: 1350,
      maxPax: 6,
      durationLabel: '3 Days 2 Nights',
      highlights: ['Mt Wellington Aurora Hunt', 'Bruny Island', 'MONA', ''],
      itinerary: [
        { day: 1, title: 'Port Arthur → Mt. Wellington Aurora Hunt', desc: 'Private SUV · Hobart Market · Aurora on Mt Wellington' },
        { day: 2, title: 'Bruny Island Full Day', desc: 'The Neck · Lighthouse · optional oyster farm' },
        { day: 3, title: 'MONA → Waterfront → SYD', desc: 'MONA · Waterfront · flight home' },
      ],
      pickupType: 'airport_terminal',
      included: ['Private SUV + driver', 'Professional photographer', 'Drinking water', 'Entry fees per plan', 'Flight booking assistance'],
      excluded: ['Flights', 'All meals', 'Travel insurance'],
      note: 'Winter aurora-focused Hobart loop · Design Airbnb dormitory',
      status: 'CONFIRMED',
    },
    {
      tourCode: 'MEL-4D3N',
      tourName: 'Victoria Photo Trip (4D3N)',
      coverUrl: portfolio + '/Melbourne/01.jpg',
      standardPrice: 1550,
      maxPax: 5,
      durationLabel: '4 Days 3 Nights',
      highlights: [
        'Great Ocean Road & The Twelve Apostles',
        'Pink Lake',
        'Melbourne City street art',
        '',
      ],
      itinerary: [
        { day: 1, title: 'SYD → Twelve Apostles', desc: 'Great Ocean Road golden hour · Milky Way' },
        { day: 2, title: 'Pink Lake', desc: 'Blue hour · Milky Way reflections' },
        { day: 3, title: 'Melbourne City', desc: 'Street art · State Library · Flinders St' },
        { day: 4, title: 'Melbourne → SYD', desc: 'Morning city · return flight' },
      ],
      pickupType: 'airport_terminal',
      included: ['SUV + driver + fuel', 'Professional photographer', 'Drinking water', 'Park entry', 'Flight booking help'],
      excluded: ['Return flights', 'All meals', 'Travel insurance'],
      note: 'Secret Southern Coast · dormitory upgrade available',
      status: 'DRAFT',
    },
    {
      tourCode: 'ULU-4D3N',
      tourName: 'The Red Desert Odyssey (4D3N)',
      coverUrl: portfolio + '/Ulruru/1.jpg',
      standardPrice: 1690,
      maxPax: 5,
      durationLabel: '4 Days 3 Nights',
      highlights: ['Uluru sunrise/sunset', 'Field of Light', 'Kata Tjuta (The Olgas)', ''],
      itinerary: [
        { day: 1, title: 'SYD → Uluru Sunset', desc: 'Outback Lodge · rock colour change · Milky Way' },
        { day: 2, title: 'Field of Light → Kata Tjuta', desc: 'Olgas walk · evening light installation' },
        { day: 3, title: 'Uluru Sunrise → Base Walk', desc: 'Base walk · desert Milky Way' },
        { day: 4, title: 'Kata Tjuta Dune → SYD', desc: 'Final sunrise · return flight' },
      ],
      pickupType: 'airport_terminal',
      included: ['Vehicle + driver', 'Outback Lodge 3 nights', 'Park passes', 'Field of Light ticket', 'Photographer'],
      excluded: ['Flights', 'All meals', 'Travel insurance'],
      note: 'Red centre Outback · fixed private price',
      status: 'DRAFT',
    },
    {
      tourCode: 'NZ-6D5N',
      tourName: 'The Alpine Kingdom (6D5N)',
      coverUrl: portfolio + '/New%20Zealand/Cover/01.jpg',
      standardPrice: 2300,
      maxPax: 5,
      durationLabel: '6 Days 5 Nights',
      highlights: ['Milford Sound', 'Lake Tekapo & Church', 'Queenstown & Southern Alps', ''],
      itinerary: [
        { day: 1, title: 'SYD → Christchurch', desc: 'Arrival · city walk' },
        { day: 2, title: 'Lake Tekapo', desc: 'Church of the Good Shepherd · Milky Way' },
        { day: 3, title: 'Mt Cook / Aoraki', desc: 'Hooker Valley · glacier views' },
        { day: 4, title: 'Queenstown', desc: 'Remarkables · Lake Wakatipu' },
        { day: 5, title: 'Milford Sound', desc: 'Fiordland drive · cruise' },
        { day: 6, title: 'Queenstown → SYD', desc: 'Final captures · fly home' },
      ],
      pickupType: 'airport_terminal',
      included: ['SUV + driver 6 days', '5 nights accommodation', 'Photographer', 'Milford cruise', 'Park fees'],
      excluded: ['Flights', 'All meals', 'Travel insurance'],
      note: 'South Island flagship · all-year departures',
      status: 'CONFIRMED',
    },
    {
      tourCode: 'TAS-LH-4D3N',
      tourName: 'Tasmania Summer: Launceston – Hobart (4D3N)',
      coverUrl:
        portfolio +
        '/Tasmania/Launceston/596371362_1428639202594510_8709278754225773992_n.jpg',
      standardPrice: 1650,
      maxPax: 6,
      durationLabel: '4 Days 3 Nights',
      highlights: ['Bridestowe Lavender', 'Cradle Mountain', 'MONA', 'Mt Wellington'],
      itinerary: [
        { day: 1, title: 'Bridestowe → Richmond → Aurora', desc: 'Lavender fields · aurora hunt' },
        { day: 2, title: 'Cradle Mountain', desc: 'Full day · reflections · night mission' },
        { day: 3, title: 'MONA → Hobart → Mt Wellington', desc: 'MONA · Cascade · golden hour' },
        { day: 4, title: 'Last Capture → SYD', desc: 'Waterfront · return flight' },
      ],
      pickupType: 'airport_terminal',
      included: ['Launceston–Hobart transport', 'Photographer mentor', 'Water', 'Lavender + MONA entries'],
      excluded: ['Flights', 'All meals', 'Travel insurance'],
      note: 'Summer Launceston–Hobart · lavender season',
      status: 'DRAFT',
    },
    {
      tourCode: 'KIA-1DAY',
      tourName: 'Sydney – Kiama One Day Photo Trip (1 Day)',
      coverUrl:
        portfolio +
        '/One%20day%20trip%20SYD/705320467_10242162489108855_3820285517745745334_n.jpg',
      standardPrice: 250,
      maxPax: 4,
      durationLabel: '1 Day',
      highlights: ['Helensburgh Old Station', 'Seacliff Bridge', 'Bombo Headland Quarry', ''],
      itinerary: [
        {
          day: 1,
          title: 'Kiama coast (08:00–19:00)',
          desc: 'Thai Town pickup · Helensburgh · Seacliff · Bombo Headland twilight',
        },
      ],
      pickupType: 'thaitown_main',
      included: ['Thai Town pickup/drop-off', 'Vehicle + driver', 'Photographer', 'Water'],
      excluded: ['Food & drinks', 'Travel insurance'],
      note: 'Winter only day trip · peak season $290',
      status: 'DRAFT',
    },
    {
      tourCode: 'CAN-2D1N',
      tourName: 'Cowra & Canowindra Canola Fields Photo Trip (2D1N)',
      coverUrl: portfolio + '/Cowra/1.jpg',
      standardPrice: 380,
      maxPax: 4,
      durationLabel: '2 Days 1 Night',
      highlights: ['Canola fields', 'Cowra & Canowindra towns', 'Cowra Japanese Garden', ''],
      itinerary: [
        { day: 1, title: 'Canola & heritage towns', desc: 'Secret fields · Cowra · Canowindra · overnight' },
        { day: 2, title: 'Garden & morning fields', desc: 'Japanese Garden optional · return Sydney' },
      ],
      pickupType: 'thaitown_main',
      included: ['1 night dorm stay', 'Vehicle + fuel', 'Photographer', 'Water'],
      excluded: ['All meals', 'Garden entry (optional)', 'Travel insurance'],
      note: 'Spring only · Oct departures',
      status: 'DRAFT',
    },
    {
      tourCode: 'SYD-1DAY',
      tourName: 'One Day Trip in Sydney & Photoshoot Packages (1 Day)',
      coverUrl:
        portfolio +
        '/SYDNEY/505479211_10236865839535926_981414994444837633_n.jpg',
      standardPrice: 250,
      maxPax: 4,
      durationLabel: '1 Day',
      highlights: ['Sydney 5 Best Locations', 'Anna Bay Sand Dunes', 'Milky Way Hunt', 'Kiama Coast'],
      itinerary: [
        {
          day: 1,
          title: 'Sydney day packages',
          desc: 'City shoots · Anna Bay · Kiama · Milky Way (winter eve)',
        },
      ],
      pickupType: 'thaitown_main',
      included: ['Vehicle + driver', 'Photographer', 'Drone', 'Water'],
      excluded: ['Food', 'Travel insurance'],
      note: 'From $250/person · $100 deposit · Influencer pkg $680',
      status: 'DRAFT',
    },
  ];
}

function tripInfoRowFromDefinition_(trip) {
  var hl = padHighlights_(trip.highlights);
  var days = durationDaysFromDurationLabel_(trip.durationLabel);
  var inst = installmentAmounts_(trip.standardPrice, days);
  return [
    trip.tourCode,
    trip.tourName,
    trip.coverUrl,
    trip.standardPrice,
    trip.maxPax,
    '',
    trip.durationLabel,
    hl[0],
    hl[1],
    hl[2],
    hl[3],
    itinerarySummary_(trip.itinerary),
    meetingPointLabel_(trip.pickupType),
    joinList_(trip.included),
    joinList_(trip.excluded),
    trip.note,
    trip.status,
    inst.i1,
    inst.i2,
    inst.i3,
  ];
}

/** Callable from Apps Script editor or ?action=seedTripInfoSheet */
function seedTripInfoSheet() {
  return seedTripInfoSheet_();
}

/**
 * Create or replace the "Trip info" tab with headers + 8 seeded rows.
 * Does not delete the legacy Trips_Data tab.
 */
function seedTripInfoSheet_() {
  var spreadsheetId = spreadsheetId_();
  var ss = ss_();
  var headers = tripInfoSheetHeaders_();
  var definitions = tripInfoSeedDefinitions_();
  var dataRows = definitions.map(tripInfoRowFromDefinition_);
  var sh = ss.getSheetByName(TRIPS_TAB);

  if (!sh) {
    sh = ss.insertSheet(TRIPS_TAB);
  }

  sh.clear();
  var table = [headers].concat(dataRows);
  sh.getRange(1, 1, table.length, headers.length).setValues(table);
  sh.setFrozenRows(1);

  Logger.log('[Trip2Talk] seedTripInfoSheet_ wrote ' + dataRows.length + ' rows to "' + TRIPS_TAB + '"');

  return {
    ok: true,
    status: 'ok',
    version: GAS_VERSION,
    tab: TRIPS_TAB,
    spreadsheetId: spreadsheetId,
    rowsWritten: dataRows.length,
    tourCodes: definitions.map(function (t) {
      return t.tourCode;
    }),
    message: 'Seeded "' + TRIPS_TAB + '" with ' + dataRows.length + ' trips',
  };
}

function doPost(e) {
  try {
    const body = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    const actionNorm = String(body.action || '').trim().toLowerCase();
    if (actionNorm === 'seedtripinfosheet') {
      return json_(seedTripInfoSheet_());
    }
    if (
      actionNorm === 'gettrips' ||
      actionNorm === 'readtrips' ||
      actionNorm === 'listtrips' ||
      actionNorm === 'gettripinfo'
    ) {
      return json_(readTrips_({ debug: body.debug === true || body.debug === '1' }));
    }
    if (body.action === 'getBookings') {
      return json_(readBookings_());
    }
    if (body.action === 'seedTestBooking') {
      return json_(seedTestBooking_());
    }
    if (body.action === 'seedTestBookings') {
      return json_(seedTestBookings_());
    }
    const sheet = body.sheet || '';
    if (sheet === TRIPS_TAB && body.trip) {
      return json_(upsertTrip_(body.trip));
    }
    if (sheet === TRIPS_TAB && body.action === 'seedMasterTrips') {
      return json_(seedMasterTrips_());
    }
    if (sheet === TRIPS_TAB && Array.isArray(body.trips)) {
      return json_(seedTripsArray_(body.trips));
    }
    if (sheet === 'Customer_Bookings' && body.booking) {
      return json_(appendBooking_(body.booking));
    }
    if (sheet === 'Consents' && body.consent) {
      return json_(appendConsent_(body.consent));
    }
    if (body.action === 'submitIntake' && body.intake) {
      return json_(updateIntake_(body.intake));
    }
    if (body.action === 'createBooking') {
      return json_(createBooking_(body));
    }
    if (body.action === 'updateIntake') {
      return json_(updateIntake_(body));
    }
    if (body.action === 'updateCheckedIn') {
      return json_(updateCheckedIn_(body));
    }
    if (body.action === 'getBookingStatus') {
      return json_(getBookingStatus_(body));
    }
    if (body.action === 'getPendingIntakes') {
      return json_(getPendingIntakes_());
    }
    if (body.action === 'addExpense') {
      return json_(appendExpense_(body));
    }
    if (body.action === 'addBooking') {
      return json_(appendBookingRow_(body));
    }
    // เพิ่มค่า "Slots Booked" ของทริปในแท็บ 'Trip info' (กระจกเงาให้เจ้าของ)
    if (body.action === 'incrementSlot') {
      return json_(incrementSlot_(body));
    }
    return json_({ status: 'error', message: 'Unknown sheet payload' });
  } catch (err) {
    return json_({ status: 'error', message: String(err) });
  }
}

function upsertTrip_(trip) {
  const ss = ss_();
  var sh = ss.getSheetByName(TRIPS_TAB);
  if (!sh) {
    sh = ss.insertSheet(TRIPS_TAB);
  }
  var headers = ensureTripHeaders_(sh);
  var normalized = normalizeTripRow_(trip);
  var tourCode = normalized.tourCode;
  if (!tourCode) {
    throw new Error('trip.tourCode is required');
  }
  var rowObj = tripRowFromNormalized_(normalized, trip);
  var values = sh.getDataRange().getValues();
  var codeCol = headerIndex_(headers, ['Trip Code', 'Tour Code', 'tourCode', 'tour_code']);
  var rowIndex = -1;
  if (values.length > 1 && codeCol >= 0) {
    for (var r = 1; r < values.length; r++) {
      if (String(values[r][codeCol] || '').trim().toLowerCase() === tourCode.toLowerCase()) {
        rowIndex = r + 1;
        break;
      }
    }
  }
  var outRow = headers.map(function (h) {
    return rowObj[h] != null ? rowObj[h] : '';
  });
  if (rowIndex > 0) {
    sh.getRange(rowIndex, 1, 1, headers.length).setValues([outRow]);
  } else {
    sh.appendRow(outRow);
  }
  return { status: 'ok', message: 'Trips_Data saved', tourCode: tourCode };
}

function ensureTripHeaders_(sh) {
  var defaultHeaders = [
    'Tour Code',
    'Tour Name',
    'Country Tag',
    'City',
    'Weather',
    'Messenger',
    'Cover',
    'Duration Days',
    'Standard Price',
    'Private Price',
    'Trip Type',
    'Season',
    'Max Pax',
    'Highlights',
    'Pickup Type',
    'Category',
    'Departure Start',
    'Departure End',
    'Slots Booked',
    'Slots Max',
  ];
  var range = sh.getDataRange();
  var values = range.getValues();
  if (values.length === 0 || !String(values[0][0] || '').trim()) {
    sh.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
    return defaultHeaders;
  }
  return values[0].map(function (h) {
    return String(h || '').trim();
  });
}

function headerIndex_(headers, candidates) {
  for (var i = 0; i < headers.length; i++) {
    for (var j = 0; j < candidates.length; j++) {
      if (headers[i].toLowerCase() === candidates[j].toLowerCase()) {
        return i;
      }
    }
  }
  return -1;
}

function tripRowFromNormalized_(n, raw) {
  var maxPax = n.maxPax || n.slotsMax || pick_(raw, ['maxPax', 'Max Pax']);
  return {
    'Tour Code': n.tourCode,
    'Tour Name': n.tourName,
    'Country Tag': n.countryTag,
    City: n.city,
    Weather: n.weather,
    Messenger: n.messengerUrl,
    Cover: n.coverUrl,
    'Duration Days': n.durationDays,
    'Standard Price': n.priceStandardAud || pick_(raw, ['standardPrice', 'priceStandardAud', 'Standard Price']),
    'Private Price': n.pricePrivateAud || pick_(raw, ['privatePrice', 'pricePrivateAud', 'Private Price']),
    'Trip Type': n.tripType || pick_(raw, ['tripType', 'Trip Type']),
    Season: n.season || pick_(raw, ['season', 'Season']),
    'Max Pax': maxPax,
    Highlights: n.highlights || pick_(raw, ['highlights', 'Highlights']),
    'Pickup Type': n.pickupType || pick_(raw, ['pickupType', 'Pickup Type']),
    Category: n.seasonGroup,
    'Departure Start': n.departureStart,
    'Departure End': n.departureEnd,
    'Slots Booked': n.slotsBooked,
    'Slots Max': maxPax || n.slotsMax,
  };
}

function getOrCreateSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
}

function bookingHeaders_() {
  return [
    'Booking ID',
    'Customer Name',
    'Tour Code',
    'Tour Name',
    'Pax',
    'Tour Date',
    'Total Amount',
    'Pickup Location',
    'Pickup Display',
    'Depart Time',
    'FB Chat URL',
    'Notes',
    'Timestamp',
    'Booking Status',
    'Intake Status',
    'Full Name Passport',
    'DOB',
    'Emergency Contact',
    'Dietary Req',
    'Medical Condition',
    'Motion Sickness',
    'Photo Style',
    'Checked In',
    'Checked In At',
  ];
}

function ensureBookingHeaders_(sheet) {
  var headers = bookingHeaders_();
  var width = Math.max(sheet.getLastColumn(), 1);
  var existing = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });
  if (existing.every(function (h) {
    return !h;
  })) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    return headers;
  }
  for (var i = 0; i < headers.length; i++) {
    if (!existing[i]) {
      sheet.getRange(1, i + 1).setValue(headers[i]);
    }
  }
  return headers;
}

function bookingHeaderCol_(sheet, headerName) {
  var width = Math.max(sheet.getLastColumn(), bookingHeaders_().length);
  var headers = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });
  var idx = headerIndex_(headers, [headerName]);
  return idx >= 0 ? idx + 1 : -1;
}

function findRowByBookingId_(sheet, bookingId) {
  if (!bookingId || sheet.getLastRow() < 2) return -1;
  var lastRow = sheet.getLastRow();
  var numRows = lastRow - 1;
  var ids = sheet.getRange(2, 1, numRows, 1).getValues();
  var target = String(bookingId).trim().toLowerCase();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0] || '').trim().toLowerCase() === target) {
      return i + 2;
    }
  }
  return -1;
}

function bookingDefaultCell_(headerName) {
  if (headerName === 'Booking Status') return 'Deposit Paid';
  if (headerName === 'Intake Status') return 'Pending';
  if (headerName === 'Checked In') return 'FALSE';
  return '';
}

function bookingPadRow_(cells) {
  var headers = bookingHeaders_();
  var row = cells.slice();
  while (row.length < headers.length) {
    row.push(bookingDefaultCell_(headers[row.length]));
  }
  return row;
}

function readBookings_() {
  var ss = ss_();
  var sheet = ss.getSheetByName(BOOKINGS_TAB);
  if (!sheet || sheet.getLastRow() < 2) {
    return okBookings_([]);
  }
  var lastRow = sheet.getLastRow();
  var colCount = Math.max(sheet.getLastColumn(), bookingHeaders_().length);
  var numRows = lastRow - 1;
  var rows = sheet.getRange(2, 1, numRows, colCount).getValues();
  var bookings = rows
    .map(function (r) {
      return {
        bookingId: String(r[0] || '').trim(),
        customerName: String(r[1] || '').trim(),
        tourCode: String(r[2] || '').trim(),
        tourName: String(r[3] || '').trim(),
        pax: r[4],
        tourDate: r[5],
        totalAmount: r[6],
        pickupLocation: String(r[7] || '').trim(),
        pickupDisplay: String(r[8] || '').trim(),
        departTime: String(r[9] || '').trim(),
        fbChatUrl: String(r[10] || '').trim(),
        notes: String(r[11] || '').trim(),
        timestamp: String(r[12] || '').trim(),
        bookingStatus: String(r[13] || '').trim(),
        intakeStatus: String(r[14] || '').trim(),
        checkedIn: String(r[22] || '').trim().toUpperCase() === 'TRUE',
      };
    })
    .filter(function (b) {
      return b.bookingId;
    });
  return okBookings_(bookings);
}

function okBookings_(bookings) {
  return { status: 'ok', bookings: bookings, data: bookings };
}

function testBookingsSeed_() {
  return [
    bookingPadRow_([
      'BK-001',
      'Saen Test',
      'KIA-1DAY',
      'The Coastal Cliffs',
      4,
      '2026-06-15',
      1000,
      'thaitown_main',
      'Thai Town, Haymarket',
      '08:00 AM',
      'https://m.me/trip2talk',
      'Test booking - Kiama coastal trip',
      new Date().toISOString(),
    ]),
    bookingPadRow_([
      'BK-002',
      'Nong Ploy',
      'CAN-2D1N',
      'The Golden Fields',
      4,
      '2026-10-05',
      1520,
      'thaitown_main',
      'Thai Town, Haymarket',
      '07:00 AM',
      'https://m.me/trip2talk',
      'Spring canola fields trip',
      new Date().toISOString(),
    ]),
    bookingPadRow_([
      'BK-003',
      'Test Client NZ',
      'NZ-6D5N',
      'The Alpine Kingdom',
      3,
      '2026-04-12',
      6900,
      'airport_terminal',
      'Sydney Airport Terminal 1',
      '06:00 AM',
      'https://m.me/trip2talk',
      'New Zealand 6D5N overnight trip',
      new Date().toISOString(),
    ]),
  ];
}

function seedTestBookings_() {
  var ss = ss_();
  var headers = bookingHeaders_();
  var sheet = getOrCreateSheet_(ss, BOOKINGS_TAB, headers);
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }
  var rows = testBookingsSeed_();
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return {
    status: 'ok',
    message: 'Seeded ' + rows.length + ' test bookings',
    bookingIds: rows.map(function (r) {
      return r[0];
    }),
  };
}

function seedTestBooking_() {
  return seedTestBookings_();
}

/** Run from Apps Script editor or GET ?action=seedTestBookings */
function seedTestBookings() {
  return seedTestBookings_();
}

function appendBooking_(booking) {
  var ss = ss_();
  var sheet = getOrCreateSheet_(ss, BOOKINGS_TAB, bookingHeaders_());
  ensureBookingHeaders_(sheet);
  var b = booking || {};
  sheet.appendRow(
    bookingPadRow_([
      pick_(b, ['bookingId', 'Booking ID']),
      pick_(b, ['customerName', 'Customer Name']),
      pick_(b, ['tourCode', 'Tour Code']),
      pick_(b, ['tourName', 'Tour Name']),
      pick_(b, ['pax', 'Pax', 'guests']) || 1,
      pick_(b, ['tourDate', 'Tour Date']),
      pick_(b, ['totalAmount', 'Total Amount']),
      pick_(b, ['pickupLocation', 'Pickup Location']),
      pick_(b, ['pickupDisplay', 'Pickup Display']),
      pick_(b, ['departTime', 'Depart Time']),
      pick_(b, ['fbChatUrl', 'FB Chat URL']),
      pick_(b, ['notes', 'Notes']),
      pick_(b, ['timestamp', 'Timestamp']) || new Date().toISOString(),
    ])
  );
  return { status: 'ok', message: 'Customer_Bookings saved' };
}

function createBooking_(data) {
  var ss = ss_();
  var sheet = getOrCreateSheet_(ss, BOOKINGS_TAB, bookingHeaders_());
  ensureBookingHeaders_(sheet);
  var bookingId = pick_(data, ['bookingId', 'Booking ID', 'Booking_ID']);
  if (!bookingId) {
    return { status: 'error', message: 'bookingId is required' };
  }
  if (findRowByBookingId_(sheet, bookingId) > 0) {
    return { status: 'error', message: 'Booking ID already exists' };
  }
  sheet.appendRow(
    bookingPadRow_([
      bookingId,
      pick_(data, ['customerName', 'Customer Name', 'Customer_Name']) || '',
      pick_(data, ['tourCode', 'Tour Code', 'Tour_Code']) || '',
      pick_(data, ['tourName', 'Tour Name']) || '',
      pick_(data, ['pax', 'Pax']) || 1,
      pick_(data, ['tourDate', 'Tour Date']) || '',
      pick_(data, ['totalAmount', 'Total Amount']) || '',
      pick_(data, ['pickupLocation', 'Pickup Location']) || '',
      pick_(data, ['pickupDisplay', 'Pickup Display']) || '',
      pick_(data, ['departTime', 'Depart Time']) || '',
      pick_(data, ['fbChatUrl', 'FB Chat URL']) || '',
      pick_(data, ['notes', 'Notes']) || '',
      new Date().toISOString(),
      pick_(data, ['bookingStatus', 'Booking Status', 'Booking_Status']) || 'Deposit Paid',
      'Pending',
    ])
  );
  return { status: 'ok', bookingId: bookingId, intakeStatus: 'Pending' };
}

function updateIntake_(data) {
  var ss = ss_();
  var sheet = ss.getSheetByName(BOOKINGS_TAB);
  if (!sheet) {
    return { status: 'error', message: 'Customer_Bookings sheet not found' };
  }
  ensureBookingHeaders_(sheet);
  var bookingId = pick_(data, ['bookingId', 'Booking ID', 'Booking_ID']);
  var row = findRowByBookingId_(sheet, bookingId);
  if (row < 2) {
    return { status: 'error', message: 'Booking ID not found: ' + bookingId };
  }

  var dietary = data.dietary;
  var dietaryText = [
    Array.isArray(dietary) ? dietary.join(', ') : String(dietary || ''),
    pick_(data, ['dietaryOther', 'Dietary Other']) || '',
  ]
    .filter(Boolean)
    .join('; ');

  var photoStyle = data.photoStyle;
  var photoText = Array.isArray(photoStyle) ? photoStyle.join(', ') : String(photoStyle || '');

  var emergencyName = pick_(data, ['emergencyName', 'Emergency Name']) || '';
  var emergencyPhone = pick_(data, ['emergencyPhone', 'Emergency Phone']) || '';
  var emergency = [emergencyName, emergencyPhone].filter(Boolean).join(': ');

  var colIntake = bookingHeaderCol_(sheet, 'Intake Status');
  var colName = bookingHeaderCol_(sheet, 'Full Name Passport');
  var colDob = bookingHeaderCol_(sheet, 'DOB');
  var colEmergency = bookingHeaderCol_(sheet, 'Emergency Contact');
  var colDietary = bookingHeaderCol_(sheet, 'Dietary Req');
  var colMedical = bookingHeaderCol_(sheet, 'Medical Condition');
  var colMotion = bookingHeaderCol_(sheet, 'Motion Sickness');
  var colPhoto = bookingHeaderCol_(sheet, 'Photo Style');

  if (colIntake > 0) sheet.getRange(row, colIntake).setValue('Completed');
  if (colName > 0) sheet.getRange(row, colName).setValue(pick_(data, ['fullName', 'Full Name']) || '');
  if (colDob > 0) sheet.getRange(row, colDob).setValue(pick_(data, ['dob', 'DOB']) || '');
  if (colEmergency > 0) sheet.getRange(row, colEmergency).setValue(emergency);
  if (colDietary > 0) sheet.getRange(row, colDietary).setValue(dietaryText);
  if (colMedical > 0) sheet.getRange(row, colMedical).setValue(pick_(data, ['medical', 'Medical']) || '');
  if (colMotion > 0) {
    sheet.getRange(row, colMotion).setValue(pick_(data, ['motionSickness', 'Motion Sickness']) || '');
  }
  if (colPhoto > 0) sheet.getRange(row, colPhoto).setValue(photoText);

  return { status: 'ok', bookingId: bookingId, intakeStatus: 'Completed' };
}

function updateCheckedIn_(data) {
  var ss = ss_();
  var sheet = ss.getSheetByName(BOOKINGS_TAB);
  if (!sheet) {
    return { status: 'error', message: 'Customer_Bookings sheet not found' };
  }
  ensureBookingHeaders_(sheet);
  var bookingId = pick_(data, ['bookingId', 'Booking ID', 'Booking_ID']);
  var row = findRowByBookingId_(sheet, bookingId);
  if (row < 2) {
    return { status: 'error', message: 'Booking ID not found' };
  }
  var colChecked = bookingHeaderCol_(sheet, 'Checked In');
  var colCheckedAt = bookingHeaderCol_(sheet, 'Checked In At');
  if (colChecked > 0) sheet.getRange(row, colChecked).setValue('TRUE');
  if (colCheckedAt > 0) sheet.getRange(row, colCheckedAt).setValue(new Date().toISOString());
  return { status: 'ok', bookingId: bookingId, checkedIn: true };
}

function getBookingStatus_(data) {
  var ss = ss_();
  var sheet = ss.getSheetByName(BOOKINGS_TAB);
  if (!sheet || sheet.getLastRow() < 2) {
    return { status: 'ok', data: null };
  }
  ensureBookingHeaders_(sheet);
  var bookingId = pick_(data, ['bookingId', 'Booking ID', 'Booking_ID']);
  var row = findRowByBookingId_(sheet, bookingId);
  if (row < 2) {
    return { status: 'ok', data: null };
  }
  var width = Math.max(sheet.getLastColumn(), bookingHeaders_().length);
  var values = sheet.getRange(row, 1, 1, width).getValues()[0];
  var colBookingStatus = bookingHeaderCol_(sheet, 'Booking Status') - 1;
  var colIntake = bookingHeaderCol_(sheet, 'Intake Status') - 1;
  var colChecked = bookingHeaderCol_(sheet, 'Checked In') - 1;
  return {
    status: 'ok',
    data: {
      bookingId: String(values[0] || '').trim(),
      tourCode: String(values[2] || '').trim(),
      customerName: String(values[1] || '').trim(),
      bookingStatus: colBookingStatus >= 0 ? String(values[colBookingStatus] || '').trim() : '',
      intakeStatus:
        (colIntake >= 0 ? String(values[colIntake] || '').trim() : '') || 'Pending',
      checkedIn: colChecked >= 0 && String(values[colChecked] || '').trim().toUpperCase() === 'TRUE',
    },
  };
}

function getPendingIntakes_() {
  var ss = ss_();
  var sheet = ss.getSheetByName(BOOKINGS_TAB);
  if (!sheet || sheet.getLastRow() < 2) {
    return { status: 'ok', data: [] };
  }
  ensureBookingHeaders_(sheet);
  var lastRow = sheet.getLastRow();
  var numRows = lastRow - 1;
  var width = Math.max(sheet.getLastColumn(), bookingHeaders_().length);
  var rows = sheet.getRange(2, 1, numRows, width).getValues();
  var colIntake = bookingHeaderCol_(sheet, 'Intake Status') - 1;
  if (colIntake < 0) colIntake = 14;
  var pending = rows
    .filter(function (r) {
      return String(r[0] || '').trim() && String(r[colIntake] || '').trim() === 'Pending';
    })
    .map(function (r) {
      return {
        bookingId: String(r[0] || '').trim(),
        tourCode: String(r[2] || '').trim(),
        customerName: String(r[1] || '').trim(),
        bookingStatus: String(r[13] || '').trim(),
      };
    });
  return { status: 'ok', data: pending };
}

function appendConsent_(consent) {
  return { status: 'ok', message: 'Consents append not implemented in this snippet' };
}

/** Staff receipt upload (Tax Claim) — appended to the 'Expenses' tab. */
function expenseHeaders_() {
  return ['Date', 'Trip', 'Vendor', 'Category', 'Amount', 'GST', 'Image URL', 'Notes'];
}

function appendExpense_(data) {
  var d = data || {};
  var ss = ss_();
  var sheet = getOrCreateSheet_(ss, 'Expenses', expenseHeaders_());
  var amount = Number(pick_(d, ['amount', 'Amount'])) || 0;
  var gst = Number(pick_(d, ['gst_amount', 'GST'])) || 0;
  sheet.appendRow([
    pick_(d, ['receipt_date', 'Date']),
    pick_(d, ['trip_code', 'Trip']),
    pick_(d, ['vendor', 'Vendor']),
    pick_(d, ['category', 'Category']),
    amount,
    gst,
    pick_(d, ['image_url', 'Image URL']),
    pick_(d, ['notes', 'Notes']),
  ]);
  return { status: 'ok', message: 'Expense saved' };
}

/**
 * Sync การจองจากเว็บไซต์ (doPost action: 'addBooking').
 * Append "หนึ่งแถว" ลงแท็บ Tax_Year_2025_2026_Settlements โดย map ค่าให้ตรง
 * คอลัมน์ A-I ตามที่ทีมใช้: Synced At | Tour Code | Revenue | Expenses |
 * Commissions | Net Profit | GST Collected | GST Claimed | Sync Date.
 * Supabase คือ source of truth — แถวนี้เป็นเพียง mirror สำหรับทีม.
 *
 * การ map การจอง → settlement:
 *   Revenue     = amount (ยอดมัดจำ/ยอดที่จ่าย)
 *   Expenses    = 0
 *   Commissions = 0
 *   Net Profit  = amount
 *   GST Collected = amount / 11 (GST แบบรวมในราคาของออสเตรเลีย)
 *   GST Claimed = 0
 */
function settlementHeaders_() {
  return [
    'Synced At',
    'Tour Code',
    'Revenue',
    'Expenses',
    'Commissions',
    'Net Profit',
    'GST Collected',
    'GST Claimed',
    'Sync Date',
  ];
}

function appendBookingRow_(data) {
  var d = data || {};
  var ss = ss_();
  // ใช้แท็บที่มีอยู่แล้ว ถ้าไม่มีจึงสร้างพร้อม header
  var sheet = getOrCreateSheet_(ss, SETTLEMENTS_TAB, settlementHeaders_());
  var amount = Number(pick_(d, ['amount', 'Amount', 'revenue', 'Revenue'])) || 0;
  var nowIso = new Date().toISOString();
  var gstCollected = amount > 0 ? Math.round((amount / 11) * 100) / 100 : 0;
  sheet.appendRow([
    pick_(d, ['created_at', 'Synced At']) || nowIso, // A Synced At
    pick_(d, ['tour_code', 'Tour Code']),            // B Tour Code
    amount,                                          // C Revenue
    0,                                               // D Expenses
    0,                                               // E Commissions
    amount,                                          // F Net Profit
    gstCollected,                                    // G GST Collected
    0,                                               // H GST Claimed
    nowIso,                                          // I Sync Date
  ]);
  return { status: 'ok', message: 'Booking row appended to ' + SETTLEMENTS_TAB };
}

/**
 * เพิ่มค่า "Slots Booked" ของทริป (ตาม Tour Code) ในแท็บ 'Trip info'.
 * (doPost action: 'incrementSlot', { tour_code, by }).
 *
 * Supabase คือ source of truth ของจำนวนที่นั่ง (อัปเดต atomic ผ่าน RPC แล้ว) —
 * ฟังก์ชันนี้เป็นเพียงการ "mirror" ให้เจ้าของเห็นในชีต ไม่ใช่ตัวควบคุมการจอง.
 * ถ้าไม่พบคอลัมน์/แถว จะตอบ error แบบ non-blocking (ฝั่งเว็บไม่ทำให้การจองพัง).
 */
function incrementSlot_(data) {
  var d = data || {};
  var tourCode = pick_(d, ['tour_code', 'Trip Code', 'Tour Code', 'tourCode']);
  if (!tourCode) {
    return { status: 'error', message: 'tour_code is required' };
  }
  var by = Number(pick_(d, ['by', 'amount'])) || 1;

  var ss = ss_();
  var sh = ss.getSheetByName(TRIPS_TAB);
  if (!sh) {
    return { status: 'error', message: 'Missing tab: ' + TRIPS_TAB };
  }
  var values = sh.getDataRange().getValues();
  if (values.length < 2) {
    return { status: 'error', message: 'No trips in ' + TRIPS_TAB };
  }
  var headers = values[0].map(function (h) {
    return String(h || '').trim();
  });
  var codeCol = headerIndex_(headers, ['Trip Code', 'Tour Code', 'tourCode', 'tour_code']);
  var bookedCol = headerIndex_(headers, ['Slots Booked', 'slotsBooked', 'Booked']);
  if (codeCol < 0 || bookedCol < 0) {
    return { status: 'error', message: 'Missing Trip/Tour Code / Slots Booked column' };
  }
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][codeCol] || '').trim().toLowerCase() === tourCode.toLowerCase()) {
      var current = Number(values[r][bookedCol]) || 0;
      // รองรับทั้งเพิ่ม (+) และลด (−) ที่นั่ง; ไม่ให้กระจกเงาต่ำกว่า 0
      var next = current + by;
      if (next < 0) next = 0;
      sh.getRange(r + 1, bookedCol + 1).setValue(next);
      return { status: 'ok', tourCode: tourCode, slotsBooked: next };
    }
  }
  return { status: 'error', message: 'Tour Code not found in Trip info: ' + tourCode };
}

/** @deprecated — intake now updates Customer_Bookings via updateIntake_ */
function appendIntake_(intake) {
  return updateIntake_(intake);
}

function highlightsFromTripInfoRow_(r) {
  var parts = [];
  var keys = ['Highlight 1', 'Highlight 2', 'Highlight 3', 'Highlight 4'];
  for (var i = 0; i < keys.length; i++) {
    var v = pick_(r, [keys[i]]);
    if (v) parts.push(v);
  }
  if (parts.length) return parts.join(', ');
  return pick_(r, ['highlights', 'Highlights']);
}

function normalizeTripRow_(r) {
  var durationLabel = pick_(r, ['Duration', 'durationLabel']);
  var durationDays =
    Number(pick_(r, ['durationDays', 'Duration Days', 'days']) || 0) ||
    durationDaysFromDurationLabel_(durationLabel) ||
    1;
  var season = pick_(r, ['season', 'Season']).toLowerCase();
  var tripType = pick_(r, ['tripType', 'Trip Type', 'trip_type']).toLowerCase();
  if (!tripType) {
    tripType = durationDays > 1 ? 'overnight' : 'one_day';
  }
  var maxPax = pick_(r, ['maxPax', 'Max Pax', 'slotsMax', 'Slots Max']);
  return {
    tourCode: pick_(r, ['tourCode', 'Trip Code', 'Tour Code', 'tour_code', 'tripCode']),
    tourName: pick_(r, ['tourName', 'Tour Name', 'tour_name']),
    countryTag: pick_(r, ['countryTag', 'Country Tag', 'country_tag']),
    weather: pick_(r, ['weather', 'Weather']),
    messengerUrl: pick_(r, ['messengerUrl', 'Messenger', 'messenger_url']),
    coverUrl: pick_(r, ['coverUrl', 'Cover', 'cover_url', 'Cover Image URL']),
    seasonGroup: season === 'all' ? 'all_year' : pick_(r, ['seasonGroup', 'Category', 'season_group']) || 'seasonal',
    city: pick_(r, ['city', 'City']),
    durationDays: durationDays,
    priceStandardAud: pick_(r, ['priceStandardAud', 'Standard Price', 'standardPrice', 'Standard', 'Price']),
    pricePrivateAud: pick_(r, ['pricePrivateAud', 'Private Price', 'privatePrice', 'Private']),
    tripType: tripType,
    season: season,
    highlights: highlightsFromTripInfoRow_(r),
    maxPax: maxPax,
    categoryCode: pick_(r, ['categoryCode', 'Tour Category Code']),
    categoryName: pick_(r, ['categoryName', 'Category Name']),
    basePriceAud: pick_(r, ['basePriceAud', 'Base Price', 'Starting Price']),
    depositAud: pick_(r, ['depositAud', 'Deposit']),
    dormitoryPolicy: pick_(r, ['dormitoryPolicy', 'Dormitory Policy']),
    dormUpgradeNote: pick_(r, ['dormUpgradeNote', 'Dorm Upgrade']),
    departureStart: pick_(r, ['departureStart', 'Departure Start', 'Departure Date', 'Start Date']),
    departureEnd: pick_(r, ['departureEnd', 'Departure End', 'End Date']),
    sheetStatus: pick_(r, ['Status', 'status']),
    pickupType: pick_(r, ['pickupType', 'Pickup Type', 'pickup_type']) || pick_(r, ['Meeting Point']),
    slotsBooked: pick_(r, ['slotsBooked', 'Slots Booked', 'Booked']),
    slotsMax: maxPax || pick_(r, ['slotsMax', 'Slots Max', 'Capacity']),
    spots: [],
    itinerary: [],
  };
}

function pick_(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (obj[keys[i]] != null && String(obj[keys[i]]).trim() !== '') {
      return String(obj[keys[i]]).trim();
    }
  }
  return '';
}

function masterTripsSeed_() {
  return [
    {
      tourCode: 'MEL-4D3N',
      tourName: 'Secret Southern Coast (4D3N)',
      countryTag: 'AU-VIC',
      weather: 'Autumn 14-18°C',
      standardPrice: 1550,
      privatePrice: 2300,
      tripType: 'overnight',
      season: 'autumn',
      durationDays: 4,
      maxPax: 5,
      highlights: 'Great Ocean Road, Pink Lake, Melbourne City',
      pickupType: 'airport_terminal',
      coverUrl: 'https://images.unsplash.com/photo-1514395462725-7b8b0e7f0870?w=1200&q=80',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
    },
    {
      tourCode: 'ULU-4D3N',
      tourName: 'The Red Desert Odyssey (4D3N)',
      countryTag: 'AU-NT',
      weather: 'Desert 28°C day / 8°C night',
      standardPrice: 1690,
      privatePrice: 1690,
      tripType: 'overnight',
      season: 'all',
      durationDays: 4,
      maxPax: 5,
      highlights: 'Uluru Sunrise, Field of Light, Kata Tjuta',
      pickupType: 'airport_terminal',
      coverUrl: 'https://images.unsplash.com/photo-1523482580695-1581f6760c66?w=1200&q=80',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
    },
    {
      tourCode: 'NZ-6D5N',
      tourName: 'The Alpine Kingdom (6D5N)',
      countryTag: 'NZ-SI',
      weather: 'Varies by season',
      standardPrice: 2300,
      privatePrice: 2300,
      tripType: 'overnight',
      season: 'all',
      durationDays: 6,
      maxPax: 5,
      highlights: 'Lake Tekapo, Milford Sound, Wanaka, Mt Cook',
      pickupType: 'airport_terminal',
      coverUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
    },
    {
      tourCode: 'TAS-3D2N',
      tourName: 'Tasmania Mini Aurora Hunt (3D2N)',
      countryTag: 'AU-TAS',
      weather: 'Winter 6-12°C',
      standardPrice: 1350,
      privatePrice: 1650,
      tripType: 'overnight',
      season: 'winter',
      durationDays: 3,
      maxPax: 6,
      highlights: 'Mt Wellington Aurora Hunt, Bruny Island, MONA',
      pickupType: 'airport_terminal',
      coverUrl:
        'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Launceston/596811714_1428639069261190_2753284779604496226_n.jpg',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
    },
    {
      tourCode: 'TAS-LH-4D3N',
      tourName: 'Tasmania Summer: Launceston – Hobart (4D3N)',
      countryTag: 'AU-TAS',
      weather: 'Summer 16-22°C',
      standardPrice: 1650,
      privatePrice: 1850,
      tripType: 'overnight',
      season: 'summer',
      durationDays: 4,
      maxPax: 6,
      highlights: 'Bridestowe Lavender, Cradle Mountain, MONA',
      pickupType: 'airport_terminal',
      coverUrl:
        'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Tasmania/Launceston/596371362_1428639202594510_8709278754225773992_n.jpg',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
    },
    {
      tourCode: 'KIA-1DAY',
      tourName: 'The Coastal Cliffs (1 Day)',
      countryTag: 'AU-NSW',
      weather: 'Winter 12-16°C',
      standardPrice: 250,
      privatePrice: 290,
      tripType: 'one_day',
      season: 'winter',
      durationDays: 1,
      maxPax: 4,
      highlights: 'Helensburgh Station, Seacliff Bridge, Bombo Headland',
      pickupType: 'thaitown_main',
      coverUrl: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1200&q=80',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
    },
    {
      tourCode: 'CAN-2D1N',
      tourName: 'The Golden Fields (2D1N)',
      countryTag: 'AU-NSW',
      weather: 'Spring 18-24°C',
      standardPrice: 380,
      privatePrice: 380,
      tripType: 'overnight',
      season: 'spring',
      durationDays: 2,
      maxPax: 4,
      highlights: 'Canola Fields, Cowra Old Town, Japanese Garden',
      pickupType: 'thaitown_main',
      coverUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
    },
    {
      tourCode: 'SYD-1DAY',
      tourName: 'Secret Sydney (1 Day)',
      countryTag: 'AU-NSW',
      weather: 'All seasons',
      standardPrice: 250,
      privatePrice: 680,
      tripType: 'one_day',
      season: 'all',
      durationDays: 1,
      maxPax: 4,
      highlights: 'Sydney Hidden Gems, Milky Way Hunt, Anna Bay Dunes',
      pickupType: 'thaitown_main',
      coverUrl: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=1200&q=80',
      messengerUrl: 'https://m.me/trip2talk.chapter99',
    },
  ];
}

function seedTripsArray_(trips) {
  var saved = [];
  for (var i = 0; i < trips.length; i++) {
    saved.push(upsertTrip_(trips[i]).tourCode);
  }
  return { status: 'ok', message: 'Seeded ' + saved.length + ' trips', tourCodes: saved };
}

function seedMasterTrips_() {
  return seedTripsArray_(masterTripsSeed_());
}
