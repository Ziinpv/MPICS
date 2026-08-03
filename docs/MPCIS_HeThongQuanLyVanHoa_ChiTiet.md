# TÀI LIỆU ĐẶC TẢ HỆ THỐNG CHI TIẾT: DỰ ÁN MPCIS
*(MobiFone Public Communication & Information System - Hệ thống Quản lý Văn hóa và Truyền thông Cơ sở thông minh)*

---

## 1. TỔNG QUAN DỰ ÁN

**MPCIS** là giải pháp chuyển đổi số toàn diện do MobiFone phát triển, nhằm số hóa công tác quản lý văn hóa, thông tin cơ sở và truyền thông công cộng tại các địa phương. Hệ thống thay thế mô hình truyền thanh FM/có dây truyền thống và các bảng tin vật lý bằng hệ sinh thái thiết bị IoT (loa thông minh, màn hình LED) kết nối qua hạ tầng mạng 4G/5G MobiFone.

### Mục tiêu cốt lõi:
- **Số hóa dữ liệu văn hóa:** Lưu trữ, quản lý địa điểm/tài sản văn hóa trên GIS; phổ biến chính sách & sự kiện qua phát thanh.
- **Tự động hóa phát thanh:** Ứng dụng AI (Text-to-Speech) để chuyển đổi văn bản thành giọng nói, lập lịch phát sóng tự động.
- **Quản lý thiết bị tập trung:** Giám sát và điều khiển hàng ngàn thiết bị IoT (âm thanh, hình ảnh) trên nền tảng bản đồ số GIS.
- **Phân quyền chặt chẽ:** Tách biệt luồng User cơ sở (**số hóa địa điểm/tài sản GIS**) và Admin (**phát thanh, điều khiển IoT, duyệt nội dung**).

---

## 2. KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo kiến trúc **Microservices**, vận hành trên nền tảng Cloud của MobiFone, đảm bảo tính mở rộng và khả năng xử lý tải cao.

### 2.1. Các thành phần chính
1. **MobiFone Cloud Infrastructure:** Nền tảng lưu trữ dữ liệu tập trung, đảm bảo tuân thủ tiêu chuẩn an toàn thông tin tại Việt Nam.
2. **IoT Gateway / Broker:** Máy chủ quản lý kết nối từ các thiết bị ngoại vi thông qua giao thức MQTT. Đảm bảo duy trì kết nối (keep-alive) và truyền tải lệnh điều khiển độ trễ thấp.
3. **Core Backend Application:** Chịu trách nhiệm xử lý logic nghiệp vụ, quản lý nội dung, phân quyền, và giao tiếp với các APIs bên thứ ba.
4. **MobiFone AI Engine:** Tích hợp bộ chuyển đổi Text-to-Speech đa vùng miền (Bắc, Trung, Nam) với ngữ điệu tự nhiên.
5. **Giao diện người dùng (Client-side):**
   - **Admin Portal (Web):** Dành cho Quản trị viên toàn phần.
   - **User App (Mobile/Web):** Cán bộ cơ sở — số hóa địa điểm/tài sản GIS, báo sự cố.

### 2.2. Technology Stack (Khuyến nghị)
- **Backend:** Golang (để xử lý I/O cao cho IoT) hoặc Node.js / Java Spring Boot.
- **Frontend (Web):** ReactJS hoặc Vue.js, tích hợp thư viện bản đồ Leaflet hoặc Mapbox.
- **Mobile App:** Flutter hoặc React Native (đa nền tảng iOS/Android).
- **Database:**
  - *Relational DB (PostgreSQL):* Lưu trữ thông tin người dùng, quyền, thiết bị, và siêu dữ liệu (metadata) của bài viết.
  - *NoSQL (MongoDB):* Lưu trữ log thiết bị, telemetry data.
  - *Redis:* Caching hệ thống, trạng thái online/offline của thiết bị theo thời gian thực.
- **IoT Protocol:** MQTT / HTTPs.

