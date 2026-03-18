const fs = require('fs');
const path = require('path');
const readline = require('readline');

const INPUT = path.join(__dirname, '..', 'data_raw.csv');
const GEOJSON_OUT = path.join(__dirname, '..', 'examples', 'madrid-sensors.geojson');
const TIMESLICES_OUT = path.join(__dirname, '..', 'examples', 'timeslices.json');
const SAMPLE_DATE = '2022-06-01';

const sensors = new Map();   // id -> { longitude, latitude, name, highway, lanes, maxspeed, oneway }
const timeslices = {};       // "HH:MM" -> { sensorId: intensity }

const rl = readline.createInterface({
  input: fs.createReadStream(INPUT, { encoding: 'utf8' }),
  crlfDelay: Infinity
});

let lineNum = 0;
let headerMap = {};

rl.on('line', (line) => {
  lineNum++;
  if (lineNum === 1) {
    const headers = line.split(',');
    headers.forEach((h, i) => { headerMap[h.trim()] = i; });
    return;
  }

  // Parse CSV — handle the name field which may contain commas inside quotes
  // Columns: id, date, longitude, latitude, traffic_intensity, day_type, wind, temperature,
  //          precipitation, original_point, closest_point, oneway, lanes, name, highway, maxspeed, length
  const parts = [];
  let current = '';
  let inParens = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '(') inParens++;
    else if (ch === ')') inParens--;
    if (ch === ',' && inParens === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);

  const id = parts[headerMap['id']];
  const date = parts[headerMap['date']];
  const longitude = parseFloat(parts[headerMap['longitude']]);
  const latitude = parseFloat(parts[headerMap['latitude']]);
  const intensity = parseInt(parts[headerMap['traffic_intensity']], 10);
  const name = parts[headerMap['name']];
  const highway = parts[headerMap['highway']];
  const lanes = parts[headerMap['lanes']];
  const maxspeed = parts[headerMap['maxspeed']];
  const oneway = parts[headerMap['oneway']];

  // Collect unique sensor metadata (take first occurrence)
  if (!sensors.has(id)) {
    sensors.set(id, { longitude, latitude, name, highway, lanes, maxspeed, oneway });
  }

  // Collect traffic intensity for the sample date
  if (date && date.startsWith(SAMPLE_DATE)) {
    // date format: "2022-06-01 00:00:00"
    const timePart = date.split(' ')[1]; // "00:00:00"
    const timeKey = timePart.substring(0, 5);  // "00:00"
    if (!timeslices[timeKey]) timeslices[timeKey] = {};
    timeslices[timeKey][id] = intensity;
  }
});

rl.on('close', () => {
  // Build GeoJSON
  const features = [];
  for (const [id, s] of sensors) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.longitude, s.latitude] },
      properties: { id, name: s.name, highway: s.highway, lanes: s.lanes, maxspeed: s.maxspeed, oneway: s.oneway }
    });
  }
  const geojson = { type: 'FeatureCollection', features };
  fs.writeFileSync(GEOJSON_OUT, JSON.stringify(geojson, null, 2), 'utf8');
  console.log(`Sensors found: ${sensors.size}`);
  console.log(`GeoJSON written to ${GEOJSON_OUT}`);

  // Sort timeslices keys chronologically
  const sorted = {};
  Object.keys(timeslices).sort().forEach(k => { sorted[k] = timeslices[k]; });
  fs.writeFileSync(TIMESLICES_OUT, JSON.stringify(sorted, null, 2), 'utf8');
  const sliceCount = Object.keys(sorted).length;
  console.log(`Time slices created: ${sliceCount}`);
  console.log(`Timeslices written to ${TIMESLICES_OUT}`);
  console.log(`Lines processed: ${lineNum - 1}`);
});
