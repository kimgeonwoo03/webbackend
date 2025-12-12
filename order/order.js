// order/order.js

const express = require('express');

// server.js에서 전달받은 의존성 (pool, authMiddleware) 사용
module.exports = ({ pool, authMiddleware }) => {
    const router = express.Router();

    // --- [GET] 주문 내역 조회 (인증 필요) --------------------------------------
    // 엔드포인트: /api/orders
    router.get('/orders', authMiddleware, async (req, res) => {
        const userId = req.user.userId;

        try {
            // 사용자의 모든 주문 조회 (주문 상세 항목 포함)
            const [orders] = await pool.query(
                `SELECT
                    o.order_id,
                    o.total_amount,
                    o.shipping_address,
                    o.payment_method,
                    o.status,
                    o.created_at,
                    oi.order_item_id,
                    oi.quantity,
                    oi.price,
                    p.product_id,
                    p.name AS product_name,
                    p.base_price,
                    pv.variant_id,
                    pv.color_name,
                    pv.representative_image_url AS color_img,
                    po.option_id,
                    po.size,
                    CASE
                        WHEN r.review_id IS NOT NULL THEN true
                        ELSE false
                    END AS is_review_written
                FROM orders o
                JOIN order_items oi ON o.order_id = oi.order_id
                JOIN product_options po ON oi.option_id = po.option_id
                JOIN product_variants pv ON po.variant_id = pv.variant_id
                JOIN products p ON pv.product_id = p.product_id
                LEFT JOIN reviews r ON oi.order_item_id = r.order_item_id
                WHERE o.user_id = ?
                ORDER BY o.created_at DESC, oi.order_item_id ASC`,
                [userId]
            );

            if (orders.length === 0) {
                return res.status(200).json({
                    message: '주문 내역이 없습니다.',
                    orders: []
                });
            }

            // 주문 데이터를 order_id별로 그룹화
            const ordersMap = {};

            orders.forEach(row => {
                if (!ordersMap[row.order_id]) {
                    ordersMap[row.order_id] = {
                        order_id: row.order_id,
                        total_amount: row.total_amount,
                        shipping_address: row.shipping_address,
                        payment_method: row.payment_method,
                        status: row.status,
                        created_at: row.created_at,
                        items: []
                    };
                }

                ordersMap[row.order_id].items.push({
                    order_item_id: row.order_item_id,
                    product_id: row.product_id,
                    product_name: row.product_name,
                    quantity: row.quantity,
                    price: row.price,
                    color_name: row.color_name,
                    color_img: row.color_img,
                    size: row.size,
                    option_id: row.option_id,
                    is_review_written: row.is_review_written
                });
            });

            // 맵을 배열로 변환
            const ordersList = Object.values(ordersMap);

            res.status(200).json({
                message: '✅ 주문 내역 조회 성공',
                orders: ordersList
            });

        } catch (error) {
            console.error('❌ 주문 내역 조회 오류:', {
                message: error.message,
                code: error.code,
                errno: error.errno,
                sqlMessage: error.sqlMessage,
                sql: error.sql,
                stack: error.stack
            });

            res.status(500).json({
                error: '주문 내역 조회 중 서버 오류가 발생했습니다.',
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    });

    return router;
};
