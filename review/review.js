// review/review.js

const express = require('express');

// server.js에서 전달받은 의존성 (pool, authMiddleware) 사용
module.exports = ({ pool, authMiddleware }) => {
    const router = express.Router();

    // --- 1. [POST] 리뷰 작성 (인증 필요) -----------------------------------
    // 엔드포인트: /api/reviews
    router.post('/reviews', authMiddleware, async (req, res) => {
        const userId = req.user.userId;
        const { productId, orderItemId, rating, title, content } = req.body;

        // 필수 필드 검증
        if (!productId || !rating) {
            return res.status(400).json({ error: '상품 ID와 평점은 필수입니다.' });
        }

        // 평점 범위 검증 (1~5)
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: '평점은 1~5 사이여야 합니다.' });
        }

        try {
            // 상품 존재 여부 확인
            const [productExists] = await pool.query(
                'SELECT product_id FROM products WHERE product_id = ?',
                [productId]
            );

            if (productExists.length === 0) {
                return res.status(404).json({ error: '해당 상품을 찾을 수 없습니다.' });
            }

            // orderItemId가 있는 경우 (주문 내역에서 작성)
            if (orderItemId) {
                // 해당 order_item에 대한 중복 리뷰 확인
                const [existingReview] = await pool.query(
                    'SELECT review_id FROM reviews WHERE order_item_id = ?',
                    [orderItemId]
                );

                if (existingReview.length > 0) {
                    return res.status(409).json({ error: '이미 해당 주문 상품에 리뷰를 작성하셨습니다.' });
                }

                // order_item_id 포함하여 리뷰 삽입
                const insertSql = `
                    INSERT INTO reviews (user_id, product_id, order_item_id, rating, title, content, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `;
                const [result] = await pool.query(insertSql, [userId, productId, orderItemId, rating, title || null, content || null]);

                res.status(201).json({
                    message: '✅ 리뷰가 성공적으로 등록되었습니다.',
                    reviewId: result.insertId
                });
            } else {
                // orderItemId가 없는 경우 (일반 리뷰 - 기존 로직 유지)
                const [existingReview] = await pool.query(
                    'SELECT review_id FROM reviews WHERE user_id = ? AND product_id = ?',
                    [userId, productId]
                );

                if (existingReview.length > 0) {
                    return res.status(409).json({ error: '이미 해당 상품에 리뷰를 작성하셨습니다.' });
                }

                // 리뷰 삽입
                const insertSql = `
                    INSERT INTO reviews (user_id, product_id, rating, title, content, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                `;
                const [result] = await pool.query(insertSql, [userId, productId, rating, title || null, content || null]);

                res.status(201).json({
                    message: '✅ 리뷰가 성공적으로 등록되었습니다.',
                    reviewId: result.insertId
                });
            }

        } catch (error) {
            console.error('리뷰 작성 오류:', error);
            res.status(500).json({ error: '리뷰 작성 중 서버 오류가 발생했습니다.' });
        }
    });

    // --- 2. [GET] 리뷰 목록 조회 ------------------------------------------
    // 엔드포인트: /api/reviews?productId={productId}
    router.get('/reviews', async (req, res) => {
        const { productId } = req.query;

        if (!productId) {
            return res.status(400).json({ error: '상품 ID(productId)가 필요합니다.' });
        }

        try {
            const sql = `
                SELECT
                    r.review_id,
                    r.user_id,
                    r.rating,
                    r.title,
                    r.content,
                    r.created_at
                FROM reviews r
                WHERE r.product_id = ?
                ORDER BY r.created_at DESC
            `;
            const [rows] = await pool.query(sql, [productId]);

            // 평균 별점 계산
            const avgRating = rows.length > 0
                ? (rows.reduce((sum, r) => sum + r.rating, 0) / rows.length).toFixed(1)
                : 0;

            res.json({
                message: '✅ 리뷰 목록 조회 성공',
                avgRating: parseFloat(avgRating),
                reviewCount: rows.length,
                reviews: rows
            });

        } catch (error) {
            console.error('리뷰 목록 조회 오류:', error);
            res.status(500).json({ error: '리뷰 목록을 가져오는 데 실패했습니다.' });
        }
    });

    return router;
};
