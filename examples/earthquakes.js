function createRealtimeLayer(url, container) {
    return L.realtime(url, {
        interval: 60 * 1000,
        getFeatureId: function(f) {
            return f.properties.url;
        },
        cache: true,
        container: container,
        onEachFeature(f, l) {
            l.bindPopup(function() {
                return '<h3>' + f.properties.place + '</h3>' +
                    '<p>' + new Date(f.properties.time) +
                    '<br/>Magnitude: <strong>' + f.properties.mag + '</strong></p>' +
                    '<p><a href="' + f.properties.url + '">More information</a></p>';
            });
        }
    });
}

// Layer Đà Nẵng - dùng getFeatureId từ id, popup hiển thị name/volume
function createDaNangLayer(url, container) {
    return L.realtime(url, {
        interval: 30 * 1000,
        getFeatureId: function(f) {
            return f.properties.id;
        },
        cache: false,
        container: container,
        onEachFeature: function(f, l) {
            l.bindPopup('<h3>' + (f.properties.name || '') + '</h3>' +
                '<p>Lưu lượng: <strong>' + (f.properties.volume || 0) + '</strong> xe</p>' +
                '<p>' + (f.properties.description || '') + '</p>');
        }
    });
}

var map = L.map('map', {
    center: [16.0544, 108.2022],
    zoom: 12,
    maxZoom: 19,
    minZoom: 2
}),
    clusterGroup = L.markerClusterGroup().addTo(map),
    subgroup1 = L.featureGroup.subGroup(clusterGroup),
    subgroup2 = L.featureGroup.subGroup(clusterGroup),
    subgroup3 = L.featureGroup.subGroup(clusterGroup),
    realtime1 = createRealtimeLayer('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson', subgroup1).addTo(map),
    realtime2 = createRealtimeLayer('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson', subgroup2),
    realtime3 = createDaNangLayer('danang-test.geojson', subgroup3).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php">USGS Earthquake Hazards Program</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

L.control.layers(null, {
    'Earthquakes 2.5+': realtime1,
    'All Earthquakes': realtime2,
    'Đà Nẵng (test)': realtime3
}).addTo(map);

// Zoom vào Đà Nẵng khi layer test load xong (file local load nhanh)
realtime3.once('update', function() {
    if (realtime3.getBounds && realtime3.getBounds().isValid()) {
        map.fitBounds(realtime3.getBounds(), {maxZoom: 14, padding: [30, 30]});
    }
});
