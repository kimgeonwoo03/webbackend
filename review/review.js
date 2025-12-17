// review/review.js

const express = require('express');

module.exports = ({ pool, authMiddleware }) => {
    const router = express.Router();

    // --- 1. [POST] 리뷰 작성 -----------------------------------
    router.post('/reviews', authMiddleware, async (req, res) => {
        const userId = req.user.userId;
        // ✨ [수정] author를 입력받지 않아도 됩니다. (user_id로 찾을 거니까요)
        const { productId, orderItemId, rating, title, content } = req.body;

        if (!productId || !rating) {
            return res.status(400).json({ error: '상품 ID와 평점은 필수입니다.' });
        }

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

            // (1) 주문 내역에서 작성하는 경우
            if (orderItemId) {
                const [existingReview] = await pool.query(
                    'SELECT review_id FROM reviews WHERE order_item_id = ?',
                    [orderItemId]
                );

                if (existingReview.length > 0) {
                    return res.status(409).json({ error: '이미 해당 주문 상품에 리뷰를 작성하셨습니다.' });
                }

                // ✨ [수정] author 컬럼 제거 (user_id만 저장)
                const insertSql = `
                    INSERT INTO reviews (user_id, product_id, order_item_id, rating, title, content, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, NOW())
                `;
                const [result] = await pool.query(insertSql, [userId, productId, orderItemId, rating, title || null, content || null]);

                // is_review_written 업데이트
                await pool.query(
                    'UPDATE order_items SET is_review_written = 1 WHERE order_item_id = ?',
                    [orderItemId]
                );

                res.status(201).json({
                    message: '✅ 리뷰가 성공적으로 등록되었습니다.',
                    reviewId: result.insertId
                });

            // (2) 일반 작성인 경우
            } else {
                const [existingReview] = await pool.query(
                    'SELECT review_id FROM reviews WHERE user_id = ? AND product_id = ?',
                    [userId, productId]
                );

                if (existingReview.length > 0) {
                    return res.status(409).json({ error: '이미 해당 상품에 리뷰를 작성하셨습니다.' });
                }

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

    // --- 2. [GET] 리뷰 목록 조회 (JOIN 사용) --------------------------
    router.get('/reviews', async (req, res) => {
        const { productId } = req.query;

        if (!productId) {
            return res.status(400).json({ error: '상품 ID(productId)가 필요합니다.' });
        }

        try {
            // ✨ [핵심 수정] users 테이블과 JOIN하여 이름 가져오기
            // u.name AS author 부분이 핵심입니다. 
            // (만약 users 테이블의 이름 컬럼이 'username'이면 u.username으로 바꿔주세요)
            const sql = `
                SELECT
                    r.review_id,
                    r.user_id,
                    u.name AS author,  -- users 테이블의 name을 가져와서 author로 별칭 지정
                    r.rating,
                    r.title,
                    r.content,
                    r.created_at
                FROM reviews r
                JOIN users u ON r.user_id = u.user_id  -- user_id를 기준으로 연결
                WHERE r.product_id = ?
                ORDER BY r.created_at DESC
            `;
            const [rows] = await pool.query(sql, [productId]);

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