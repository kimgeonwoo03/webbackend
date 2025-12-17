// checkout/checkout.js

const express = require('express');

// ✅ 공통 할인 적용 함수
function applySale(basePrice, discountRate, saleStart, saleEnd) {
    let discount = discountRate || 0;

    if (saleStart && saleEnd) {
        const now = new Date();
        const start = new Date(saleStart);
        const end = new Date(saleEnd);

        if (!(now >= start && now <= end)) {
            discount = 0;
        }
    } else {
        discount = 0;
    }

    const finalPrice = Math.floor(basePrice * (1 - discount / 100));
    return { discount, finalPrice };
}

module.exports = ({ pool, authMiddleware }) => {
    const router = express.Router();

    // --- [POST] 결제 처리 (인증 필요) --------------------------------------
    router.post('/checkout', authMiddleware, async (req, res) => {
        const userId = req.user.userId;
        const { shippingAddress, paymentMethod, cartIds } = req.body;

        if (!shippingAddress || !paymentMethod) {
            return res.status(400).json({ error: '배송 주소와 결제 방법은 필수입니다.' });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            // ✅ 1. 장바구니 항목 조회
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
                    pv.sale_start_date,
                    pv.sale_end_date,
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

            // ✅ 2. 재고 확인
            for (const item of cartItems) {
                if (item.stock_quantity < item.quantity) {
                    await connection.rollback();
                    return res.status(400).json({
                        error: `재고 부족: ${item.product_name} (${item.color_name}, ${item.size})`
                    });
                }
            }

            // ✅ 3. 총 금액 계산 (세일 기간 반영)
            let totalAmount = 0;

            const processedItems = cartItems.map(item => {
                const { finalPrice } = applySale(
                    item.base_price,
                    item.discount_rate,
                    item.sale_start_date,
                    item.sale_end_date
                );

                const itemTotal = finalPrice * item.quantity;
                totalAmount += itemTotal;

                return {
                    ...item,
                    finalPrice
                };
            });

            // ✅ 4. 주문 생성
            const [orderResult] = await connection.query(
                `INSERT INTO orders (user_id, total_amount, shipping_address, payment_method, status, created_at)
                 VALUES (?, ?, ?, ?, 'pending', NOW())`,
                [userId, Math.round(totalAmount), shippingAddress, paymentMethod]
            );
            const orderId = orderResult.insertId;

            // ✅ 5. 주문 상세 생성 + 재고 차감
            for (const item of processedItems) {
                await connection.query(
                    `INSERT INTO order_items (order_id, option_id, quantity, price, is_review_written, created_at)
                     VALUES (?, ?, ?, ?, FALSE, NOW())`,
                    [orderId, item.option_id, item.quantity, item.finalPrice]
                );

                await connection.query(
                    'UPDATE product_options SET stock_quantity = stock_quantity - ? WHERE option_id = ?',
                    [item.quantity, item.option_id]
                );

                // ✅ sold_count 증가 (구매 수량만큼)
                await connection.query(
                    'UPDATE product_variants SET sold_count = sold_count + ? WHERE variant_id = ?',
                    [item.quantity, item.variant_id]
                );
            }

            // ✅ 6. 결제된 장바구니 항목 삭제
            const cartIdsToDelete = processedItems.map(item => item.cart_id);
            await connection.query(
                'DELETE FROM cart WHERE cart_id IN (?)',
                [cartIdsToDelete]
            );

            // ✅ 7. 주문 상태 업데이트
            await connection.query(
                'UPDATE orders SET status = ? WHERE order_id = ?',
                ['paid', orderId]
            );

            await connection.commit();

            res.status(201).json({
                message: '✅ 결제가 성공적으로 완료되었습니다.',
                orderId,
                totalAmount: Math.round(totalAmount),
                itemCount: processedItems.length,
                status: 'paid'
            });

        } catch (error) {
            await connection.rollback();
            console.error('❌ 결제 처리 오류 상세:', error);

            let errorMessage = '결제 처리 중 서버 오류가 발생했습니다.';

            if (error.code === 'ER_NO_SUCH_TABLE') {
                errorMessage = 'orders 테이블이 존재하지 않습니다.';
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