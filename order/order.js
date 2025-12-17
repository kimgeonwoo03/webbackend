// server/order/order.js
const express = require('express');

module.exports = ({ pool, authMiddleware }) => {
    const router = express.Router();

    // ==========================================================
    // [GET] /api/user/orders (사용자 본인의 주문 내역 조회)
    // ==========================================================
    router.get('/orders', authMiddleware, async (req, res) => {
        try {
            const userId = req.user.userId;

            // ✨ [수정] payment_date -> created_at, price_at_purchase -> price 로 변경
            const sql = `
                SELECT 
                    o.order_id,
                    DATE_FORMAT(o.created_at, '%Y-%m-%d %H:%i') AS payment_date, -- 생성일을 결제일로 사용
                    o.status,
                    o.total_amount,
                    oi.order_item_id,
                    oi.quantity,
                    oi.price AS price, -- 컬럼명 수정
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
                ORDER BY o.created_at DESC
            `;

            const [rows] = await pool.query(sql, [userId]);

            const ordersMap = new Map();

            rows.forEach(row => {
                if (!ordersMap.has(row.order_id)) {
                    ordersMap.set(row.order_id, {
                        order_id: row.order_id,
                        payment_date: row.payment_date,
                        status: row.status,
                        total_amount: row.total_amount,
                        items: []
                    });
                }

                ordersMap.get(row.order_id).items.push({
                    order_item_id: row.order_item_id,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    color: row.color_name,
                    size: row.size,
                    quantity: row.quantity,
                    price: row.price, // 수정된 이름 사용
                    image_url: row.image_url,
                    is_review_written: Boolean(row.is_review_written)
                });
            });

            const responseData = Array.from(ordersMap.values());
            res.json(responseData);

        } catch (error) {
            console.error('주문 내역 조회 에러:', error);
            res.status(500).json({ error: '주문 내역을 불러오지 못했습니다.' });
        }
    });

    return router;
};