# Đặc tả yêu cầu phần mềm - Thư viện Campus

**Phiên bản 1.0**

## 1. Giới thiệu

### 1.1 Mục đích

Tài liệu này quy định những gì **Thư viện Campus** phải thực hiện. Đây là tài liệu tham chiếu để xây dựng và đánh giá phần triển khai trong kho mã nguồn này: một tính năng được xem là hoàn thành khi đáp ứng các yêu cầu dưới đây.

### 1.2 Phạm vi

Thư viện Campus là một ứng dụng web dành cho thư viện trường học. Thành viên tìm kiếm danh mục sách và mượn, gia hạn, trả sách; quản trị viên duy trì danh mục sách, người dùng và các lượt mượn, đồng thời theo dõi hoạt động của thư viện. Kho mã nguồn bao gồm backend (REST API và cơ sở dữ liệu) và frontend (ứng dụng một trang được backend cung cấp).

Ngoài phạm vi: thanh toán, thông báo qua email, đặt trước sách và mọi hình thức tích hợp với thư viện vật lý.

### 1.3 Định nghĩa

| Thuật ngữ | Ý nghĩa |
|---|---|
| Thành viên (Member) | Người dùng đã đăng ký với vai trò `member` |
| Quản trị viên (Administrator) | Người dùng đã đăng ký với vai trò `admin` |
| Lượt mượn đang hoạt động (Active loan) | Lượt mượn chưa được trả |
| Lượt mượn quá hạn (Overdue loan) | Lượt mượn đang hoạt động có ngày đến hạn đã qua |
| Bản sao (Copy) | Một cuốn sách vật lý; một đầu sách có số lượng bản sao *tổng cộng* và *khả dụng* |

### 1.4 Tổng quan

Mục 2 mô tả sản phẩm và người dùng; mục 3 liệt kê các yêu cầu chức năng; mục 4 trình bày các quy tắc nghiệp vụ; mục 5 mô tả các giao diện; và mục 6 nêu các ràng buộc.

## 2. Mô tả tổng quan

### 2.1 Người dùng

| Vai trò | Khả năng |
|---|---|
| Khách (chưa đăng nhập) | Đăng ký, đăng nhập (bằng mật khẩu hoặc Google) |
| Thành viên | Có tất cả khả năng của khách sau khi đăng nhập, đồng thời có thể: duyệt danh mục sách, mượn, gia hạn và trả sách, xem các lượt mượn của bản thân, quản lý hồ sơ cá nhân |
| Quản trị viên | Có tất cả khả năng của thành viên, đồng thời có thể: quản lý sách, xem và quản lý tất cả lượt mượn, quản lý người dùng, xem bảng điều khiển |

### 2.2 Môi trường và giả định

- Chạy trên Node.js phiên bản 22.13 trở lên; dữ liệu được lưu trong cơ sở dữ liệu SQLite cục bộ.
- Frontend là ứng dụng chạy trên trình duyệt, không cần bước build và được backend cung cấp.
- Có sẵn một bộ dữ liệu mẫu (một tài khoản quản trị viên, một thành viên và 26 đầu sách, trong đó có một đầu sách không có bản sao nào).
- Đăng nhập Google sử dụng Google Identity Services; có chế độ giả lập (mock) dành cho phát triển cục bộ.

## 3. Yêu cầu chức năng

Mã định danh yêu cầu là cố định và được tham chiếu trong mã nguồn cũng như các tài liệu khác.

### 3.1 Xác thực (AUTH)

