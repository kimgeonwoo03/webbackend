// server/product/product.js
const express = require('express');

module.exports = ({ pool, authMiddleware, adminAuth }) => {
    const router = express.Router();

    // ==========================================================
    // 1. [GET] /api/admin/products (전체 상품 목록 조회 - 관리자용)
    // ==========================================================
    router.get('/admin/products', authMiddleware, adminAuth, async (req, res) => {
        try {
            const sql = `
                SELECT 
                    p.product_id AS groupId,
                    p.name AS groupName,
                    p.base_price AS basePrice,
                    -- 소재 목록 조회 (다중 선택: JSON 배열로 변환)
                    IFNULL(
                        (
                            SELECT JSON_ARRAYAGG(m.title)
                            FROM product_material_map pmm
                            JOIN materials m ON pmm.material_id = m.material_id
                            WHERE pmm.product_id = p.product_id
                        ),
                        JSON_ARRAY()
                    ) AS materials,
                    
                    -- 카테고리 목록 조회 (다중 선택: JSON 배열로 변환)
                    IFNULL(
                        (
                            SELECT JSON_ARRAYAGG(c.name)
                            FROM product_category_map pcm
                            JOIN categories c ON pcm.category_id = c.category_id
                            WHERE pcm.product_id = p.product_id
                        ),
                        JSON_ARRAY()
                    ) AS categories,
                    
                    -- 변형(컬러) 목록 조회
                    IFNULL(
                        (
                            SELECT JSON_ARRAYAGG(
                                JSON_OBJECT(
                                    'variantId', pv.variant_id,
                                    'colorName', pv.color_name,
                                    'image', pv.representative_image_url,
                                    'discountRate', pv.discount_rate,
                                    'saleStartDate', DATE_FORMAT(pv.sale_start_date, '%Y-%m-%d'),
                                    'saleEndDate', DATE_FORMAT(pv.sale_end_date, '%Y-%m-%d'),
                                    'registrationDate', pv.registration_date,
                                    'options', IFNULL(
                                        (
                                            SELECT JSON_ARRAYAGG(
                                                JSON_OBJECT(
                                                    'size', CAST(po.size AS UNSIGNED),
                                                    'stock', po.stock_quantity
                                                )
                                            )
                                            FROM product_options po
                                            WHERE po.variant_id = pv.variant_id
                                            ORDER BY CAST(po.size AS UNSIGNED) ASC
                                        ), 
                                        JSON_ARRAY()
                                    )
                                )
                            )
                            FROM product_variants pv
                            WHERE pv.product_id = p.product_id
                        ), 
                        JSON_ARRAY()
                    ) AS variants
                FROM products p
                ORDER BY p.product_id DESC;
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

            // ✨ materialIds, categoryIds 다중 배열로 받기
            const { groupName, basePrice, variants, gender, materialIds, categoryIds } = req.body;
            const firstVariant = variants[0]; 

            // (1) 상품 그룹 등록 (products 테이블)
            // ✨ material_id는 products 테이블에서 제거되었음. gender 고정
            const [productResult] = await conn.query(
                'INSERT INTO products (name, base_price, gender) VALUES (?, ?, ?)',
                [groupName, basePrice, gender || 'MEN']
            );
            const newProductId = productResult.insertId;

            // (1-1) 소재 매핑 등록 (product_material_map)
            if (materialIds && materialIds.length > 0) {
                const materialValues = materialIds.map(matId => [newProductId, matId]);
                await conn.query(
                    'INSERT INTO product_material_map (product_id, material_id) VALUES ?',
                    [materialValues]
                );
            }

            // (1-2) 카테고리 매핑 등록 (product_category_map)
            if (categoryIds && categoryIds.length > 0) {
                const categoryValues = categoryIds.map(catId => [newProductId, catId]);
                await conn.query(
                    'INSERT INTO product_category_map (product_id, category_id) VALUES ?',
                    [categoryValues]
                );
            }

            // (2) 첫 번째 컬러(Variant) 등록 (sale_start/end_date 포함)
            const [variantResult] = await conn.query(
                `INSERT INTO product_variants 
                (product_id, color_name, representative_image_url, discount_rate, sale_start_date, sale_end_date, registration_date) 
                VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
                [
                    newProductId, 
                    firstVariant.colorName, 
                    firstVariant.image, 
                    firstVariant.discountRate,
                    firstVariant.saleStartDate || null, 
                    firstVariant.saleEndDate || null
                ]
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
            const { colorName, image, discountRate, saleStartDate, saleEndDate, options } = req.body;

            const [variantResult] = await conn.query(
                `INSERT INTO product_variants 
                (product_id, color_name, representative_image_url, discount_rate, sale_start_date, sale_end_date, registration_date) 
                VALUES (?, ?, ?, ?, ?, ?, CURDATE())`,
                [groupId, colorName, image, discountRate, saleStartDate || null, saleEndDate || null]
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
    // 4. [PUT] /api/admin/products/variants/:variantId (수정)
    // ==========================================================
    router.put('/admin/products/variants/:variantId', authMiddleware, adminAuth, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { variantId } = req.params;
    const { discountRate, saleStartDate, saleEndDate, options, image } = req.body;

    // ✅ (1) variant 기본 정보 업데이트
    let updateFields = [];
    let updateValues = [];

    if (image !== undefined) {
      updateFields.push('representative_image_url = ?');
      updateValues.push(image);
    }
    if (discountRate !== undefined) {
      updateFields.push('discount_rate = ?');
      updateValues.push(discountRate);
    }
    if (saleStartDate !== undefined) {
      updateFields.push('sale_start_date = ?');
      updateValues.push(saleStartDate || null);
    }
    if (saleEndDate !== undefined) {
      updateFields.push('sale_end_date = ?');
      updateValues.push(saleEndDate || null);
    }

    if (updateFields.length > 0) {
      updateValues.push(variantId);
      await conn.query(
        `UPDATE product_variants SET ${updateFields.join(', ')} WHERE variant_id = ?`,
        updateValues
      );
    }

    // ✅ (2) 옵션 업데이트 (삭제 없음)
    if (options && options.length > 0) {
      for (const opt of options) {
        const [updateResult] = await conn.query(
          'UPDATE product_options SET stock_quantity = ? WHERE variant_id = ? AND size = ?',
          [opt.stock, variantId, opt.size]
        );

        if (updateResult.affectedRows === 0) {
          await conn.query(
            'INSERT INTO product_options (variant_id, size, stock_quantity) VALUES (?, ?, ?)',
            [variantId, opt.size, opt.stock]
          );
        }
      }
    }

    await conn.commit();
    res.json({ message: '수정 완료' });

  } catch (error) {
    await conn.rollback();
    console.error('수정 에러:', error);
    res.status(500).json({ error: '수정 실패' });
  } finally {
    conn.release();
  }
});

    // ==========================================================
    // 5. [GET] /api/admin/sales (매출 현황 조회)
    // ==========================================================
    router.get('/admin/sales', authMiddleware, adminAuth, async (req, res) => {
        try {
            const startDate = req.query.startDate || '2025-01-01';
            const endDate = req.query.endDate || '2025-12-31';

            const sql = `
                SELECT 
                    sub.variant_id,
                    sub.name,
                    sub.image,
                    sub.categories,  -- ✨ [추가] 카테고리 정보
                    CAST(SUM(sub.daily_qty) AS UNSIGNED) AS totalQty,
                    CAST(SUM(sub.daily_revenue) AS UNSIGNED) AS totalRevenue,
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
                        DATE_FORMAT(o.created_at, '%Y-%m-%d') AS sales_date,
                        SUM(oi.quantity) AS daily_qty,
                        SUM(oi.quantity * oi.price) AS daily_revenue,
                        
                        -- ✨ [추가] 상품의 카테고리 목록을 JSON 배열로 가져오기
                        (
                            SELECT JSON_ARRAYAGG(c.name)
                            FROM product_category_map pcm
                            JOIN categories c ON pcm.category_id = c.category_id
                            WHERE pcm.product_id = p.product_id
                        ) AS categories
                        
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.order_id
                    JOIN product_options po ON oi.option_id = po.option_id
                    JOIN product_variants pv ON po.variant_id = pv.variant_id
                    JOIN products p ON pv.product_id = p.product_id
                    WHERE o.created_at BETWEEN ? AND ? 
                      AND o.status IN ('PAID', 'SHIPPED', 'DELIVERED', 'pending')
                    GROUP BY pv.variant_id, p.name, pv.color_name, pv.representative_image_url, sales_date, p.product_id
                ) sub
                GROUP BY sub.variant_id, sub.name, sub.image, sub.categories -- ✨ [수정] categories 추가
                ORDER BY totalRevenue DESC;
            `;

            const start = `${startDate} 00:00:00`;
            const end = `${endDate} 23:59:59`;

            const [rows] = await pool.query(sql, [start, end]);
            res.json(rows);

        } catch (error) {
            console.error('매출 조회 에러:', error);
            res.status(500).json({ error: '매출 데이터를 불러오지 못했습니다.' });
        }
    });
    
    return router;
};