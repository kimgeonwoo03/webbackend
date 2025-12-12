// checkout/checkout.js

const express = require('express');

// server.js에서 전달받은 의존성 (pool, authMiddleware) 사용
module.exports = ({ pool, authMiddleware }) => {
    const router = express.Router();

    // --- [POST] 결제 처리 (인증 필요) --------------------------------------
    // 엔드포인트: /api/checkout
    router.post('/checkout', authMiddleware, async (req, res) => {
        const userId = req.user.userId;
        const { shippingAddress, paymentMethod, cartIds } = req.body;

        // 필수 필드 검증
        if (!shippingAddress || !paymentMethod) {
            return res.status(400).json({ error: '배송 주소와 결제 방법은 필수입니다.' });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // 1. 장바구니 항목 조회 (특정 cartIds가 있으면 해당 항목만, 없으면 전체)
            let cartSql = `
                SELECT
                    c.cart_id,
                    c.quantity,
                    c.option_id,
                    p.product_id,
                    p.name AS product_name,
                    p.base_price,
                    pv.variant_id,
                    pv.color_name,
                    pv.discount_rate,
                    po.size,
                    po.stock_quantity
                FROM cart c
                JOIN product_options po ON c.option_id = po.option_id
                JOIN product_variants pv ON po.variant_id = pv.variant_id
                JOIN products p ON pv.product_id = p.product_id
                WHERE c.user_id = ?
            `;
            const params = [userId];

            if (cartIds && cartIds.length > 0) {
                cartSql += ' AND c.cart_id IN (?)';
                params.push(cartIds);
            }

            const [cartItems] = await connection.query(cartSql, params);

            if (cartItems.length === 0) {
                await connection.rollback();
                return res.status(400).json({ error: '장바구니가 비어있습니다.' });
            }

            // 2. 재고 확인
            for (const item of cartItems) {
                if (item.stock_quantity < item.quantity) {
                    await connection.rollback();
                    return res.status(400).json({
                        error: `재고 부족: ${item.product_name} (${item.color_name}, ${item.size})`
                    });
                }
            }

            // 3. 총 금액 계산
            const totalAmount = cartItems.reduce((sum, item) => {
                const discountedPrice = item.base_price * (1 - (item.discount_rate || 0) / 100);
                return sum + (discountedPrice * item.quantity);
            }, 0);

            // 4. 주문 생성
            const [orderResult] = await connection.query(
                `INSERT INTO orders (user_id, total_amount, shipping_address, payment_method, status, created_at)
                 VALUES (?, ?, ?, ?, 'pending', NOW())`,
                [userId, Math.round(totalAmount), shippingAddress, paymentMethod]
            );
            const orderId = orderResult.insertId;

            // 5. 주문 상세 항목 생성 및 재고 차감
            for (const item of cartItems) {
                const itemPrice = item.base_price * (1 - (item.discount_rate || 0) / 100);

                // 주문 상세 삽입
                await connection.query(
                    `INSERT INTO order_items (order_id, option_id, quantity, price, created_at)
                     VALUES (?, ?, ?, ?, NOW())`,
                    [orderId, item.option_id, item.quantity, Math.round(itemPrice)]
                );

                // 재고 차감
                await connection.query(
                    'UPDATE product_options SET stock_quantity = stock_quantity - ? WHERE option_id = ?',
                    [item.quantity, item.option_id]
                );
            }

            // 6. 결제된 장바구니 항목 삭제
            const cartIdsToDelete = cartItems.map(item => item.cart_id);
            await connection.query(
                'DELETE FROM cart WHERE cart_id IN (?)',
                [cartIdsToDelete]
            );

            // 7. 주문 상태를 'paid'로 업데이트 (실제 결제 연동 시 PG 응답 후 처리)
            await connection.query(
                'UPDATE orders SET status = ? WHERE order_id = ?',
                ['paid', orderId]
            );

            await connection.commit();

            res.status(201).json({
                message: '✅ 결제가 성공적으로 완료되었습니다.',
                orderId: orderId,
                totalAmount: Math.round(totalAmount),
                itemCount: cartItems.length,
                status: 'paid'
            });

        } catch (error) {
            await connection.rollback();
            console.error('❌ 결제 처리 오류 상세:', {
                message: error.message,
                code: error.code,
                errno: error.errno,
                sqlMessage: error.sqlMessage,
                sql: error.sql,
                stack: error.stack
            });

            // 에러 메시지를 사용자에게 더 명확하게 전달
            let errorMessage = '결제 처리 중 서버 오류가 발생했습니다.';

            if (error.code === 'ER_NO_SUCH_TABLE') {
                errorMessage = 'orders 테이블이 존재하지 않습니다. 데이터베이스를 확인해주세요.';
                console.error('💡 해결방법: create_orders_table.sql 파일을 실행하세요.');
            } else if (error.code === 'ER_DUP_ENTRY') {
                errorMessage = '중복된 주문입니다.';
            } else if (error.code === 'ER_NO_REFERENCED_ROW' || error.code === 'ER_NO_REFERENCED_ROW_2') {
                errorMessage = '참조된 데이터를 찾을 수 없습니다.';
            }

            res.status(500).json({
                error: errorMessage,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        } finally {
            connection.release();
        }
    });

    return router;
};