---

## 3. PHÂN VÙNG CHỨC NĂNG CHI TIẾT

Hệ thống phân chia thành 2 phân vùng (Role-based) với các đặc quyền và nghiệp vụ chuyên biệt:

### 3.1. Phân vùng Admin Toàn phần (Quản trị hệ thống & Điều hành)
Giao diện: Web-based Dashboard.
Đối tượng: Cán bộ quản lý cấp Huyện/Tỉnh, Quản trị viên hệ thống của MobiFone.

**A. Quản lý Thiết bị Truyền thông Thông minh (IoT Management)**
- **Giám sát thiết bị:** Hiển thị danh sách thiết bị (Cụm loa thông minh, Màn hình LED). Theo dõi trạng thái Online/Offline, Mất điện, Lỗi linh kiện, Mức âm lượng, Cường độ sóng 4G (RSSI).
- **Điều khiển từ xa:** 
  - Điều chỉnh âm lượng (từng loa hoặc hàng loạt).
  - Khởi động lại thiết bị (Reboot) từ xa.
  - Bật/Tắt thiết bị (Power on/off) theo cụm.
- **Quản lý Vị trí (GIS Map):** Hiển thị vị trí thực của toàn bộ thiết bị trên bản đồ số. Cho phép quy hoạch cụm phát thanh theo bản đồ địa giới hành chính.

**B. Quản lý Nội dung & Văn hóa (Phát thanh)**
- **Soạn & Kiểm duyệt Tin/Bài:** Admin tạo, chỉnh sửa, phê duyệt tin bài phát thanh (không phụ thuộc User nộp bài).
- **Phân loại Văn hóa:** Gắn thẻ (Tagging) theo danh mục: Di tích lịch sử, Lễ hội truyền thống, Thông báo hành chính, Cảnh báo khẩn cấp.
- **Công cụ AI Text-to-Speech:** Cấu hình giọng đọc (Nam/Nữ, vùng miền), tốc độ đọc, chèn nhạc nền cho các bản tin dạng văn bản.

**C. Lập lịch & Phát sóng**
- **Quản lý Chiến dịch/Lịch phát:** Tạo kịch bản phát sóng định kỳ (VD: Bản tin sáng 6h00, bản tin chiều 17h00) hoặc phát ngay (Live) cho các trường hợp khẩn cấp (bão lũ).
- **Routing nội dung:** Chỉ định luồng phát đến khu vực cụ thể (VD: Chỉ phát bản tin Nông nghiệp ở Cụm loa xã A, không phát ở xã B).

**D. Quản trị Hệ thống & Báo cáo**
- **Quản lý Tài khoản (RBAC):** Cấp phát, vô hiệu hóa, phân quyền cho các tài khoản User cấp dưới.
- **Báo cáo Thống kê:** Xuất báo cáo về tỷ lệ thiết bị hoạt động, tần suất phát sóng, thời lượng phát thanh, và số liệu địa điểm/tài sản GIS theo khu vực.

### 3.2. Phân vùng User (Cán bộ cơ sở — GIS Asset Management)
Giao diện: Mobile App & Web nội bộ tinh gọn.
Đối tượng: Cán bộ văn hóa xã/phường.

**A. Số hóa & Quản lý Địa điểm / Tài sản trên bản đồ**
- **Form thêm địa điểm/tài sản:** Chọn Tỉnh/Xã; phân loại (Bảng vẫy, Bảng 2 chân, Bạt mái che, Cơ sở tín ngưỡng, Địa điểm văn hóa, Thiết bị thông minh…).
- **Giấy phép & vận hành:** Số giấy phép, điều kiện, ngày cấp, ngày hết hạn, tình trạng hoạt động.
- **Pick on map:** Chọn tọa độ GPS trực tiếp trên bản đồ; upload ảnh hiện trạng địa điểm.
- **Danh sách & bản đồ tra cứu** địa điểm trong phạm vi xã được phân quyền.