| ID | Yêu cầu |
|---|---|
| AUTH-01 | **Đăng ký.** Khách đăng ký bằng tên (2-50 ký tự), địa chỉ email hợp lệ (tối đa 100 ký tự, không phân biệt chữ hoa/chữ thường khi kiểm tra tính duy nhất) và mật khẩu (8-64 ký tự, có ít nhất một chữ cái và một chữ số). Khi thành công, tài khoản được tạo với vai trò `member`, API trả về mã 201 và người dùng được đăng nhập. Lỗi của từng trường được thông báo riêng theo từng trường. |
| AUTH-02 | **Đăng nhập.** Người dùng đăng nhập bằng email và mật khẩu. Nếu thông tin xác thực sai, hệ thống hiển thị thông báo chung `"Invalid email or password"`. Sau 5 lần đăng nhập sai liên tiếp, tài khoản bị khóa trong `LOCK_MINUTES` phút (mặc định là 5 phút); trong thời gian bị khóa, đăng nhập sẽ thất bại với mã 423 ngay cả khi mật khẩu chính xác. Đăng nhập thành công sẽ đặt lại bộ đếm số lần thất bại. Tài khoản đã bị vô hiệu hóa không thể đăng nhập (403). |
| AUTH-03 | **Đăng nhập một lần bằng Google (Google single sign-on).** Email Google đã được xác minh sẽ cho phép người dùng đăng nhập. Nếu email chưa tồn tại, hệ thống tạo tài khoản thành viên mới; nếu email đã có tài khoản, hệ thống liên kết tài khoản Google với tài khoản đó. Tài khoản đã bị vô hiệu hóa không thể đăng nhập. |
| AUTH-04 | **Phiên đăng nhập.** Các lời gọi API (ngoại trừ đăng ký, đăng nhập và đăng nhập Google) yêu cầu header `Authorization: Bearer <JWT>`. Token hết hạn sau 1 giờ. `GET /api/auth/me` trả về người dùng hiện tại. Những trang khác màn hình đăng nhập không được hiển thị cho người dùng chưa đăng nhập. |
| AUTH-05 | **Đăng xuất.** Sau khi đăng xuất, người dùng được chuyển đến màn hình đăng nhập, phiên đăng nhập đã lưu bị xóa và việc tải lại trang không tự động đăng nhập người dùng trở lại. |

### 3.2 Danh mục sách (BOOK)

| ID | Yêu cầu |
|---|---|
| BOOK-01 | **Liệt kê sách.** Mọi người dùng đã đăng nhập đều có thể xem danh sách sách. Giao diện hiển thị 8 cuốn sách mỗi trang; API nhận các tham số `page` và `pageSize` (1-50). `totalPages = ceil(total / pageSize)`. Các giá trị `page`, `pageSize`, `sort` hoặc `order` không hợp lệ sẽ bị từ chối với mã 400. |
| BOOK-02 | **Tìm kiếm và lọc.** `q` tìm khớp theo tiêu đề, tác giả hoặc ISBN, không phân biệt chữ hoa/chữ thường và được xem là văn bản nguyên dạng (`%` và `_` là các ký tự thông thường). `category` yêu cầu khớp chính xác; `available=true\|false` lọc theo tình trạng có bản sao hay không; `sort` nhận một trong các giá trị `title`, `author`, `year`, `newest`; `order` là `asc` hoặc `desc`. Khi thay đổi bất kỳ bộ lọc nào trên giao diện, kết quả sẽ quay về trang 1. |
| BOOK-03 | **Chi tiết sách.** `GET /api/books/:id` trả về thông tin của một cuốn sách; ID không tồn tại trả về 404. |
| BOOK-04 | **Tạo sách (quản trị viên).** Tiêu đề tối đa 150 ký tự, tác giả tối đa 100 ký tự, thể loại tối đa 50 ký tự, ISBN gồm chính xác 10 hoặc 13 chữ số và phải là duy nhất, năm xuất bản từ 1900 đến năm hiện tại, tổng số bản sao từ 1-100. Thành viên nhận mã 403. |
| BOOK-05 | **Cập nhật sách (quản trị viên).** Áp dụng cùng quy tắc kiểm tra dữ liệu như BOOK-04. Không thể đặt tổng số bản sao thấp hơn số bản sao hiện đang được cho mượn (409). Số bản sao khả dụng = tổng số bản sao mới - số bản sao đang được cho mượn. |
| BOOK-06 | **Xóa sách (quản trị viên).** Yêu cầu xóa bị từ chối với mã 409 nếu vẫn còn bất kỳ bản sao nào đang được cho mượn; giao diện yêu cầu xác nhận trước khi xóa. |

### 3.3 Mượn sách (LOAN)

