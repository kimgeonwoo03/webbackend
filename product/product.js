// product/product.js

const express = require('express');

// server.js에서 전달받은 의존성 (pool, authMiddleware, adminAuth) 사용
module.exports = ({ pool, authMiddleware, adminAuth }) => { 
    const router = express.Router();

    // --- 1. [GET] 인기 상품 목록 조회 (인증 필요 없음) ------------------
    // 엔드포인트: /api/products/popular-list
    router.get('/products/popular-list', async (req, res) => {
        try {
            // products 테이블의 컬럼 구조를 바탕으로 쿼리 작성 (이미지 참조)
            const sql = `
                SELECT 
    p.product_id AS groupId,
    p.name AS groupName,
    p.base_price AS basePrice,
    (
        SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
                'variantId', pv.variant_id,
                'colorName', pv.color_name,
                'image', pv.representative_image_url,
                'discountRate', pv.discount_rate,
                'registrationDate', pv.registration_date,
                'options', (
                    SELECT JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'size', CAST(po.size AS UNSIGNED),
                            'stock', po.stock_quantity
                        )
                    )
                    FROM product_options po
                    WHERE po.variant_id = pv.variant_id
                    ORDER BY CAST(po.size AS UNSIGNED) ASC
                )
            )
        )
        FROM product_variants pv
        WHERE pv.product_id = p.product_id
    ) AS variants
FROM products p;
            `;
            
            const [rows] = await pool.query(sql);

            res.json({
                message: '✅ 인기 상품 목록 조회 성공',
                products: rows
            });

        } catch (error) {
            console.error('인기 상품 목록 DB 쿼리 오류:', error);
            res.status(500).json({ error: '데이터베이스에서 인기 상품을 가져오는 데 실패했습니다.' });
        }
    });

    // --- 2. [POST] 상품 추가 (관리자 전용) ------------------------------
    // 엔드포인트: /api/products
    // 미들웨어 순서: 1. 토큰 검증 (authMiddleware), 2. 관리자 권한 검증 (adminAuth)
    router.post('/products', authMiddleware, adminAuth, async (req, res) => {
        // 클라이언트에서 받아야 할 상품 정보
        const { name, description, base_price, gender, material_id, badge } = req.body;

        if (!name || !base_price || !material_id) {
            return res.status(400).json({ error: '필수 상품 정보(이름, 가격, 소재ID)가 누락되었습니다.' });
        }

        try {
            // DB에 상품 정보를 삽입
            const sql = `
                INSERT INTO products (name, description, base_price, gender, material_id, badge)
                VALUES (?, ?, ?, ?, ?, ?);
            `;
            const [result] = await pool.query(sql, [name, description, base_price, gender, material_id, badge]);
            
            // 성공 응답
            res.status(201).json({
                message: '✅ 새로운 상품이 성공적으로 등록되었습니다.',
                productId: result.insertId,
                data: req.body
            });

        } catch (error) {
            console.error('상품 등록 중 오류 발생:', error);
            res.status(500).json({ error: '서버 데이터베이스 오류로 상품 등록에 실패했습니다.' });
        }
    });
    
    // 💡 참고: [PUT] 상품 수정, [DELETE] 상품 삭제 라우트는 여기에 추가됩니다.
    
    return router;
};