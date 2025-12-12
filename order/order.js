// server/order/order.js
const express = require('express');

module.exports = ({ pool, authMiddleware }) => {
    const router = express.Router();

    // ==========================================================
    // [GET] /api/user/orders (사용자 본인의 주문 내역 조회)
    // ==========================================================
    router.get('/orders', authMiddleware, async (req, res) => {
        try {
            // 1. 토큰에서 로그인한 사용자 ID(userId)를 가져옵니다.
            const userId = req.user.userId;

            // 2. SQL 쿼리: 주문 + 주문상세 + 옵션 + 변형 + 상품 테이블 조인
            const sql = `
                SELECT 
                    o.order_id,
                    DATE_FORMAT(o.payment_date, '%Y-%m-%d %H:%i') AS payment_date,
                    o.status,
                    o.total_amount,
                    oi.order_item_id,
                    oi.quantity,
                    oi.price_at_purchase,
                    oi.is_review_written,
                    p.product_id,
                    p.name AS product_name,
                    pv.color_name,
                    pv.representative_image_url AS image_url,
                    po.size
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN product_options po ON oi.option_id = po.option_id
                JOIN product_variants pv ON po.variant_id = pv.variant_id
                JOIN products p ON pv.product_id = p.product_id
                WHERE o.user_id = ?
                ORDER BY o.payment_date DESC
            `;

            // pool.query는 [rows, fields]를 반환하므로 rows만 구조분해할당
            const [rows] = await pool.query(sql, [userId]);

            // 3. 데이터 그룹화 (Flat Data -> Hierarchical Data)
            // 하나의 주문번호(order_id) 아래에 여러 상품(items)을 묶습니다.
            const ordersMap = new Map();

            rows.forEach(row => {
                if (!ordersMap.has(row.order_id)) {
                    ordersMap.set(row.order_id, {
                        order_id: row.order_id,
                        payment_date: row.payment_date,
                        status: row.status,
                        total_amount: row.total_amount, // 주문 총액
                        items: [] // 여기에 상품들이 담김
                    });
                }

                // 해당 주문의 상품 목록(items)에 현재 행의 상품 정보를 추가
                ordersMap.get(row.order_id).items.push({
                    order_item_id: row.order_item_id,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    color: row.color_name,
                    size: row.size,
                    quantity: row.quantity,
                    price: row.price_at_purchase, // 개별 상품 구매가
                    image_url: row.image_url,
                    is_review_written: Boolean(row.is_review_written)
                });
            });

            // 4. Map을 배열로 변환하여 응답
            const responseData = Array.from(ordersMap.values());
            res.json(responseData);

        } catch (error) {
            console.error('주문 내역 조회 에러:', error);
            res.status(500).json({ error: '주문 내역을 불러오지 못했습니다.' });
        }
    });

    return router;
};