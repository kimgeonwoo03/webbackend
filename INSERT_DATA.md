# 데이터베이스 샘플 데이터 삽입 가이드

## 📋 준비사항
- MySQL 서버가 실행 중이어야 합니다
- `allbirds` 데이터베이스가 생성되어 있어야 합니다
- 테이블이 생성되어 있어야 합니다 (products, product_variants, product_options, reviews, cart)

---

## 방법 1: MySQL 명령줄 (CMD/PowerShell)

```bash
# 1. webbackend 폴더로 이동
cd c:\Users\djaxo\Documents\GitHub\Shopping-web\webbackend

# 2. MySQL에 접속하여 SQL 파일 실행
mysql -u root -p allbirds < sample_data.sql

# 3. 비밀번호 입력 후 완료!
```

---

## 방법 2: MySQL Workbench (GUI)

1. **MySQL Workbench 실행**
2. **Local instance 연결** (root 비밀번호 입력)
3. **좌측 Schemas에서 `allbirds` 선택**
4. **File → Open SQL Script** 선택
5. **`sample_data.sql` 파일 열기**
6. **상단의 번개 아이콘 (Execute)** 클릭 또는 `Ctrl + Shift + Enter`
7. **하단 Output 패널에서 결과 확인**

---

## 방법 3: VSCode MySQL Extension 사용

1. **VSCode에서 MySQL Extension 설치** (cweijan.vscode-mysql-client2)
2. **MySQL 연결 생성** (root, allbirds)
3. **`sample_data.sql` 파일 열기**
4. **우클릭 → Run MySQL** 또는 `Ctrl + Enter`

---

## 삽입 확인

SQL 실행 후 다음 쿼리로 확인:

```sql
-- 상품 수 확인
SELECT COUNT(*) as total_products FROM products;
-- 결과: 6개

-- 색상 변형 수 확인
SELECT COUNT(*) as total_variants FROM product_variants;
-- 결과: 12개

-- 사이즈 옵션 수 확인
SELECT COUNT(*) as total_options FROM product_options;
-- 결과: 96개

-- 리뷰 수 확인
SELECT COUNT(*) as total_reviews FROM reviews;
-- 결과: 7개

-- 전체 데이터 확인
SELECT
    p.product_id,
    p.name,
    p.base_price,
    COUNT(DISTINCT pv.variant_id) as color_count,
    COUNT(po.option_id) as size_count
FROM products p
LEFT JOIN product_variants pv ON p.product_id = pv.product_id
LEFT JOIN product_options po ON pv.variant_id = po.variant_id
GROUP BY p.product_id, p.name, p.base_price;
```

---

## 🖼️ 이미지 URL 확인

모든 상품 이미지 확인:

```sql
SELECT
    p.name as product_name,
    pv.color_name,
    pv.representative_image_url
FROM product_variants pv
JOIN products p ON pv.product_id = p.product_id
ORDER BY p.product_id, pv.variant_id;
```

브라우저에서 직접 테스트:
- https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=800&fit=crop

---

## 🔄 재삽입 (데이터 초기화)

데이터를 다시 삽입하려면:

```sql
-- sample_data.sql 파일에 이미 DELETE 문이 포함되어 있으므로
-- 파일을 다시 실행하면 자동으로 기존 데이터가 삭제되고 새 데이터가 삽입됩니다
```

```bash
mysql -u root -p allbirds < sample_data.sql
```

---

## ❗ 문제 해결

### "Table doesn't exist" 에러
테이블을 먼저 생성해야 합니다:
```bash
# 테이블 생성 SQL 파일 실행
mysql -u root -p allbirds < create_tables.sql
```

### "Access denied" 에러
MySQL 비밀번호를 확인하거나:
```bash
mysql -u root -p
# 비밀번호 입력
USE allbirds;
source c:/Users/djaxo/Documents/GitHub/Shopping-web/webbackend/sample_data.sql
```

### 외래 키 제약 조건 에러
삭제 순서가 중요합니다. sample_data.sql은 이미 올바른 순서로 작성되어 있습니다:
1. reviews
2. cart
3. product_options
4. product_variants
5. products

---

## 🎯 다음 단계

데이터 삽입 후:
1. ✅ 백엔드 서버 실행: `cd back && node server.js`
2. ✅ 프론트엔드 실행: `cd webfrontend/front && npm run dev`
3. ✅ 브라우저에서 확인: `http://localhost:5173`
4. ✅ 로그인 후 `/men-products` 또는 `/product/1` 접속하여 이미지 확인

---

## 📊 현재 데이터 구조

### 상품 6개
1. 울 러너 (₩135,000) - 2색상 × 8사이즈 = 16옵션
2. 트리 러너 (₩145,000) - 2색상 × 8사이즈 = 16옵션
3. 대셔 (₩125,000) - 2색상 × 8사이즈 = 16옵션
4. 트리 브리저 (₩115,000) - 2색상 × 8사이즈 = 16옵션
5. 울 파이퍼 (₩155,000) - 2색상 × 8사이즈 = 16옵션
6. 트리 스키퍼 (₩105,000) - 2색상 × 8사이즈 = 16옵션

### 색상 변형 12개
각 상품마다 2가지 색상 (총 12개)

### 사이즈 옵션 96개
각 색상마다 8가지 사이즈 (230~265)

### 이미지
모든 이미지는 Unsplash 외부 URL 사용
- 별도 파일 다운로드 불필요
- 바로 사용 가능
- CORS 문제 없음