| ID | Yêu cầu |
|---|---|
| LOAN-01 | **Mượn sách.** Các bước kiểm tra được thực hiện theo thứ tự sau: sách có tồn tại hay không (404); có bản sao khả dụng hay không (409); thành viên có ít hơn 3 lượt mượn đang hoạt động hay không (409); thành viên có lượt mượn quá hạn nào không (409); thành viên đã mượn chính cuốn sách này chưa (409). Thời hạn mượn là 14 ngày và số bản sao khả dụng giảm đi 1. Giao diện thông báo mọi trường hợp từ chối bằng thông báo lỗi. |
| LOAN-02 | **Lượt mượn của tôi.** Thành viên xem danh sách lượt mượn của chính mình, được lọc theo trạng thái (tất cả, đang hoạt động, quá hạn, đã trả), 6 lượt mỗi trang. Mỗi lượt mượn hiển thị sách, trạng thái, ngày mượn, ngày đến hạn, ngày trả và khoản tiền phạt đã phát sinh. |
| LOAN-03 | **Trả sách.** Chỉ người mượn hoặc quản trị viên mới có thể trả một lượt mượn. Lượt mượn đã được trả trước đó sẽ trả về mã 409. Số bản sao khả dụng tăng thêm 1. Tiền phạt là $0.50 cho mỗi ngày quá hạn bắt đầu tính, tối đa $20.00, và được lưu cùng lượt mượn. |
| LOAN-04 | **Gia hạn.** Chỉ người mượn mới có thể gia hạn; mỗi lượt mượn chỉ được gia hạn một lần và không thể gia hạn khi đã quá hạn. Ngày đến hạn hiện tại được lùi thêm 7 ngày. |
| LOAN-05 | **Thiết lập ngày đến hạn (quản trị viên).** `PATCH /api/loans/:id/due-date` thay đổi ngày đến hạn của một lượt mượn (trên giao diện: Admin, All loans, *Set due date*); ngày trống hoặc không hợp lệ sẽ bị từ chối. |
| LOAN-06 | **Tất cả lượt mượn (quản trị viên).** Quản trị viên xem tất cả lượt mượn, 8 lượt mỗi trang, có chức năng tìm kiếm (theo tiêu đề sách, tên thành viên hoặc email) và bộ lọc trạng thái. |

### 3.4 Hồ sơ cá nhân (PROF)

| ID | Yêu cầu |
|---|---|
| PROF-01 | **Xem hồ sơ.** Người dùng xem được tên, email, vai trò, trạng thái có liên kết tài khoản Google hay không và thống kê mượn sách: tổng số lượt mượn, số lượt mượn đang hoạt động và tiền phạt đã thanh toán. |
| PROF-02 | **Cập nhật hồ sơ.** Tên dài 2-50 ký tự; số điện thoại là tùy chọn, gồm dấu `+` (nếu có) theo sau bởi 9-15 chữ số. Không thể thay đổi địa chỉ email. |
| PROF-03 | **Đổi mật khẩu.** Mật khẩu hiện tại phải chính xác; mật khẩu mới phải tuân theo quy tắc AUTH-01 và phải khác mật khẩu hiện tại. Tài khoản chỉ sử dụng Google không có mật khẩu nên không thể đổi mật khẩu. |
| PROF-04 | **Xóa tài khoản.** Yêu cầu nhập nội dung xác nhận `DELETE` (`{ "confirm": "DELETE" }`). Yêu cầu bị từ chối nếu người dùng vẫn còn sách đang mượn. Quản trị viên cuối cùng không thể tự xóa tài khoản của mình. |

### 3.5 Quản trị (ADM)

| ID | Yêu cầu |
|---|---|
| ADM-01 | **Bảng điều khiển.** Hiển thị số lượng người dùng, đầu sách, bản sao còn trên kệ, lượt mượn đang hoạt động, lượt mượn quá hạn (chỉ tính các lượt mượn đang hoạt động đã quá ngày đến hạn), tiền phạt đã thu và năm cuốn sách được mượn nhiều nhất. |
| ADM-02 | **Danh sách người dùng.** Quản trị viên xem danh sách người dùng, 8 người mỗi trang, có chức năng tìm kiếm theo tên hoặc email và bộ lọc theo vai trò và trạng thái hoạt động; tất cả bộ lọc có thể kết hợp với nhau. Mỗi dòng hiển thị vai trò, trạng thái và phương thức đăng nhập. |
| ADM-03 | **Thay đổi vai trò.** Quản trị viên có thể nâng một thành viên lên quản trị viên hoặc hạ một quản trị viên xuống thành viên. Quản trị viên không thể thay đổi vai trò của chính mình và quản trị viên cuối cùng không thể bị hạ quyền. |
| ADM-04 | **Kích hoạt / vô hiệu hóa.** Quản trị viên có thể vô hiệu hóa và kích hoạt lại người dùng nhưng không thể thực hiện thao tác này với chính mình. Người dùng đã bị vô hiệu hóa sẽ bị từ chối trong mọi lời gọi API, ngay cả khi token vẫn còn hiệu lực. |
| ADM-05 | **Mở khóa.** Quản trị viên có thể xóa trạng thái khóa tài khoản do đăng nhập sai nhiều lần gây ra. |

## 4. Tóm tắt quy tắc nghiệp vụ

