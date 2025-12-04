// server.js

// 1. 필요한 모듈 불러오기
require('dotenv').config(); // .env 파일 로드
const db = require('./db'); // db.js 모듈 불러오기
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // 환경 변수에서 포트를 가져오거나 기본값 사용

// 2. 미들웨어 설정
app.use(express.json()); // JSON 형태의 요청 본문(body)을 파싱합니다.
// app.use(express.urlencoded({ extended: true })); // URL-encoded 본문 파싱이 필요할 경우 추가

// 3. 기본 라우팅
app.get('/', (req, res) => {
  res.send('백엔드 서버가 Express로 실행 중입니다!');
});

app.get('/users', async (req, res) => {
  try {
    // SQL 쿼리 실행
    const [rows, fields] = await db.query('SELECT * FROM users'); 
    res.json(rows);
  } catch (err) {
    console.error('MySQL 쿼리 실행 오류:', err);
    res.status(500).send('데이터베이스 오류');
  }
});

// 모든 상품 목록을 조회하는 API
app.get('/api/products', async (req, res) => {
  try {
    // 💡 SQL 쿼리 작성 (products와 product_variants를 연결하여 기본 정보와 가격 정보를 가져옴)
    const query = `
      SELECT 
          p.product_id, 
          p.name, 
          p.base_price,
          pv.representative_image_url,
          pv.discount_rate,
          p.base_price * (1 - pv.discount_rate / 100) AS final_price
      FROM 
          products p
      JOIN 
          product_variants pv ON p.product_id = pv.product_id
      WHERE 
          pv.variant_id IN (
              SELECT MIN(variant_id) FROM product_variants GROUP BY product_id
          )
      ORDER BY 
          p.created_at DESC;
    `;

    // 쿼리 실행
    const [rows] = await db.query(query);

    // 성공적으로 데이터를 JSON 형태로 응답
    res.status(200).json({ 
      success: true, 
      data: rows 
    });

  } catch (error) {
    console.error('상품 목록 조회 중 오류 발생:', error);
    // 오류가 발생하면 500 상태 코드와 메시지를 응답
    res.status(500).json({ 
      success: false, 
      message: '서버 데이터베이스 오류' 
    });
  }
});

// 상품 상세 정보를 조회하는 API
app.get('/api/products/:productId', async (req, res) => {
  const productId = req.params.productId;

  try {
    // 1. 상품의 핵심 정보 (products 테이블)를 가져옵니다.
    const productQuery = `
      SELECT 
          p.product_id, p.name, p.description, p.base_price, p.gender, p.badge, p.is_recommended,
          m.title AS material_name
      FROM 
          products p
      LEFT JOIN 
          materials m ON p.material_id = m.material_id
      WHERE 
          p.product_id = ?;
    `;
    const [productRows] = await db.query(productQuery, [productId]);
    
    // 상품이 존재하지 않으면 404 응답
    if (productRows.length === 0) {
      return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' });
    }
    const product = productRows[0];


    // 2. 모든 상품 Variants (색상/할인 정보)와 Options (사이즈/재고)를 가져옵니다.
    const variantsQuery = `
      SELECT 
          pv.variant_id, pv.color_name, pv.color_hex, pv.representative_image_url, pv.discount_rate,
          po.option_id, po.size, po.stock_quantity
      FROM 
          product_variants pv
      LEFT JOIN 
          product_options po ON pv.variant_id = po.variant_id
      WHERE 
          pv.product_id = ?
      ORDER BY 
          pv.variant_id, CAST(po.size AS UNSIGNED);
    `;
    const [variantOptionRows] = await db.query(variantsQuery, [productId]);

    // 데이터를 Variants 중심으로 구조화합니다.
    const variants = {};
    variantOptionRows.forEach(row => {
      if (!variants[row.variant_id]) {
        // Variant (색상) 정보 초기화
        variants[row.variant_id] = {
          variant_id: row.variant_id,
          color_name: row.color_name,
          color_hex: row.color_hex,
          representative_image_url: row.representative_image_url,
          discount_rate: row.discount_rate,
          // 판매가 계산 (기본 가격 * (1 - 할인율/100))
          final_price: product.base_price * (1 - row.discount_rate / 100), 
          options: [],
        };
      }
      
      // Option (사이즈/재고) 정보 추가
      if (row.option_id) {
          variants[row.variant_id].options.push({
              option_id: row.option_id,
              size: row.size,
              stock_quantity: row.stock_quantity,
          });
      }
    });


    // 3. 상품 상세 설명 섹션 (product_details)을 가져옵니다.
    const detailsQuery = `
      SELECT section_title, content
      FROM product_details
      WHERE product_id = ?
      ORDER BY sort_order;
    `;
    const [detailsRows] = await db.query(detailsQuery, [productId]);


    // 4. 모든 정보를 하나의 객체로 통합하여 응답합니다.
    const responseData = {
      ...product, // product_id, name, base_price, material_name 등
      variants: Object.values(variants), // 구조화된 Variants 목록
      details: detailsRows, // 상세 설명 목록
    };

    res.status(200).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error(`상품 ID ${productId} 조회 중 오류 발생:`, error);
    res.status(500).json({ success: false, message: '서버 데이터베이스 오류' });
  }
});


// 4. 서버 시작
app.listen(port, () => {
  console.log(`✅ 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});