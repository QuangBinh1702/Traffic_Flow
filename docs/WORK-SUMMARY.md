# Tóm tắt công việc đã thực hiện — Madrid Traffic Visualization

> **Ngày thực hiện:** 18/03/2026  
> **Dự án:** leaflet-realtime (`d:\pbl7\leaflet-realtime`)  
> **Bài báo tham chiếu:** [Enriched Traffic Datasets for Madrid](https://www.sciencedirect.com/science/article/pii/S2352340924008412) (Iván Gómez, Sergio Ilarri — Universidad de Zaragoza)

---

## Tổng quan

Xây dựng trang **hiển thị bản đồ giao thông Madrid** sử dụng dữ liệu từ bài báo nghiên cứu, với 300 cảm biến giao thông, mô phỏng cập nhật lưu lượng xe mỗi 15 phút trong 1 ngày.

---

## 1. Phân tích ban đầu

### 1.1. Đánh giá project hiện tại
- **Project `leaflet-realtime`** là plugin mở rộng cho Leaflet.js, dùng polling GeoJSON realtime.
- Các ví dụ có sẵn: `index.html` (drone), `earthquakes.html` (động đất), `trail.html` (trail).
- **Kết luận:** Project phù hợp cho việc hiển thị bản đồ giao thông Madrid. Tuy nhiên, vì dữ liệu là historical (lịch sử) chứ không phải live, nên dùng cách load thủ công thay vì plugin `leaflet-realtime`.

### 1.2. Phân tích bài báo
- Đọc và phân tích bài báo tại ScienceDirect.
- Bài báo cung cấp 2 dataset:
  - **DADAS** (Descriptive Analysis DAtaSet): Dữ liệu mô tả, có tọa độ thật (lat/lon), 18 triệu dòng, 300 cảm biến.
  - **MLDAS** (ML-oriented DAtaSet): Dữ liệu cho ML, latitude/longitude đã bị **StandardScaler chuẩn hóa** → không dùng trực tiếp lên bản đồ.
- Dữ liệu được thu thập từ 01/06/2022 đến 29/02/2024, mỗi 15 phút.
- Lưu lượng tính bằng **vehicles/hour** (xe/giờ).
- Nguồn: Madrid Open Data Portal + OpenStreetMap + Weather data + Calendar data.

### 1.3. Phân tích dữ liệu hiện có
- **`data.csv`** (file ban đầu trong project): Đây là dataset **MLDAS** — latitude/longitude đã chuẩn hóa (giá trị ~0.44, -0.87 thay vì ~40.4, -3.7). **Không dùng được** để vẽ bản đồ.
- **`data_raw.csv`** (file DADAS, user cung cấp): Có tọa độ thật, ~3.8GB, 18,012,128 dòng, 300 cảm biến. **Đây là file chính được sử dụng.**

### 1.4. Thông tin kỹ thuật từ bài báo
- 300 cảm biến được chọn bằng thuật toán **K-Means** (cluster 300 nhóm, chọn sensor đại diện gần centroid nhất).
- Cảm biến chủ yếu là **electromagnetic loops** (vòng điện từ dưới mặt đường).
- Source code tạo dataset: [github.com/TrafficDator/TrafficDator](https://github.com/TrafficDator/TrafficDator).
- File vị trí sensor gốc: `pmed_localization_10_2024.csv` từ Madrid Open Data Portal.

### 1.5. Tham khảo Oracle (AI advisor)
- Hỏi Oracle đánh giá xem Leaflet + leaflet-realtime có phù hợp không.
- **Kết luận Oracle:** Phù hợp. 300 point là trivial cho Leaflet. Khuyên dùng static geometry + dynamic properties. Không reverse-engineer scaled coords mà dùng DADAS.

---

## 2. Các file đã tạo

### 2.1. `scripts/extract-data.js` — Script trích xuất dữ liệu
**Mục đích:** Đọc file `data_raw.csv` (~3.8GB) bằng Node.js streaming và tạo ra 2 file dữ liệu cho frontend.

**Cách hoạt động:**
- Sử dụng `readline` interface để stream từng dòng (vì file quá lớn, không đọc vào RAM được).
- Parse CSV thủ công, xử lý trường hợp dấu ngoặc `()` trong cột `original_point` và `closest_point`.
- Trích xuất metadata 300 sensor duy nhất (lấy lần xuất hiện đầu tiên).
- Trích xuất lưu lượng giao thông cho ngày mẫu **2022-06-01** (96 time slots × 300 sensors).

**Input:** `data_raw.csv`  
**Output:**
- `examples/madrid-sensors.geojson`
- `examples/timeslices.json`

**Cách chạy:**
```bash
node scripts/extract-data.js
```

**Kết quả chạy:**
- 18,012,128 dòng đã xử lý
- 300 sensors tìm thấy
- 96 time slices tạo thành công

---

### 2.2. `examples/madrid-sensors.geojson` — Vị trí 300 cảm biến
**Mục đích:** GeoJSON FeatureCollection chứa vị trí thật của 300 cảm biến giao thông Madrid.

**Cấu trúc mỗi Feature:**
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-3.71396616510212, 40.439020177168]
  },
  "properties": {
    "id": "3397",
    "name": "Calle de Cea Bermúdez",
    "highway": "tertiary",
    "lanes": "2.0",
    "maxspeed": "50.0",
    "oneway": "True"
  }
}
```

**Properties giải thích:**
| Trường | Mô tả |
|--------|--------|
| `id` | ID cảm biến (từ Madrid Open Data Portal) |
| `name` | Tên đường nơi đặt cảm biến |
| `highway` | Loại đường theo phân loại OpenStreetMap (tertiary, primary, secondary, motorway, residential, ...) |
| `lanes` | Số làn đường |
| `maxspeed` | Tốc độ tối đa cho phép (km/h) |
| `oneway` | Đường một chiều hay không |

**Phạm vi tọa độ:**
- Latitude: ~40.33 đến ~40.53 (khu vực Madrid)
- Longitude: ~-3.84 đến ~-3.58

---

### 2.3. `examples/timeslices.json` — Dữ liệu lưu lượng theo thời gian
**Mục đích:** Chứa lưu lượng giao thông của tất cả cảm biến theo từng khoảng 15 phút trong ngày 2022-06-01.

**Cấu trúc:**
```json
{
  "00:00": { "3397": 209, "3405": 234, "3411": 394, ... },
  "00:15": { "3397": 201, "3405": 220, "3411": 380, ... },
  ...
  "23:45": { "3397": 270, "3405": 180, "3411": 310, ... }
}
```

- **96 time slots** (24 giờ × 4 lần/giờ = 96)
- Mỗi slot chứa mapping: `sensor_id → traffic_intensity` (vehicles/hour)
- Một số sensor có thể thiếu dữ liệu ở một số slot (ví dụ: slot 08:00 có 291/300 sensors)

---

### 2.4. `examples/madrid-traffic.html` — Trang web bản đồ
**Mục đích:** Trang HTML hiển thị bản đồ giao thông Madrid với control panel.

**Thành phần:**
- **Bản đồ** toàn màn hình sử dụng Leaflet 1.9.4
- **Control panel** (góc phải trên):
  - Tiêu đề "Madrid Traffic Sensors"
  - Hiển thị giờ hiện tại (font lớn, ví dụ: "08:15")
  - Nút **Play/Pause** để tự động chạy
  - **Slider** kéo đến bất kỳ thời điểm nào trong ngày
  - **Legend** (chú thích màu):
    - 🟢 Xanh lá: Low (0–200 v/h)
    - 🟡 Vàng: Medium (200–500 v/h)
    - 🟠 Cam: High (500–800 v/h)
    - 🔴 Đỏ: Very High (800+ v/h)
  - **Thống kê:** Min / Max / Avg intensity cho time slot hiện tại
  - Số lượng cảm biến đã load

**Styling:**
- Control panel: nền tối bán trong suốt (`rgba(30,30,30,0.88)`), chữ trắng, bo góc
- Responsive font sizes
- Leaflet CSS/JS load từ unpkg CDN

---

### 2.5. `examples/madrid-traffic.js` — Logic JavaScript
**Mục đích:** Toàn bộ logic hiển thị bản đồ và cập nhật dữ liệu.

**Chức năng chi tiết:**

#### a. Khởi tạo bản đồ
```javascript
center: [40.4168, -3.7038]  // Trung tâm Madrid
zoom: 12
maxBounds: [[40.30, -3.85], [40.55, -3.55]]  // Giới hạn khu vực Madrid
```
- Tile layer: OpenStreetMap (HTTPS)
- `maxBoundsViscosity: 1.0` — không cho kéo ra ngoài Madrid

#### b. Hệ thống màu sắc lưu lượng
```
getColor(intensity):
  >= 800 → #e74c3c (đỏ)
  >= 500 → #e67e22 (cam)
  >= 200 → #f1c40f (vàng)
  < 200  → #2ecc71 (xanh lá)
