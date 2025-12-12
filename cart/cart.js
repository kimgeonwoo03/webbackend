// cart/cart.js

const express = require('express');

// server.js에서 전달받은 의존성 (pool, authMiddleware) 사용
module.exports = ({ pool, authMiddleware }) => {
    const router = express.Router();

    // --- 1. [GET] 장바구니 조회 (인증 필요) ---------------------------------
    // 엔드포인트: /api/cart
    router.get('/cart', authMiddleware, async (req, res) => {
        const userId = req.user.userId;

        try {
            const sql = `
                SELECT
                    c.cart_id,
                    c.quantity,
                    c.created_at,
                    p.product_id,
                    p.name AS product_name,
                    p.base_price,
                    pv.variant_id,
                    pv.color_name,
                    pv.representative_image_url AS image,
                    pv.discount_rate,
                    po.option_id,
                    po.size,
                    po.stock_quantity
                FROM cart c
                JOIN product_options po ON c.option_id = po.option_id
                JOIN product_variants pv ON po.variant_id = pv.variant_id
                JOIN products p ON pv.product_id = p.product_id
                WHERE c.user_id = ?
                ORDER BY c.created_at DESC
            `;
            const [rows] = await pool.query(sql, [userId]);

            // 총 금액 계산
            const totalPrice = rows.reduce((sum, item) => {
                const discountedPrice = item.base_price * (1 - (item.discount_rate || 0) / 100);
                return sum + (discountedPrice * item.quantity);
            }, 0);

            res.json({
                message: '✅ 장바구니 조회 성공',
                cartItems: rows,
                totalItems: rows.length,
                totalPrice: Math.round(totalPrice)
            });

        } catch (error) {
            console.error('장바구니 조회 오류:', error);
            res.status(500).json({ error: '장바구니를 가져오는 데 실패했습니다.' });
        }
    });

    // --- 2. [POST] 장바구니 상품 추가 (인증 필요) ----------------------------
    // 엔드포인트: /api/cart/add
    router.post('/cart/add', authMiddleware, async (req, res) => {
        const userId = req.user.userId;
        const { optionId, quantity } = req.body;

        if (!optionId || !quantity) {
            return res.status(400).json({ error: '옵션 ID와 수량은 필수입니다.' });
        }

        if (quantity < 1) {
            return res.status(400).json({ error: '수량은 1 이상이어야 합니다.' });
        }

        try {
            // 옵션 존재 여부 및 재고 확인
            const [optionRows] = await pool.query(
                'SELECT option_id, stock_quantity FROM product_options WHERE option_id = ?',
                [optionId]
            );

            if (optionRows.length === 0) {
                return res.status(404).json({ error: '해당 상품 옵션을 찾을 수 없습니다.' });
            }

            if (optionRows[0].stock_quantity < quantity) {
                return res.status(400).json({ error: '재고가 부족합니다.' });
            }

            // 이미 장바구니에 있는지 확인
            const [existingItem] = await pool.query(
                'SELECT cart_id, quantity FROM cart WHERE user_id = ? AND option_id = ?',
                [userId, optionId]
            );

            if (existingItem.length > 0) {
                // 기존 항목이 있으면 수량 업데이트
                const newQuantity = existingItem[0].quantity + quantity;

                if (optionRows[0].stock_quantity < newQuantity) {
                    return res.status(400).json({ error: '재고가 부족합니다.' });
                }

                await pool.query(
                    'UPDATE cart SET quantity = ? WHERE cart_id = ?',
                    [newQuantity, existingItem[0].cart_id]
                );

                res.json({
                    message: '✅ 장바구니 수량이 업데이트되었습니다.',
                    cartId: existingItem[0].cart_id,
                    quantity: newQuantity
                });
            } else {
                // 새 항목 추가
                const [result] = await pool.query(
                    'INSERT INTO cart (user_id, option_id, quantity, created_at) VALUES (?, ?, ?, NOW())',
                    [userId, optionId, quantity]
                );

                res.status(201).json({
                    message: '✅ 장바구니에 상품이 추가되었습니다.',
                    cartId: result.insertId
                });
            }

        } catch (error) {
            console.error('장바구니 추가 오류:', error);
            res.status(500).json({ error: '장바구니에 상품을 추가하는 데 실패했습니다.' });
        }
    });

    // --- 3. [PUT] 장바구니 수량 변경 (인증 필요) -----------------------------
    // 엔드포인트: /api/cart/update
    router.put('/cart/update', authMiddleware, async (req, res) => {
        const userId = req.user.userId;
        const { cartId, quantity } = req.body;

        if (!cartId || quantity === undefined) {
            return res.status(400).json({ error: '장바구니 ID와 수량은 필수입니다.' });
        }

        if (quantity < 1) {
            return res.status(400).json({ error: '수량은 1 이상이어야 합니다.' });
        }

        try {
            // 장바구니 항목 확인 (본인 것인지 검증)
            const [cartItem] = await pool.query(
                `SELECT c.cart_id, c.option_id, po.stock_quantity
                 FROM cart c
                 JOIN product_options po ON c.option_id = po.option_id
                 WHERE c.cart_id = ? AND c.user_id = ?`,
                [cartId, userId]
            );

            if (cartItem.length === 0) {
                return res.status(404).json({ error: '해당 장바구니 항목을 찾을 수 없습니다.' });
            }

            // 재고 확인
            if (cartItem[0].stock_quantity < quantity) {
                return res.status(400).json({ error: '재고가 부족합니다.' });
            }

            // 수량 업데이트
            await pool.query(
                'UPDATE cart SET quantity = ? WHERE cart_id = ?',
                [quantity, cartId]
            );

            res.json({
                message: '✅ 장바구니 수량이 변경되었습니다.',
                cartId: cartId,
                quantity: quantity
            });

        } catch (error) {
            console.error('장바구니 수량 변경 오류:', error);
            res.status(500).json({ error: '장바구니 수량 변경에 실패했습니다.' });
        }
    });

    // --- 4. [DELETE] 장바구니 상품 삭제 (인증 필요) --------------------------
    // 엔드포인트: /api/cart/remove/:cartId
    router.delete('/cart/remove/:cartId', authMiddleware, async (req, res) => {
        const userId = req.user.userId;
        const { cartId } = req.params;

        try {
            // 장바구니 항목 확인 (본인 것인지 검증)
            const [cartItem] = await pool.query(
                'SELECT cart_id FROM cart WHERE cart_id = ? AND user_id = ?',
                [cartId, userId]
            );

            if (cartItem.length === 0) {
                return res.status(404).json({ error: '해당 장바구니 항목을 찾을 수 없습니다.' });
            }

            // 삭제
            await pool.query('DELETE FROM cart WHERE cart_id = ?', [cartId]);

            res.json({
                message: '✅ 장바구니에서 상품이 삭제되었습니다.',
                deletedCartId: parseInt(cartId)
            });

        } catch (error) {
            console.error('장바구니 삭제 오류:', error);
            res.status(500).json({ error: '장바구니 상품 삭제에 실패했습니다.' });
        }
    });

    return router;
};
