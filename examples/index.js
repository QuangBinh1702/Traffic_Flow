var map = L.map('map', { center: [20, 0], zoom: 2 }),
    realtime = L.realtime('https://wanderdrone.appspot.com/', {
        interval: 3 * 1000
    }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

realtime.on('update', function() {
    map.fitBounds(realtime.getBounds(), {maxZoom: 3});
});
