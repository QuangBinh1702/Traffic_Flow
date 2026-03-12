# Leaflet Realtime – Tài liệu ngữ cảnh (Context for AI)

File này tổng hợp các câu hỏi đã trao đổi và thông tin quan trọng về dự án. **Khi tiếp tục hỏi, hãy đính kèm file này để AI hiểu rõ bối cảnh.**

---

## 1. Dự án này là gì?

- **leaflet-realtime**: Plugin mở rộng cho [Leaflet](https://leafletjs.com/), dùng để hiển thị **GeoJSON realtime** trên bản đồ.
- Giúp tự động **poll** API/URL, cập nhật markers/lines/polygons mà không cần viết logic fetch/cập nhật thủ công.

### Cấu trúc chính

| Thành phần | Mô tả |
|------------|--------|
| `src/L.Realtime.js` | Mã nguồn plugin |
| `dist/leaflet-realtime.js` | File build để dùng trên web |
| `examples/` | Demo: index (drone), earthquakes, trail |

---

## 2. Cách chạy dự án

```bash
cd D:/pbl7/leaflet-realtime
python -m http.server 8080
```

Hoặc: `npx serve . -p 8080`

Truy cập:
- `http://localhost:8080/examples/index.html`
- `http://localhost:8080/examples/earthquakes.html`
- `http://localhost:8080/examples/trail.html`

---

## 3. Có gọi API không? Custom code được không?

### Gọi API
- **Có.** Mặc định plugin dùng **Fetch API** để gọi URL theo chu kỳ (polling).
- `setInterval` → mỗi `interval` ms gọi `fetch(url)` → parse GeoJSON → vẽ lên map.

### Custom code
- **URL string**: `L.realtime('https://api.com/data.geojson', { interval: 5000 })`
- **Custom function**: `L.realtime(function(success, error) { ... }, options)`
- **Push thủ công**: `L.realtime(null, { start: false })` rồi gọi `realtime.update(geojson)`

### Sửa map
- Map là Leaflet thông thường: đổi tile, center, zoom, style, thêm layer, control, v.v.

---

## 4. API được gọi là gì?

| Demo | URL API | Mô tả |
|------|---------|-------|
| index.html | `https://wanderdrone.appspot.com/` | Vị trí drone (có thể đã lỗi) |
| earthquakes.html | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson` | Động đất 2.5+ trong 7 ngày |
| earthquakes.html | `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson` | Động đất trong 1 giờ |
| trail.html | `https://wanderdrone.appspot.com/` | Drone cho vẽ trail |

API trả về **GeoJSON**.

---

## 5. Dự án lưu lượng xe Đà Nẵng – giải pháp

### Nguồn dữ liệu
- Không có API công khai miễn phí cho giao thông Đà Nẵng.
- Cần tự cung cấp: backend API hoặc file GeoJSON (mô phỏng/demo).

### GeoJSON mẫu

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": "1",
        "name": "Cầu Rồng",
        "volume": 150,
        "level": "high"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [108.2217, 16.0617]
      }
    }
  ]
}
```

### Map Đà Nẵng
- Center: `[16.0544, 108.2022]`
- Zoom: 12–13

### Gợi ý triển khai
1. Tạo `traffic-danang.geojson` (mẫu hoặc thật).
2. Tạo `traffic-danang.html` + `traffic-danang.js`.
3. `L.realtime('traffic-danang.geojson', { interval: 5000 })` hoặc URL API khi có backend.
4. Dùng `pointToLayer`, `style`, `onEachFeature` để hiển thị theo `volume` (màu, kích thước).

---

## 6. Các thay đổi đã áp dụng trong dự án

- Tile layer: chuyển `http` → `https` (OpenStreetMap).
- Leaflet: nâng lên phiên bản 1.9.4.
- `index.js`: thêm center `[20, 0]`, zoom 2 mặc định.

---

## Lưu ý khi tiếp tục hỏi

- Dự án: `leaflet-realtime`, workspace: `d:\pbl7\leaflet-realtime`
- Hướng phát triển: lưu lượng xe Đà Nẵng, hiển thị GeoJSON realtime trên map.
- Đã bàn: cách chạy, API, custom code, cấu trúc GeoJSON, giải pháp traffic Đà Nẵng.
