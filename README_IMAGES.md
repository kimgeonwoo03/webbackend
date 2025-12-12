# 이미지 관리 가이드

## 현재 DB 구조
상품 이미지는 `product_variants` 테이블의 `representative_image_url` 컬럼에 저장됩니다.

```sql
representative_image_url VARCHAR(500)  -- 이미지 경로
```

## 방법 1: 로컬 서버에 이미지 저장 (권장)

### 1단계: 이미지 파일 준비
실제 이미지 파일을 다음 경로에 저장하세요:
```
webbackend/public/images/products/
├── wool-runner-white.jpg
├── wool-runner-black.jpg
├── tree-runner-blue.jpg
├── tree-runner-grey.jpg
├── dasher-night.jpg
└── dasher-white.jpg
```

### 2단계: 샘플 이미지 다운로드 (테스트용)
이미지가 없다면 임시로 placeholder 이미지를 사용할 수 있습니다:

```bash
# 윈도우 PowerShell에서 실행
cd webbackend/public/images/products

# placeholder 이미지 다운로드 (예시)
curl -o wool-runner-white.jpg "https://placeholder.pics/svg/300x300/DEDEDE/555555/Wool%20Runner%20White"
curl -o wool-runner-black.jpg "https://placeholder.pics/svg/300x300/333333/FFFFFF/Wool%20Runner%20Black"
curl -o tree-runner-blue.jpg "https://placeholder.pics/svg/300x300/4A90E2/FFFFFF/Tree%20Runner%20Blue"
curl -o tree-runner-grey.jpg "https://placeholder.pics/svg/300x300/999999/FFFFFF/Tree%20Runner%20Grey"
curl -o dasher-night.jpg "https://placeholder.pics/svg/300x300/2C3E50/FFFFFF/Dasher%20Night"
curl -o dasher-white.jpg "https://placeholder.pics/svg/300x300/ECF0F1/555555/Dasher%20White"
```

### 3단계: DB에 샘플 데이터 삽입
MySQL에서 실행:
```bash
mysql -u root -p allbirds < sample_data.sql
```

또는 MySQL Workbench에서:
1. `sample_data.sql` 파일 열기
2. 전체 선택 후 실행 (Ctrl + Shift + Enter)

### 4단계: 이미지 접근 확인
브라우저에서 접속:
```
http://localhost:3000/images/products/wool-runner-white.jpg
```

---

## 방법 2: 외부 URL 사용 (간단함)

외부 이미지 호스팅 서비스 사용 (Cloudinary, AWS S3, Imgur 등):

### 1단계: DB 데이터 수정
```sql
UPDATE product_variants
SET representative_image_url = 'https://example.com/your-image.jpg'
WHERE variant_id = 1;
```

예시 (무료 이미지 서비스):
```sql
-- Unsplash 이미지 사용
UPDATE product_variants
SET representative_image_url = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff'
WHERE variant_id = 1;
```

---

## 방법 3: 이미지 업로드 API 추가 (프로덕션용)

### 1단계: multer 설치
```bash
cd webbackend
npm install multer
```

### 2단계: 업로드 라우트 생성
파일: `webbackend/product/upload.js`

```javascript
const express = require('express');
const multer = require('multer');
const path = require('path');

module.exports = ({ authMiddleware, adminAuth }) => {
    const router = express.Router();

    // 이미지 저장 설정
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, 'public/images/products/');
        },
        filename: (req, file, cb) => {
            const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueName + path.extname(file.originalname));
        }
    });

    const upload = multer({
        storage: storage,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
        fileFilter: (req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png|webp/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);

            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('이미지 파일만 업로드 가능합니다!'));
            }
        }
    });

    // 이미지 업로드 엔드포인트 (관리자만)
    router.post('/upload-image', authMiddleware, adminAuth, upload.single('image'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
        }

        const imageUrl = `/images/products/${req.file.filename}`;
        res.json({
            message: '✅ 이미지 업로드 성공',
            imageUrl: imageUrl,
            filename: req.file.filename
        });
    });

    return router;
};
```

### 3단계: server.js에 라우트 추가
```javascript
const uploadRoutes = require('../product/upload')({ authMiddleware, adminAuth });
app.use('/api', uploadRoutes);
```

### 4단계: 프론트엔드에서 사용
```javascript
const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('http://localhost:3000/api/upload-image', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
    });

    const data = await response.json();
    return data.imageUrl; // '/images/products/123456789-abcdef.jpg'
};
```

---

## 현재 상태 확인

### DB 데이터 확인
```sql
SELECT
    pv.variant_id,
    p.name,
    pv.color_name,
    pv.representative_image_url
FROM product_variants pv
JOIN products p ON pv.product_id = p.product_id;
```

### 이미지 파일 확인
```bash
ls public/images/products/
```

---

## 권장 사항

1. **개발 환경**: 방법 1 (로컬 저장) 또는 방법 2 (외부 URL)
2. **프로덕션 환경**: 방법 3 (업로드 API) + AWS S3 또는 Cloudinary
3. **이미지 형식**: WebP (최적화) > JPEG > PNG
4. **이미지 크기**: 최대 500KB, 해상도 800x800px 권장

---

## 문제 해결

### 이미지가 로드되지 않을 때
1. 서버가 `public/images` 폴더를 정적 파일로 제공하는지 확인
2. 브라우저에서 이미지 URL 직접 접속 테스트
3. 이미지 경로가 DB에 올바르게 저장되었는지 확인
4. CORS 설정 확인

### 샘플 데이터 다시 삽입
```bash
# 기존 데이터 삭제 후 재삽입
mysql -u root -p allbirds < sample_data.sql
```
