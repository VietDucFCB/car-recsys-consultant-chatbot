# Car Recommendation System - Frontend

Frontend Next.js cho sàn thương mại điện tử bán xe ô tô với hệ thống gợi ý thông minh.

## 🚀 Tính năng

### Tính năng E-commerce
- ✅ **Trang chủ**: Hero section, xe nổi bật, danh mục, gợi ý cá nhân hóa
- ✅ **Tìm kiếm nâng cao**: Bộ lọc đa tiêu chí (hãng, model, năm, giá, km, nhiên liệu, hộp số, kiểu dáng)
- ✅ **Chi tiết xe**: Thông tin đầy đủ, hình ảnh, thông tin người bán, xe tương tự
- ✅ **So sánh xe**: So sánh tối đa 4 xe cùng lúc với bảng chi tiết
- ✅ **Yêu thích**: Lưu xe yêu thích, quản lý danh sách
- ✅ **Phân trang**: Hỗ trợ phân trang kết quả tìm kiếm

### Tính năng Authentication
- ✅ **Đăng ký**: Tạo tài khoản mới với email/password
- ✅ **Đăng nhập**: JWT authentication
- ✅ **Quản lý session**: Token storage, auto logout khi hết hạn
- ✅ **Protected routes**: Chỉ user đăng nhập mới truy cập được

### Tính năng Recommendation
- ✅ **Gợi ý cá nhân**: Dựa trên hành vi người dùng
- ✅ **Xe tương tự**: Gợi ý xe tương tự khi xem chi tiết
- ✅ **Nhiều chế độ**: Hybrid (thông minh) và Popular (phổ biến)
- ✅ **Lý do gợi ý**: Hiển thị lý do tại sao xe được gợi ý

### Tracking & Analytics
- ✅ **View tracking**: Theo dõi lượt xem xe
- ✅ **Click tracking**: Theo dõi lượt click
- ✅ **Favorite tracking**: Theo dõi xe yêu thích
- ✅ **Compare tracking**: Theo dõi hành vi so sánh
- ✅ **Contact tracking**: Theo dõi lượt liên hệ người bán

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form
- **Data Fetching**: SWR
- **Date Formatting**: date-fns

## 📁 Cấu trúc thư mục

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Homepage
│   │   ├── login/page.tsx      # Login page
│   │   ├── register/page.tsx   # Register page
│   │   ├── search/page.tsx     # Search page
│   │   ├── vehicle/[id]/page.tsx # Vehicle detail
│   │   ├── favorites/page.tsx  # Favorites page
│   │   ├── recommendations/page.tsx # Recommendations
│   │   └── compare/page.tsx    # Compare page
│   ├── components/             # React components
│   │   ├── Header.tsx          # Navigation header
│   │   ├── Footer.tsx          # Footer
│   │   ├── VehicleCard.tsx     # Vehicle card component
│   │   └── SearchBar.tsx       # Search form
│   ├── services/               # API services
│   │   ├── authService.ts      # Authentication APIs
│   │   ├── vehicleService.ts   # Vehicle APIs
│   │   ├── recommendationService.ts # Recommendation APIs
│   │   └── feedbackService.ts  # Feedback/tracking APIs
│   ├── store/                  # Zustand stores
│   │   ├── authStore.ts        # Auth state
│   │   └── favoriteStore.ts    # Favorites state
│   ├── types/                  # TypeScript types
│   │   └── index.ts            # Type definitions
│   ├── lib/                    # Utilities
│   │   └──               # Axios instance with interceptors
│   └── styles/
│       └── globals.css         # Global styles
├── public/                     # Static files
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
└── Dockerfile
```

## 🚀 Development

### Prerequisites
- Node.js 18+
- npm hoặc yarn

### Install dependencies
```bash
cd frontend
npm install
```

### Run development server
```bash
npm run dev
```

Frontend sẽ chạy tại http://localhost:3000

### Build for production
```bash
npm run build
npm start
```

## 🐳 Docker

### Build image
```bash
docker build -t car-recsys-frontend .
```

### Run container
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1 \
  car-recsys-frontend
```

## 🔧 Environment Variables

Tạo file `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 📱 Pages

### 1. Homepage (/)
- Hero section với search bar
- Xe nổi bật
- Gợi ý cá nhân (nếu đã đăng nhập)
- Danh mục phổ biến
- Call-to-action đăng ký

### 2. Search (/search)
- Bộ lọc nâng cao
- Kết quả tìm kiếm với grid layout
- Sắp xếp (giá, năm, km)
- Phân trang
- Faceted search (tương lai)

### 3. Vehicle Detail (/vehicle/[id])
- Hình ảnh xe
- Thông tin chi tiết đầy đủ
- Thông tin người bán
- Nút yêu thích, so sánh, liên hệ
- Xe tương tự

### 4. Login (/login)
- Form đăng nhập email/password
- Validation
- Error handling
- Link đến trang đăng ký

### 5. Register (/register)
- Form đăng ký
- Email validation
- Password strength
- Auto login sau khi đăng ký thành công

### 6. Favorites (/favorites)
- Danh sách xe yêu thích
- Xóa khỏi yêu thích
- Empty state

### 7. Recommendations (/recommendations)
- Gợi ý thông minh (hybrid)
- Gợi ý phổ biến (candidate)
- Hiển thị lý do gợi ý
- Switch giữa các chế độ

### 8. Compare (/compare)
- So sánh tối đa 4 xe
- Bảng so sánh chi tiết
- Thêm/xóa xe
- Sticky header
- Scroll ngang

## 🎨 UI/UX Features

### Design
- Responsive design (mobile, tablet, desktop)
- Clean và modern
- Consistent color scheme (Primary blue)
- Loading states
- Empty states
- Error states

### Interactions
- Hover effects
- Click animations
- Toast notifications (có thể thêm)
- Loading spinners
- Form validation feedback

### Accessibility
- Semantic HTML
- ARIA labels (có thể cải thiện)
- Keyboard navigation
- Focus states

## 🔐 Security

- JWT token stored in localStorage
- Auto logout khi token hết hạn
- Protected routes redirect to login
- CORS configuration
- XSS protection (React default)

## 📊 State Management

### Auth Store (Zustand + Persist)
```typescript
{
  user: User | null
  token: string | null
  isAuthenticated: boolean
  setAuth: (user, token) => void
  clearAuth: () => void
}
```

### Favorite Store (Zustand + Persist)
```typescript
{
  favorites: string[]
  addFavorite: (id) => void
  removeFavorite: (id) => void
  isFavorite: (id) => boolean
}
```

## 🚀 Next Steps

### Phase 1: MVP Enhancement
- [ ] Add image carousel for vehicle detail
- [ ] Implement toast notifications
- [ ] Add loading skeletons
- [ ] Improve error messages

### Phase 2: Advanced Features
- [ ] Search history page
- [ ] User profile page
- [ ] Advanced filters with facets
- [ ] Saved searches
- [ ] Email notifications

### Phase 3: Performance
- [ ] Image optimization
- [ ] Code splitting
- [ ] PWA support
- [ ] SEO optimization

### Phase 4: Social Features
- [ ] Reviews and ratings
- [ ] Social sharing
- [ ] Chat with seller
- [ ] Wishlist sharing

## 📝 Notes

- Lint errors về React/Next.js imports là bình thường khi chưa install dependencies
- Khi chạy trong Docker, các dependencies sẽ được install tự động
- Frontend design đơn giản nhưng đầy đủ tính năng e-commerce
- Có thể dễ dàng customize Tailwind theme trong `tailwind.config.js`
