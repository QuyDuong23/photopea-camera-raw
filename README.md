# Camera Raw Studio for Photopea

Plugin chỉnh ảnh kiểu Camera Raw chạy trực tiếp trong trình duyệt bằng WebGL 2.

## Tính năng

- Light: Exposure, Contrast, Highlights, Shadows, Whites, Blacks
- Color: Temperature, Tint, Vibrance, Saturation
- Effects: Texture, Clarity, Dehaze, Vignette, Grain
- Tone Curve 5 điểm kéo thả
- Color Mixer HSL 8 dải màu
- Color Grading: Shadows / Midtones / Highlights
- Detail: Sharpening, Noise Reduction, Color Noise Reduction
- Optics: Distortion, Lens Vignette, Chromatic Aberration
- Lens Blur mô phỏng
- Calibration RGB primaries
- Preset, Undo / Redo, Before / After
- Mở ảnh từ Photopea, áp dụng thành layer mới, hoặc xuất PNG


## Cập nhật v2.1.5

- **Whites** điều chỉnh điểm trắng và vùng sáng nhất của ảnh.
- **Blacks** điều chỉnh điểm đen và vùng tối nhất của ảnh.
- Hai thanh dùng vùng chọn tonal độc lập, giữ hue ổn định hơn và hoạt động gần với Camera Raw của Photoshop.
- Có thể bấm **Lưu preset hiện tại** để lưu toàn bộ thông số chỉnh màu.
- Preset cá nhân được lưu bằng `localStorage` trên chính trình duyệt và tên miền GitHub Pages của plugin.
- Có thể chọn lại preset trong nhóm **Preset của tôi** hoặc xóa preset không cần thiết.

## Cài bằng GitHub Pages

1. Tạo repository công khai, ví dụ `photopea-camera-raw`.
2. Tải toàn bộ file trong thư mục này lên nhánh `main`.
3. Vào **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Chọn nhánh `main`, thư mục `/ (root)`, bấm Save.
5. Chờ GitHub cung cấp URL dạng `https://TEN.github.io/photopea-camera-raw/`.
6. Mở `plugin.json`, thay cả hai chỗ `YOUR-USERNAME` bằng tên GitHub của bạn, rồi tải lại file đó lên repository.
7. Vào Photopea → **Window → Plugins → Add Plugin** → chọn file `plugin.json` từ máy.

## Cài bằng Netlify Drop

1. Kéo cả thư mục này vào trang Netlify Drop.
2. Copy URL HTTPS được cấp.
3. Sửa `url` và `icon` trong `plugin.json` theo URL đó.
4. Photopea → Window → Plugins → Add Plugin → chọn `plugin.json`.

## Sử dụng

1. Mở ảnh / PSD trong Photopea.
2. Mở plugin Camera Raw Studio ở thanh bên phải.
3. Bấm **Mở từ Photopea**.
4. Chỉnh thông số.
5. Bấm **Áp dụng vào Photopea** để tạo layer mới.

## Lưu ý kỹ thuật

Đây là engine WebGL độc lập mô phỏng workflow Camera Raw. Nó không chứa mã nguồn Adobe Camera Raw, không giải mã RAW máy ảnh theo profile Adobe và không thể tạo Smart Filter Camera Raw gốc. Ảnh từ Photopea được gửi sang plugin dưới dạng PNG đã render; kết quả được đưa trở lại dưới dạng một layer pixel mới.


## v2.1.3
- Sửa Color Mixer Saturation bị điểm màu / mảng xám gắt.
- Dùng selector màu làm mượt theo không gian và chroma RGB scaling.
- Giữ nguyên nút Mở cửa sổ lớn.

## Cập nhật v2.1.7 — Light theo vùng tông Adobe

- Exposure ưu tiên độ sáng trung gian khoảng 30–70%.
- Contrast tạo tương phản trung gian, hạn chế thay đổi trực tiếp hai điểm trắng / đen.
- Highlights tác động chủ yếu vùng 70–90%.
- Shadows tác động chủ yếu vùng 10–30%.
- Whites đặt đầu trắng và clipping vùng 90–100%.
- Blacks đặt đầu đen và clipping vùng 0–10%.
- Giữ nguyên tính năng lưu preset cá nhân trên trình duyệt.

## Cập nhật v2.1.9

- Bỏ các hộp thông báo giải thích dư thừa trong tab Basic.
- Sửa chế độ cửa sổ lớn để panel điều khiển bên phải có thanh cuộn độc lập.
- Hỗ trợ cuộn bằng con lăn chuột trong khu vực điều khiển.
- Giữ thanh Xuất PNG / Áp dụng vào Photopea luôn nhìn thấy ở cuối panel.

## Cập nhật v2.2.0 — Zoom và di chuyển Preview

- Zoom linh hoạt từ 1% đến 1600% bằng ô phần trăm, nút + / − hoặc con lăn chuột.
- Zoom theo đúng vị trí con trỏ chuột để xem chi tiết nhanh.
- Công cụ Zoom: phím `Z`, click để phóng to, `Alt + click` để thu nhỏ.
- Công cụ Hand: phím `H`, kéo chuột để di chuyển ảnh.
- Giữ `Space` và kéo chuột để di chuyển tạm thời giống Photoshop / Camera Raw.
- `Ctrl/Cmd + Space + click`: phóng to; `Alt + Space + click`: thu nhỏ.
- `Ctrl/Cmd + 0`: vừa khung; `Ctrl+Alt+0` hoặc `Cmd+Option+0`: 100% (có thêm phím tắt `Ctrl/Cmd + 1`).
- Phím `+` / `-` hoặc `Ctrl/Cmd + +` / `Ctrl/Cmd + -`: tăng / giảm mức zoom.
