# Campus Library

**Campus Library** là một website quản lý thư viện trường học. Thành viên (member) có thể tìm kiếm, mượn, trả, gia hạn sách và theo dõi tiền phạt quá hạn; quản trị viên (admin) quản lý danh mục sách, người dùng và xem thống kê hoạt động của thư viện.

## Tính năng

**Dành cho thành viên**
- Đăng ký, đăng nhập bằng email/mật khẩu hoặc tài khoản Google (Single Sign-On); tài khoản bị khóa tạm thời sau 5 lần đăng nhập sai.
- Xem danh mục sách: tìm kiếm theo tên / tác giả / ISBN, lọc theo thể loại và tình trạng còn sách, sắp xếp, phân trang.
- Mượn sách (tối đa 3 sách cùng lúc, thời hạn 14 ngày), trả sách và gia hạn 1 lần (+7 ngày).
- Tiền phạt quá hạn 0,50$ mỗi ngày (tối đa 20$); không thể mượn thêm khi đang có sách quá hạn.
- Quản lý hồ sơ cá nhân: cập nhật tên, số điện thoại, đổi mật khẩu, xóa tài khoản.

**Dành cho quản trị viên**
- Thêm, sửa, xóa sách.
- Quản lý người dùng: đổi vai trò, vô hiệu hóa / kích hoạt, mở khóa tài khoản.
- Xem tất cả khoản mượn, đặt lại hạn trả.
- Dashboard thống kê: số người dùng, số sách, khoản mượn đang hoạt động / quá hạn, tiền phạt đã thu, top 5 sách được mượn nhiều nhất.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | Node.js + Express REST API, SQLite (tích hợp trong Node.js), xác thực JWT |
| Frontend | HTML / CSS / JavaScript thuần, ứng dụng dạng Single-Page App (không cần bước build), được phục vụ bởi backend |
| Đăng nhập | Email + mật khẩu và Google Single Sign-On (Google Identity Services) |

## Chạy ứng dụng

Yêu cầu **Node.js phiên bản 22.13 trở lên** (kiểm tra bằng lệnh `node -v`).

```bash
cd backend
npm install
cp .env.example .env      # Không bắt buộc nhưng được khuyến nghị
npm start                 # -> http://localhost:3000
```

Để đặt lại toàn bộ dữ liệu về trạng thái ban đầu (seed data), chạy `npm run reset-db` rồi khởi động lại bằng `npm start`.

### Tài khoản mẫu

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Quản trị viên (Admin) | `admin@library.test` | `Admin@123` |
| Thành viên (Member) | `user@library.test` | `User@1234` |

Dữ liệu mẫu gồm **26 cuốn sách**, trong đó có một cuốn có số lượng bản sao bằng 0 (hết sách).

### Cấu hình (`backend/.env`)

| Biến | Ý nghĩa | Mặc định trong `.env.example` |
|---|---|---|
| `PORT` | Cổng chạy ứng dụng | `3000` |
| `JWT_SECRET` | Khóa ký JWT | `change-me` |
| `LOCK_MINUTES` | Số phút tài khoản bị khóa sau 5 lần đăng nhập sai | `1` |
| `GOOGLE_CLIENT_ID` | Client ID dùng cho đăng nhập Google thực tế | (trống) |
| `GOOGLE_MOCK` | `1` = giả lập đăng nhập Google, không cần Client ID | `1` |

## Đăng nhập bằng Google

Có hai cách để cấu hình đăng nhập Google:

### 1. Chế độ giả lập (Mock mode - dễ sử dụng nhất)

Đây là chế độ mặc định trong `.env.example`:

```env
GOOGLE_MOCK=1
```

Khi nhấn **Continue with Google**, ứng dụng hiển thị một hộp thoại nhỏ để bạn nhập email và tên bất kỳ, giả lập một người dùng đăng nhập bằng Google. Chế độ này phù hợp khi chạy thử trên máy cá nhân, không cần cấu hình gì thêm.

### 2. Đăng nhập Google thực tế (Real Google)

1. Truy cập [Google Cloud Console - Credentials](https://console.cloud.google.com/apis/credentials).
2. Tạo một OAuth Client ID với loại ứng dụng là **Web application**.
3. Thêm JavaScript origin được phép:

   ```text
   http://localhost:3000
   ```

4. Sao chép Client ID và đặt vào biến `GOOGLE_CLIENT_ID` trong `backend/.env`.
5. Đặt `GOOGLE_MOCK=0` và khởi động lại ứng dụng.

Nếu không cấu hình cả hai chế độ, nút đăng nhập Google sẽ ở trạng thái vô hiệu hóa.

## Cấu trúc dự án

```text
backend/     Express API (src/routes/: auth, books, loans, profile, admin),
             cơ sở dữ liệu SQLite trong backend/data/
frontend/    index.html, styles.css, app.js
e2e/         Bộ auto test Playwright (Page Object Model)
docs/        TEST_GUIDE.md  - đặc tả yêu cầu và quy tắc nghiệp vụ chi tiết
             Campus-Library-Test-Document.xlsx - tài liệu kiểm thử (checklist và test case)
instructor/  ANSWER_KEY.md  - tài liệu dành riêng cho giảng viên
```

## Kiểm tra nhanh ứng dụng (Smoke Test)

```bash
cd backend
npm run smoke
```

Lệnh này chạy một bài kiểm tra cơ bản để xác nhận ứng dụng khởi động và các luồng chính hoạt động bình thường.

## Auto test (Playwright)

Bộ kiểm thử chức năng tự động nằm trong thư mục `e2e/`, viết bằng Playwright theo mô hình Page Object Model. Playwright tự khởi động backend trên một cổng và cơ sở dữ liệu riêng, không ảnh hưởng dữ liệu đang dùng.

```bash
cd e2e
npm install
npx playwright install chromium   # chỉ cần chạy lần đầu
npm test
```

Xem chi tiết cấu trúc và quy ước viết test trong [`e2e/README.md`](e2e/README.md).

## Lưu ý

Đây là ứng dụng quy mô nhỏ phục vụ học tập và chạy trên máy cá nhân, **không dành cho môi trường production**. Ứng dụng có thể còn chứa lỗi và lỗ hổng bảo mật (ví dụ SQL Injection, XSS, Broken Access Control), vì vậy chỉ chạy trên máy cá nhân và không triển khai lên máy chủ công khai hoặc Internet.
