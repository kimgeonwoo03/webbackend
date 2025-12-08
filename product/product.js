const express = require('express');

// server.js에서 전달받은 의존성 (pool, authMiddleware, adminAuth) 사용
module.exports = ({ pool, authMiddleware, adminAuth }) => { 
    const router = express.Router();

    // --- 1. [GET] 인기 상품 목록 조회 (인증 필요 없음) ------------------
    // 엔드포인트: /api/products/popular-list
    router.get('/products/popular-list', async (req, res) => {
        try {
            // 프론트엔드 카드가 필요로 하는 데이터: 
            // id, rank, name, detail(색상명), price, originalPrice, image, sizes(배열)
            
            const sql = `
                SELECT 
                    pv.variant_id AS id,
                    p.name AS name,
                    pv.color_name AS detail,
                    p.base_price AS originalPrice,
                    -- 할인율이 적용된 최종 가격 계산 (소수점 버림)
                    CAST(p.base_price * (1 - COALESCE(pv.discount_rate, 0) / 100) AS UNSIGNED) AS price,
                    pv.representative_image_url AS image,
                    -- 해당 색상(Variant)의 재고가 있는 사이즈만 배열로 추출
                    (
                        SELECT JSON_ARRAYAGG(po.size)
                        FROM product_options po
                        WHERE po.variant_id = pv.variant_id AND po.stock_quantity > 0
                    ) AS sizes
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.product_id
                -- 조건: 인기순 또는 최신순 (여기서는 최신 등록순 10개)
                ORDER BY pv.registration_date DESC
                LIMIT 10;
            `;
            
            const [rows] = await pool.query(sql);

            // DB에서 가져온 데이터를 프론트엔드 형식에 맞게 가공
            const formattedRows = rows.map((row, index) => {
                // sizes가 가끔 문자열로 반환되는 경우(DB 버전 차이)를 대비해 파싱
                let sizesArray = [];
                try {
                    sizesArray = typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes;
                } catch (e) {
                    sizesArray = [];
                }

                return {
                    ...row,
                    rank: index + 1, // 1위, 2위... 순위 부여
                    sizes: sizesArray || [] // null일 경우 빈 배열
                };
            });

            res.json({
                message: '✅ 인기 상품 목록 조회 성공',
                products: formattedRows
            });

        } catch (error) {
            console.error('인기 상품 목록 DB 쿼리 오류:', error);
            res.status(500).json({ error: '데이터베이스에서 인기 상품을 가져오는 데 실패했습니다.' });
        }
    });

    // --- 2. [POST] 상품 추가 (관리자 전용) ------------------------------
    // (기존 코드 유지)
    router.post('/products', authMiddleware, adminAuth, async (req, res) => {
        const { name, description, base_price, gender, material_id, badge } = req.body;

        if (!name || !base_price || !material_id) {
            return res.status(400).json({ error: '필수 상품 정보(이름, 가격, 소재ID)가 누락되었습니다.' });
        }

        try {
            const sql = `
                INSERT INTO products (name, description, base_price, gender, material_id, badge)
                VALUES (?, ?, ?, ?, ?, ?);
            `;
            const [result] = await pool.query(sql, [name, description, base_price, gender, material_id, badge]);
            
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
    
    // --- 3. [GET] 소재 목록 조회 등 나머지 라우트들... (기존 코드 유지) ---
    // (이 부분은 수정할 필요 없이 그대로 두시면 됩니다)

    return router;
};