**B. Theo dõi Thiết bị Cơ sở (View Only)**
- Tra cứu danh sách thiết bị truyền thông (loa/LED) trên địa bàn phụ trách — **không** cấu hình/điều khiển.
- **Báo cáo sự cố:** Nút "Báo lỗi" nhanh (ảnh + mô tả) để Admin điều thợ bảo hành.

> **Đã loại khỏi phạm vi User:** Rich Text Editor, soạn tin bài phát thanh, đính kèm audio, nộp duyệt bài (chuyển sang Admin — mục 3.1.B).

---

## 4. QUY TRÌNH NGHIỆP VỤ CỐT LÕI (WORKFLOWS)

### Quy trình 1: Số hóa địa điểm / tài sản (User — GIS)
1. **(User)** Đăng nhập → mở form địa điểm hoặc bản đồ địa bàn.
2. **(User)** Chọn Tỉnh/Xã, phân loại, nhập giấy phép & tình trạng hoạt động.
3. **(User)** Pick GPS trên map + upload ảnh hiện trạng → Lưu (`locations`).
4. **(Hệ thống)** Hiển thị trên bản đồ / danh sách theo org scope; ghi audit.

### Quy trình 2: Sản xuất và Phát sóng Nội dung (Admin)
1. **(Admin)** Soạn thảo văn bản (hoặc tải audio) trên Admin Portal.
2. **(Admin)** Kiểm duyệt / phê duyệt nội dung.
3. **(Admin)** Nếu là văn bản, dùng **MobiFone AI TTS** kết xuất Audio MP3.
4. **(Admin)** Thiết lập lịch phát sóng → Chọn Cụm thiết bị đích.
5. **(Hệ thống)** Lưu file CDN, ghi kịch bản DB.
6. **(Thiết bị IoT)** Pull / MQTT Push tải audio → cache → phát đúng giờ.

### Quy trình 3: Cảnh báo sự cố Thiết bị (Telemetry Logging)
1. **(Thiết bị IoT)** Mỗi 3–5 phút gửi heartbeat MQTT (nguồn, nhiệt độ, RSSI).
2. **(MQTT Broker)** Quá 3 chu kỳ không tín hiệu → Offline.
3. **(Cảnh báo)** Marker đỏ trên GIS thiết bị (Admin) + SMS/Zalo ZNS kỹ thuật viên.

---

## 5. TIÊU CHUẨN AN TOÀN THÔNG TIN & BẢO MẬT

Do đặc thù của hệ thống truyền thông công cộng, vấn đề an ninh thông tin phải đặt lên hàng đầu nhằm tránh nguy cơ bị tin tặc chiếm sóng, phát tán thông tin sai lệch.

- **Bảo mật Kết nối (Transport Level):** Tất cả kết nối API, MQTT đều phải chạy trên giao thức mã hóa TLS 1.2/1.3 (HTTPS, MQTTS).
- **Xác thực Thiết bị (Device Authentication):** Sử dụng xác thực bằng chứng thư số (Certificate-based) hoặc mã Token duy nhất mã hóa theo MAC Address/IMEI của SIM 4G. Từ chối kết nối từ các thiết bị không xác định.
- **Bảo vệ luồng Phát thanh (Stream Protection):** Audio files và luồng Livestream được mã hóa DRM cơ bản, hoặc sử dụng cơ chế chữ ký số (Digital Signature). Thiết bị chỉ phát file khi xác minh đúng chữ ký từ hệ thống Admin hợp lệ.
- **Nhật ký Hệ thống (Audit Trail):** Mọi hành động của Admin (sửa nội dung, lên lịch, khởi động loa) và User (tạo/sửa địa điểm GIS, báo sự cố) đều phải được log lại toàn bộ (Who, What, When, IP, Location) để phục vụ công tác truy vết khi có sự cố.

---
*Tài liệu được phân tích và tổng hợp cho hệ thống MPCIS MobiFone.*