```

#### c. Kích thước marker
```
getRadius(intensity):
  Tỷ lệ tuyến tính từ 6px (intensity=0) đến 12px (intensity=1200+)
```

#### d. CircleMarker cho mỗi cảm biến
- Viền trắng 1px, fill opacity 0.8
- Popup hiển thị: tên đường, ID, lưu lượng, loại đường, số làn, tốc độ tối đa

#### e. Cập nhật theo thời gian
- **Auto-play:** Mỗi 2 giây chuyển sang time slot tiếp theo (1 ngày chạy hết trong ~3 phút 12 giây)
- **Manual:** Kéo slider để nhảy đến bất kỳ thời điểm nào
- Khi cập nhật: thay đổi màu, kích thước, nội dung popup của tất cả 300 marker
- Vòng lặp: khi hết 23:45 sẽ quay lại 00:00

#### f. Thống kê realtime
- Tính Min/Max/Avg intensity cho tất cả sensors có dữ liệu tại time slot hiện tại

---

## 3. File tạm đã tạo (có thể xóa)

| File | Mô tả | Trạng thái |
|------|--------|------------|
| `sensors_scaled.json` | 300 sensor IDs với tọa độ đã chuẩn hóa từ `data.csv`. Tạo khi cố reverse-engineer tọa độ. | **Không cần nữa** — có thể xóa |

---

## 4. Cách chạy

### Bước 1: (Đã chạy) Trích xuất dữ liệu
```bash
cd d:/pbl7/leaflet-realtime
node scripts/extract-data.js
```
Output: `examples/madrid-sensors.geojson` + `examples/timeslices.json`

### Bước 2: Khởi động server
```bash
npx serve . -p 8080
```

### Bước 3: Truy cập
```
http://localhost:8080/examples/madrid-traffic.html
```

---

## 5. Kiến trúc tổng thể

```
data_raw.csv (3.8GB, 18M rows)
       │
       ▼
