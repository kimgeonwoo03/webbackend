// server/product/product.js
const express = require('express');

module.exports = ({ pool, authMiddleware, adminAuth }) => {
    const router = express.Router();

    // ==========================================================
    // 1. [GET] /api/admin/products (전체 상품 목록 조회)
    // ==========================================================
    router.get('/admin/products', authMiddleware, adminAuth, async (req, res) => {
        try {
            // 복잡한 JSON 구조를 DB에서 바로 생성하는 쿼리
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
            res.json(rows); 
        } catch (error) {
            console.error('상품 목록 조회 에러:', error);
            res.status(500).json({ error: '상품 목록을 불러오지 못했습니다.' });
        }
    });

    // ==========================================================
    // 2. [POST] /api/admin/products (신규 상품 그룹 등록)
    // ==========================================================
    router.post('/admin/products', authMiddleware, adminAuth, async (req, res) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const { groupName, basePrice, variants } = req.body;
            const firstVariant = variants[0]; // 신규 등록 시엔 보통 1개

            // (1) 상품 그룹 등록
            const [productResult] = await conn.query(
                'INSERT INTO products (name, base_price) VALUES (?, ?)',
                [groupName, basePrice]
            );
            const newProductId = productResult.insertId;

            // (2) 첫 번째 컬러(Variant) 등록
            const [variantResult] = await conn.query(
                `INSERT INTO product_variants 
                (product_id, color_name, representative_image_url, discount_rate, registration_date) 
                VALUES (?, ?, ?, ?, CURDATE())`,
                [newProductId, firstVariant.colorName, firstVariant.image, firstVariant.discountRate]
            );
            const newVariantId = variantResult.insertId;

            // (3) 옵션(사이즈/재고) 등록
            if (firstVariant.options && firstVariant.options.length > 0) {
                const optionValues = firstVariant.options.map(opt => [newVariantId, opt.size, opt.stock]);
                await conn.query(
                    'INSERT INTO product_options (variant_id, size, stock_quantity) VALUES ?',
                    [optionValues]
                );
            }

            await conn.commit();
            res.status(201).json({ message: '신규 상품 그룹 등록 성공', groupId: newProductId });

        } catch (error) {
            await conn.rollback();
            console.error('상품 등록 에러:', error);
            res.status(500).json({ error: '상품 등록 실패' });
        } finally {
            conn.release();
        }
    });

    // ==========================================================
    // 3. [POST] /api/admin/products/:groupId/variants (새 컬러 추가)
    // ==========================================================
    router.post('/admin/products/:groupId/variants', authMiddleware, adminAuth, async (req, res) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            
            const { groupId } = req.params;
            const { colorName, image, discountRate, options } = req.body;

            const [variantResult] = await conn.query(
                `INSERT INTO product_variants 
                (product_id, color_name, representative_image_url, discount_rate, registration_date) 
                VALUES (?, ?, ?, ?, CURDATE())`,
                [groupId, colorName, image, discountRate]
            );
            const newVariantId = variantResult.insertId;

            if (options && options.length > 0) {
                const optionValues = options.map(opt => [newVariantId, opt.size, opt.stock]);
                await conn.query(
                    'INSERT INTO product_options (variant_id, size, stock_quantity) VALUES ?',
                    [optionValues]
                );
            }

            await conn.commit();
            res.status(201).json({ message: '컬러 추가 성공', variantId: newVariantId });

        } catch (error) {
            await conn.rollback();
            console.error('컬러 추가 에러:', error);
            res.status(500).json({ error: '컬러 추가 실패' });
        } finally {
            conn.release();
        }
    });

    // ==========================================================
    // 4. [PUT] /api/admin/products/variants/:variantId (수정 - 안전한 방식)
    // ==========================================================
    router.put('/admin/products/variants/:variantId', authMiddleware, adminAuth, async (req, res) => {
        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();
            const { variantId } = req.params;
            const { discountRate, options } = req.body; 

            // (1) 할인율 업데이트
            if (discountRate !== undefined) {
                await conn.query(
                    'UPDATE product_variants SET discount_rate = ? WHERE variant_id = ?',
                    [discountRate, variantId]
                );
            }

            // (2) 옵션 업데이트 (삭제하지 않고, 건별로 확인하여 처리)
            if (options && options.length > 0) {
                for (const opt of options) {
                    // 2-1. 먼저 해당 사이즈가 있는지 확인하고 재고 업데이트 시도
                    const [updateResult] = await conn.query(
                        'UPDATE product_options SET stock_quantity = ? WHERE variant_id = ? AND size = ?',
                        [opt.stock, variantId, opt.size]
                    );

                    // 2-2. 업데이트 된 행이 없다면(0) -> 없는 사이즈이므로 INSERT
                    if (updateResult.affectedRows === 0) {
                        await conn.query(
                            'INSERT INTO product_options (variant_id, size, stock_quantity) VALUES (?, ?, ?)',
                            [variantId, opt.size, opt.stock]
                        );
                    }
                }
            }
            
            // 주의: 이 방식은 화면에서 '삭제'한 사이즈를 DB에서 실제로 지우지는 않습니다.
            // (판매 이력이 있는 사이즈를 지우면 DB 에러가 나기 때문에, 안전하게 남겨두는 정책입니다)

            await conn.commit();
            res.json({ message: '수정 완료' });

        } catch (error) {
            await conn.rollback();
            console.error('수정 에러:', error); // 서버 터미널에서 구체적인 에러 확인 가능
            res.status(500).json({ error: '수정 실패' });
        } finally {
            conn.release();
        }
    });

    // ==========================================================
    // 5. [GET] /api/admin/sales (매출 현황)
    // ==========================================================
    router.get('/admin/sales', authMiddleware, adminAuth, async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            const sql = `
                SELECT 
                    sub.variant_id,
                    sub.name,
                    sub.image,
                    SUM(sub.daily_qty) AS totalQty,
                    SUM(sub.daily_revenue) AS totalRevenue,
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'date', sub.sales_date,
                            'qty', sub.daily_qty,
                            'revenue', sub.daily_revenue
                        )
                    ) AS daily_history
                FROM (
                    SELECT 
                        pv.variant_id,
                        CONCAT(p.name, ' (', pv.color_name, ')') AS name,
                        pv.representative_image_url AS image,
                        DATE_FORMAT(o.payment_date, '%Y-%m-%d') AS sales_date,
                        SUM(oi.quantity) AS daily_qty,
                        SUM(oi.quantity * oi.price_at_purchase) AS daily_revenue
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.order_id
                    JOIN product_options po ON oi.option_id = po.option_id
                    JOIN product_variants pv ON po.variant_id = pv.variant_id
                    JOIN products p ON pv.product_id = p.product_id
                    WHERE o.payment_date BETWEEN ? AND ? 
                      AND o.status IN ('PAID', 'SHIPPED', 'DELIVERED')
                    GROUP BY pv.variant_id, p.name, pv.color_name, pv.representative_image_url, DATE_FORMAT(o.payment_date, '%Y-%m-%d')
                ) sub
                GROUP BY sub.variant_id, sub.name, sub.image
                ORDER BY totalRevenue DESC;
            `;

            // 시간 범위 보정 (00:00:00 ~ 23:59:59)
            const start = `${startDate} 00:00:00`;
            const end = `${endDate} 23:59:59`;

            const [rows] = await pool.query(sql, [start, end]);
            res.json(rows);

        } catch (error) {
            console.error('매출 조회 에러:', error);
            res.status(500).json({ error: '매출 데이터를 불러오지 못했습니다.' });
        }
    });

    // ==========================================================
    // 5. [GET] /api/admin/sales (매출 현황 조회)
    // ==========================================================
    router.get('/admin/sales', authMiddleware, adminAuth, async (req, res) => {
        try {
            // 1. 프론트에서 보낸 날짜 받기 (없으면 기본값 설정)
            const startDate = req.query.startDate || '2025-01-01';
            const endDate = req.query.endDate || '2025-12-31';

            // 2. SQL 쿼리 (상품별 합계 + 일별 상세 내역 JSON 생성)
            const sql = `
                SELECT 
                    sub.variant_id,
                    sub.name,
                    sub.image,
                    
                    -- [1] 전체 기간 총 판매량 및 매출액
                    CAST(SUM(sub.daily_qty) AS UNSIGNED) AS totalQty,
                    CAST(SUM(sub.daily_revenue) AS UNSIGNED) AS totalRevenue,

                    -- [2] 일별 상세 내역을 JSON 배열로 변환 (아코디언용)
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                            'date', sub.sales_date,
                            'qty', sub.daily_qty,
                            'revenue', sub.daily_revenue
                        )
                    ) AS daily_history

                FROM (
                    -- [서브쿼리] 먼저 '상품 + 날짜' 단위로 그룹화
                    SELECT 
                        pv.variant_id,
                        CONCAT(p.name, ' (', pv.color_name, ')') AS name,
                        pv.representative_image_url AS image,
                        DATE_FORMAT(o.payment_date, '%Y-%m-%d') AS sales_date,
                        
                        SUM(oi.quantity) AS daily_qty,
                        SUM(oi.quantity * oi.price_at_purchase) AS daily_revenue

                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.order_id
                    JOIN product_options po ON oi.option_id = po.option_id
                    JOIN product_variants pv ON po.variant_id = pv.variant_id
                    JOIN products p ON pv.product_id = p.product_id
                    
                    -- 날짜 및 결제 상태 필터링
                    WHERE o.payment_date BETWEEN ? AND ? 
                      AND o.status IN ('PAID', 'SHIPPED', 'DELIVERED')
                      
                    GROUP BY pv.variant_id, p.name, pv.color_name, pv.representative_image_url, DATE_FORMAT(o.payment_date, '%Y-%m-%d')
                ) sub
                
                -- [메인쿼리] 상품별로 최종 그룹화
                GROUP BY sub.variant_id, sub.name, sub.image
                ORDER BY totalRevenue DESC;
            `;

            // 날짜 포맷 맞추기 (00:00:00 ~ 23:59:59)
            const start = `${startDate} 00:00:00`;
            const end = `${endDate} 23:59:59`;

            const [rows] = await pool.query(sql, [start, end]);

            // 3. 결과 반환
            res.json(rows);

        } catch (error) {
            console.error('매출 조회 에러:', error);
            res.status(500).json({ error: '매출 데이터를 불러오지 못했습니다.' });
        }
    });

    return router;
};