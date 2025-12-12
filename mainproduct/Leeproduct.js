// product/product.js

const express = require('express');

module.exports = ({ pool, authMiddleware, adminAuth }) => { 
    const router = express.Router();

    // ============================================
    // 1. 인기 상품 목록 (기존 유지)
    // ============================================
    router.get('/products/popular-list', async (req, res) => {
        try {
            const sql = `
                SELECT 
                    pv.variant_id AS id,
                    p.name AS name,
                    pv.color_name AS detail,
                    p.base_price AS originalPrice,
                    CAST(p.base_price * (1 - COALESCE(pv.discount_rate, 0) / 100) AS UNSIGNED) AS price,
                    pv.representative_image_url AS image,
                    (
                        SELECT JSON_ARRAYAGG(po.size)
                        FROM product_options po
                        WHERE po.variant_id = pv.variant_id AND po.stock_quantity > 0
                    ) AS sizes
                FROM product_variants pv
                JOIN products p ON pv.product_id = p.product_id
                ORDER BY pv.registration_date DESC
                LIMIT 10;
            `;
            
            const [rows] = await pool.query(sql);

            const formattedRows = rows.map((row, index) => {
                let sizesArray = [];
                try {
                    sizesArray = typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes;
                } catch (e) {
                    sizesArray = [];
                }

                return {
                    ...row,
                    rank: index + 1,
                    sizes: sizesArray || []
                };
            });

            res.json({
                message: '✅ 인기 상품 목록 조회 성공',
                products: formattedRows
            });

        } catch (error) {
            console.error('인기 상품 목록 DB 쿼리 오류:', error);
            res.status(500).json({ error: '데이터베이스에서 인기 상품을 가져오는 데 실패했습니다.' });
        }
    });

    // ============================================
    // 2. 남성 상품 전체 목록 (오류 해결 최종 버전)
    // ============================================
    router.get('/products/men-list', async (req, res) => {
        try {
            // 2-1. 기본 상품 정보 가져오기 (m.title 사용, 주석 제거)
            const productsQuery = `
            SELECT 
            p.product_id,
            p.name,
            p.base_price AS originalPrice,
            p.gender,
            p.badge,
            m.title AS material, 
            m.material_id
        FROM products p
        LEFT JOIN materials m ON p.material_id = m.material_id
        WHERE p.gender = 'MEN' // ⚠️ DB의 products.gender가 'MEN'으로 대문자라면 'men' 대신 'MEN' 사용
        ORDER BY p.product_id;
    `;
            
            const [products] = await pool.query(productsQuery);

            // 2-2. 각 상품의 색상 옵션들 가져오기
            const variantsQuery = `
                SELECT 
                    pv.variant_id,
                    pv.product_id,
                    pv.color_name AS detail,
                    pv.color_hex,
                    pv.representative_image_url AS image,
                    pv.discount_rate AS discount,
                    pv.registration_date,
                    pv.sale_start_date,
                    pv.sale_end_date,
                    pv.sold_count
                FROM product_variants pv
                WHERE pv.product_id IN (
                    SELECT product_id FROM products WHERE gender = 'MEN' // ⚠️ 여기서도 'MEN' 사용
                )
                ORDER BY pv.product_id, pv.variant_id;
            `;
            
            const [variants] = await pool.query(variantsQuery);

            // 2-3. 각 변형(색상)의 재고 있는 사이즈 가져오기
            const sizesQuery = `
                SELECT 
                    po.variant_id,
                    po.size
                FROM product_options po
                WHERE po.stock_quantity > 0
                AND po.variant_id IN (
                    SELECT variant_id FROM product_variants pv
                    JOIN products p ON pv.product_id = p.product_id
                    WHERE p.gender = 'MEN' // ⚠️ 여기서도 'MEN' 사용
                )
                ORDER BY po.variant_id, po.size;
            `;
            
            const [sizes] = await pool.query(sizesQuery);

            // 2-4. 데이터 조합하기
            const formattedProducts = products.map(product => {
                // 해당 상품의 모든 색상 변형 찾기
                const productVariants = variants.filter(v => v.product_id === product.product_id);
                
                if (productVariants.length === 0) {
                    return null; 
                }

                // 대표 변형 (첫 번째 색상)
                  const mainVariant = productVariants[0];
                
                // 해당 변형의 사이즈들
                const variantSizes = sizes
                    .filter(s => s.variant_id === mainVariant.variant_id)
                    .map(s => s.size);

                // 모든 색상의 이미지 배열 (MenProductCard의 images prop용)
                const images = productVariants.map(v => v.image);

                // 할인가 계산
                const discount = mainVariant.discount || 0;
                const price = Math.floor(product.originalPrice * (1 - discount / 100));

                // 카테고리 자동 분류
                const categories = [];
                
                // 신제품 판단 (등록일 기준 1개월 이내)
                const regDate = new Date(mainVariant.registration_date);
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                if (regDate >= oneMonthAgo) {
                    categories.push('new');
                }

                // 세일 판단
                if (mainVariant.sale_start_date && mainVariant.sale_end_date && discount > 0) {
                    const now = new Date();
                    const saleStart = new Date(mainVariant.sale_start_date);
                    const saleEnd = new Date(mainVariant.sale_end_date);
                    if (now >= saleStart && now <= saleEnd) {
                        categories.push('sale');
                    }
                }

                // 라이프스타일, 슬립온 등은 DB에 별도 테이블이 있거나
                // badge나 다른 필드로 판단해야 함 (임시로 badge 기준)
                if (product.badge && product.badge.includes('LIFESTYLE')) {
                    categories.push('lifestyle');
                }
                if (product.badge && product.badge.includes('SLIP')) {
                    categories.push('slipon');
                }

                return {
                    id: mainVariant.variant_id, 
                    productId: product.product_id, 
                    name: product.name,
                    detail: mainVariant.detail,
                    price: price,
                    originalPrice: product.originalPrice,
                    discount: discount > 0 ? discount : null,
                    image: mainVariant.image, 
                    images: images, 
                    sizes: variantSizes, 
                    material: product.material, // ⚠️ material_id가 아닌 material(제목) 사용
                    gender: product.gender,
                    badge: product.badge,
                    categories: categories,
                    registrationDate: mainVariant.registration_date,
                    saleStart: mainVariant.sale_start_date,
                    saleEnd: mainVariant.sale_end_date,
                    soldCount: mainVariant.sold_count || 0,
                    isRecommended: mainVariant.sold_count > 1000 
                };
            }).filter(p => p !== null); 

            res.json({
                message: '✅ 남성 상품 목록 조회 성공',
                products: formattedProducts,
                count: formattedProducts.length
            });

        } catch (error) {
            console.error('❌ 남성 상품 목록 DB 쿼리 오류:', error);
            res.status(500).json({ error: '데이터베이스에서 남성 상품을 가져오는 데 실패했습니다.' });
        }
    });

    return router;
  }