scripts/extract-data.js (Node.js streaming)
       │
       ├──► examples/madrid-sensors.geojson (300 sensors, tọa độ thật)
       │
       └──► examples/timeslices.json (96 time slots, lưu lượng mỗi 15 phút)
                │
                ▼
examples/madrid-traffic.html + madrid-traffic.js
                │
                ▼
        Leaflet Map (Madrid, zoom 12)
        ├── 300 CircleMarkers (màu theo lưu lượng)
        ├── Auto-play mỗi 2s
        ├── Slider chọn thời gian
        ├── Legend + Stats
        └── Popup thông tin cảm biến
```

---

## 6. Ghi chú kỹ thuật

### Tại sao không dùng `data.csv` (MLDAS)?
- File `data.csv` là dataset MLDAS dành cho Machine Learning.
- Latitude/Longitude đã bị **StandardScaler** chuẩn hóa: `scaled = (x - mean) / std`.
- Giá trị lat ~0.44 thay vì ~40.44 → không hiển thị đúng trên bản đồ.
- Cần file `data_raw.csv` (DADAS) với tọa độ gốc.

### Tại sao không dùng plugin leaflet-realtime?
- Plugin `leaflet-realtime` thiết kế cho **live polling** (gọi API liên tục).
- Dữ liệu Madrid là **lịch sử** (historical), đã có sẵn toàn bộ.
- Load 1 lần rồi playback nhanh hơn và đơn giản hơn polling.

### Tại sao dùng Node.js streaming?
- File `data_raw.csv` nặng ~3.8GB.
- `fs.readFileSync()` sẽ crash vì vượt giới hạn string JS (~512MB).
- `readline.createInterface()` đọc từng dòng, dùng ít RAM.

### Ngày mẫu: 2022-06-01
- Là ngày đầu tiên trong dataset (Working day, tháng 6).
- Có thể thay đổi `SAMPLE_DATE` trong `extract-data.js` để dùng ngày khác.

---

## 7. Các nguồn đã tham khảo

| Nguồn | Mục đích |
|-------|----------|
| [Bài báo ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2352340924008412) | Hiểu cấu trúc dataset, ý nghĩa các trường dữ liệu |
| [Mendeley Data](https://data.mendeley.com/datasets/697ht4f65b/1) | Nguồn download dataset DADAS/MLDAS |
| [GitHub TrafficDator](https://github.com/TrafficDator/TrafficDator) | Source code tạo dataset, script trích xuất tọa độ |
| [Madrid Open Data Portal](https://datos.madrid.es) | Nguồn gốc dữ liệu cảm biến (đang bảo trì tại thời điểm làm) |
| Oracle AI Advisor | Đánh giá kiến trúc, khuyến nghị approach |

---

## 8. Cải tiến có thể làm tiếp

1. **Chọn ngày khác:** Sửa `SAMPLE_DATE` trong `extract-data.js` rồi chạy lại.
2. **Nhiều ngày:** Tạo dropdown chọn ngày, mỗi ngày 1 file timeslices.
3. **Cluster/Heatmap:** Dùng `Leaflet.heat` để vẽ heatmap thay vì circle markers.
4. **Filter:** Lọc theo loại đường (highway type), số làn, tốc độ tối đa.
5. **So sánh:** So sánh Working day vs Holiday vs Weekend.
6. **Backend API:** Tạo API server trả dữ liệu theo timestamp, thay vì load toàn bộ JSON.
7. **Tích hợp ML:** Kết nối với model dự đoán lưu lượng, hiển thị predicted vs actual.
