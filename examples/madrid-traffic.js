var map = L.map('map', {
    center: [40.4168, -3.7038],
    zoom: 12,
    maxBounds: [[40.30, -3.85], [40.55, -3.55]],
    maxBoundsViscosity: 1.0
});

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var sensors = [];
var timeslices = {};
var timeKeys = [];
var markers = {};
var currentSlotIndex = 0;
var playing = false;
var playInterval = null;

var playBtn = document.getElementById('play-btn');
var timeSlider = document.getElementById('time-slider');
var timeDisplay = document.getElementById('time-display');
var statMin = document.getElementById('stat-min');
var statMax = document.getElementById('stat-max');
var statAvg = document.getElementById('stat-avg');
var sensorCountEl = document.getElementById('sensor-count');

function getColor(intensity) {
    if (intensity >= 800) return '#e74c3c';
    if (intensity >= 500) return '#e67e22';
    if (intensity >= 200) return '#f1c40f';
    return '#2ecc71';
}

function getRadius(intensity) {
    var clamped = Math.min(Math.max(intensity, 0), 1200);
    return 6 + (clamped / 1200) * 6;
}

function formatTime(slotIndex) {
    var totalMinutes = slotIndex * 15;
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    return (hours < 10 ? '0' : '') + hours + ':' + (minutes < 10 ? '0' : '') + minutes;
}

function buildPopupContent(sensor, intensity) {
    var props = sensor.properties;
    var intensityVal = intensity !== undefined ? intensity : '—';
    return '<b>' + (props.name || 'Sensor') + '</b><br>' +
        'ID: ' + (props.id || '—') + '<br>' +
        'Intensity: <b>' + intensityVal + '</b> vehicles/hour<br>' +
        'Highway: ' + (props.highway || '—') + '<br>' +
        'Lanes: ' + (props.lanes || '—') + '<br>' +
        'Max speed: ' + (props.maxspeed || '—') + ' km/h';
}

function createMarkers(geojson) {
    geojson.features.forEach(function(feature) {
        var coords = feature.geometry.coordinates;
        var latlng = [coords[1], coords[0]];
        var id = feature.properties.id;

        var marker = L.circleMarker(latlng, {
            radius: 6,
            fillColor: '#999',
            color: '#fff',
            weight: 1,
            opacity: 0.9,
            fillOpacity: 0.8
        }).addTo(map);

        marker.bindPopup(buildPopupContent(feature, undefined));
        marker._sensorFeature = feature;
        markers[id] = marker;
    });

    sensorCountEl.textContent = geojson.features.length + ' sensors loaded';
}

function updateMarkers(timeKey) {
    var slotData = timeslices[timeKey] || {};
    var intensities = [];

    Object.keys(markers).forEach(function(sensorId) {
        var marker = markers[sensorId];
        var intensity = slotData[sensorId];

        if (intensity !== undefined && intensity !== null) {
            var color = getColor(intensity);
            var radius = getRadius(intensity);
            marker.setStyle({ fillColor: color, radius: radius });
            marker.setPopupContent(buildPopupContent(marker._sensorFeature, intensity));
            intensities.push(intensity);
        } else {
            marker.setStyle({ fillColor: '#999', radius: 6 });
            marker.setPopupContent(buildPopupContent(marker._sensorFeature, undefined));
        }
    });

    timeDisplay.textContent = formatTime(currentSlotIndex);
    timeSlider.value = currentSlotIndex;

    if (intensities.length > 0) {
        var min = Math.min.apply(null, intensities);
        var max = Math.max.apply(null, intensities);
        var sum = intensities.reduce(function(a, b) { return a + b; }, 0);
        var avg = Math.round(sum / intensities.length);
        statMin.textContent = min;
        statMax.textContent = max;
        statAvg.textContent = avg;
    } else {
        statMin.textContent = '—';
        statMax.textContent = '—';
        statAvg.textContent = '—';
    }
}

function advanceSlot() {
    currentSlotIndex = (currentSlotIndex + 1) % 96;
    if (timeKeys.length > 0) {
        updateMarkers(timeKeys[currentSlotIndex]);
    }
}

function togglePlay() {
    if (playing) {
        playing = false;
        clearInterval(playInterval);
        playInterval = null;
        playBtn.textContent = '▶ Play';
    } else {
        playing = true;
        playBtn.textContent = '⏸ Pause';
        playInterval = setInterval(advanceSlot, 2000);
    }
}

playBtn.addEventListener('click', togglePlay);

timeSlider.addEventListener('input', function() {
    currentSlotIndex = parseInt(this.value, 10);
    if (timeKeys.length > 0) {
        updateMarkers(timeKeys[currentSlotIndex]);
    }
});

function generateTimeKeys() {
    var keys = [];
    for (var i = 0; i < 96; i++) {
        keys.push(formatTime(i));
    }
    return keys;
}

Promise.all([
    fetch('madrid-sensors.geojson').then(function(r) { return r.json(); }),
    fetch('timeslices.json').then(function(r) { return r.json(); })
]).then(function(results) {
    var geojson = results[0];
    var slices = results[1];

    sensors = geojson.features;
    timeslices = slices;
    timeKeys = Object.keys(slices).sort();

    if (timeKeys.length === 0) {
        timeKeys = generateTimeKeys();
    }

    timeSlider.max = timeKeys.length - 1;
    createMarkers(geojson);
    updateMarkers(timeKeys[0]);
}).catch(function(err) {
    console.error('Failed to load data:', err);
    sensorCountEl.textContent = 'Error loading data. Ensure madrid-sensors.geojson and timeslices.json exist.';
});