| Quy tắc | Giá trị |
|---|---|
| Thời hạn mượn | 14 ngày |
| Gia hạn | 1 lần cho mỗi lượt mượn, thêm 7 ngày, không áp dụng khi đã quá hạn |
| Số lượt mượn đang hoạt động tối đa mỗi thành viên | 3 |
| Tiền phạt | $0.50 cho mỗi ngày quá hạn bắt đầu tính, tối đa $20.00 cho mỗi lượt mượn |
| Số lần đăng nhập sai trước khi khóa | 5 (thời gian khóa kéo dài `LOCK_MINUTES`) |
| Thời hạn token | 1 giờ |
| Số mục mỗi trang | Sách 8, lượt mượn của tôi 6, người dùng 8, tất cả lượt mượn 8 |
| Vai trò | `member`, `admin`; luôn phải còn ít nhất một quản trị viên đang hoạt động |

## 5. Yêu cầu giao diện

### 5.1 Giao diện người dùng

- Ứng dụng một trang với các mục Books, My Loans, Profile và (chỉ dành cho quản trị viên) Admin, gồm các tab Dashboard, Users và All loans.
- Các thao tác cung cấp phản hồi bằng thông báo toast (thành công, lỗi, thông tin); biểu mẫu hiển thị lỗi ngay bên cạnh trường tương ứng.
- Các thao tác có tính phá hủy dữ liệu (xóa sách, xóa tài khoản) phải yêu cầu xác nhận.
- Có giao diện sáng và tối; lựa chọn của người dùng được ghi nhớ.
- Màn hình đăng nhập cung cấp các lựa chọn đăng nhập bằng email/mật khẩu, Google và các nút điền nhanh thông tin của những tài khoản mẫu.

### 5.2 REST API

Dữ liệu JSON qua HTTP, sử dụng tiền tố `/api`. Cấu trúc lỗi là `{ "error": "...", "fields": { "<field>": "..." } }`.

| Khu vực | Các endpoint |
|---|---|
| Xác thực | `POST /api/auth/{register,login,google,logout}`, `GET /api/auth/me` |
| Sách | `GET /api/books`, `POST /api/books`, `GET /api/books/categories`, `GET\|PUT\|DELETE /api/books/:id` |
| Mượn sách | `POST /api/loans`, `GET /api/loans/mine`, `POST /api/loans/:id/{return,renew}`, `GET /api/loans` (quản trị viên), `PATCH /api/loans/:id/due-date` (quản trị viên) |
| Hồ sơ | `GET\|PUT\|DELETE /api/profile`, `PUT /api/profile/password` |
| Quản trị | `GET /api/admin/{stats,users}`, `PATCH /api/admin/users/:id/{role,active}`, `POST /api/admin/users/:id/unlock` |
| Hệ thống | `GET /api/health` |

Mã trạng thái: 200/201 thành công, 400 dữ liệu đầu vào không hợp lệ, 401 chưa xác thực, 403 không được phép hoặc tài khoản đã bị vô hiệu hóa, 404 không tìm thấy, 409 trạng thái xung đột, 423 tài khoản bị khóa.

### 5.3 Cấu hình

`PORT`, `JWT_SECRET`, `LOCK_MINUTES`, `GOOGLE_CLIENT_ID`, `GOOGLE_MOCK` (xem `README.md`).

## 6. Ràng buộc và thuộc tính chất lượng

- Mật khẩu chỉ được lưu dưới dạng mã băm có salt; API không bao giờ trả về mật khẩu.
- Các truy vấn cơ sở dữ liệu sử dụng tham số liên kết (bound parameters).
- Việc phân quyền được thực thi ở phía máy chủ cho mọi endpoint, không chỉ đơn thuần ẩn chức năng trên giao diện người dùng.
- Ngày tháng được lưu theo múi giờ UTC.
- Ứng dụng hướng đến triển khai trên một máy đơn lẻ và ở trạng thái hiện tại không được thiết kế để sử dụng trong môi trường production.

## 7. Truy xuất nguồn gốc

| Khu vực | ID | Mã nguồn |
|---|---|---|
| Xác thực | AUTH-01 .. 05 | `backend/src/routes/auth.js`, `middleware.js`, `frontend/app.js` |
| Danh mục sách | BOOK-01 .. 06 | `backend/src/routes/books.js`, `frontend/app.js` |
| Mượn sách | LOAN-01 .. 06 | `backend/src/routes/loans.js`, `frontend/app.js` |
| Hồ sơ | PROF-01 .. 04 | `backend/src/routes/profile.js`, `frontend/app.js` |
| Quản trị | ADM-01 .. 05 | `backend/src/routes/admin.js`, `frontend/app.js` |
