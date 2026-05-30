# DevFlow Dashboard

Dashboard quản lý dự án và công việc dành cho developer — theo dõi freelance, dự án công ty, đối tác và tiến độ làm việc hàng ngày.

## Tính năng

### Quản lý dự án
- **Dashboard** — Tổng quan doanh thu, số dự án đang chạy/hoàn thành, task chờ xử lý và biểu đồ thống kê
- **Projects** — Danh sách dự án, chi tiết từng dự án (slug, logo, trạng thái, ngân sách)
- **Kanban** — Bảng task kéo thả theo cột trạng thái
- **Timeline** — Dòng thời gian tiến độ dự án
- **Planning** — Lập kế hoạch và mục tiêu

### Làm việc hàng ngày
- **Calendar** — Lịch sự kiện và deadline
- **Notes** — Ghi chú phân loại theo category
- **Daily Log** — Nhật ký công việc theo ngày

### Đội ngũ & đối tác
- **Team** — Quản lý thành viên
- **Partners** — Quản lý đối tác/khách hàng và liên kết dự án
- **Cổng công khai** — Trang trạng thái đối tác (`/`) và chi tiết dự án công khai (`/project/:id`)

### Khác
- **AI Chat** — Trợ lý AI tích hợp (Supabase Edge Function + Gemini)
- **Settings** — Giao diện sáng/tối, ngôn ngữ, thông báo email
- **Đăng nhập** — Xác thực qua Supabase Auth

## Tech stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Recharts
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Drag & drop:** @dnd-kit

## Chạy local

**Yêu cầu:** Node.js 18+, tài khoản [Supabase](https://supabase.com)

1. Cài dependencies:

   ```bash
   npm install
   ```

2. Tạo file `.env` từ mẫu và điền thông tin Supabase:

   ```bash
   cp .env.example .env
   ```

   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```

3. (Tuỳ chọn) Chạy migration Supabase và deploy Edge Functions:

   ```bash
   supabase db push
   supabase functions deploy ai-chat
   supabase functions deploy send-email
   ```

4. (Tuỳ chọn) Bật AI Chat — set secret trên Supabase:

   ```bash
   supabase secrets set GEMINI_API_KEY=your_key
   ```

5. Chạy dev server:

   ```bash
   npm run dev
   ```

   Mở [http://localhost:3000](http://localhost:3000)

## Scripts

| Lệnh | Mô tả |
|------|--------|
| `npm run dev` | Chạy dev server (port 3000) |
| `npm run build` | Build production |
| `npm run preview` | Xem bản build |
| `npm run lint` | Kiểm tra TypeScript |

## License

MIT — xem [LICENSE](LICENSE)
