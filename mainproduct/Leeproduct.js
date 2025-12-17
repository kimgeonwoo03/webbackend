// server/mainproduct/Leeproduct.js

const express = require('express');

module.exports = ({ pool, authMiddleware }) => { 
    const router = express.Router();

    // ============================================
    // 1. 인기 상품 목록
    // ============================================
    router.get('/products/popular-list', async (req, res) => {
        try {
            const sql = `
                SELECT 
    p.product_id AS productId,
    pv.variant_id AS variantId,
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
LIMIT 10
            `;
            
            const [rows] = await pool.query(sql);

            const formattedRows = rows.map((row, index) => {
                let sizesArray = [];
                try {
                    const rawSizes = typeof row.sizes === 'string' ? JSON.parse(row.sizes) : row.sizes;
                    sizesArray = Array.isArray(rawSizes) ? rawSizes.map(Number) : [];
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
    // 2. 남성 상품 전체 목록 (✨ 수정됨)
    // ============================================
   router.get('/products/men-list', async (req, res) => {
    try {
        console.log('🔍 남성 상품 목록 조회 시작...');

        // ✅ 2-1. 기본 상품 정보
        const productsQuery = `
            SELECT 
                p.product_id,
                p.name,
                p.base_price AS originalPrice,
                p.gender,
                p.badge,
                p.is_recommended,
                NULLIF(
                    (
                        SELECT GROUP_CONCAT(m.code SEPARATOR ',')
                        FROM product_material_map pmm
                        JOIN materials m ON pmm.material_id = m.material_id
                        WHERE pmm.product_id = p.product_id
                    ),
                    ''
                ) AS material,
                (
                    SELECT GROUP_CONCAT(c.name SEPARATOR ',')
                    FROM product_category_map pcm
                    JOIN categories c ON pcm.category_id = c.category_id
                    WHERE pcm.product_id = p.product_id
                ) AS categories
            FROM products p
            WHERE p.gender = 'MEN'
            ORDER BY p.product_id DESC
        `;

        const [products] = await pool.query(productsQuery);
        console.log(`📦 상품 ${products.length}개 조회됨`);

        // ✅ 2-2. 색상 변형 정보
        const variantsQuery = `
            SELECT 
                pv.variant_id,
                pv.product_id,
                pv.color_name AS detail,
                pv.representative_image_url AS image,
                pv.discount_rate AS discount,
                pv.registration_date,
                pv.sale_start_date,
                pv.sale_end_date,
                pv.sold_count
            FROM product_variants pv
            WHERE pv.product_id IN (
                SELECT product_id FROM products WHERE gender = 'MEN'
            )
            ORDER BY pv.product_id, pv.variant_id
        `;

        const [variants] = await pool.query(variantsQuery);
        console.log(`🎨 색상 변형 ${variants.length}개 조회됨`);

        // ✅ 2-3. 사이즈 정보
        const sizesQuery = `
            SELECT 
                po.variant_id,
                po.size,
                po.stock_quantity
            FROM product_options po
            WHERE po.stock_quantity > 0
            AND po.variant_id IN (
                SELECT variant_id FROM product_variants pv
                JOIN products p ON pv.product_id = p.product_id
                WHERE p.gender = 'MEN'
            )
            ORDER BY po.variant_id, po.size
        `;

        const [sizes] = await pool.query(sizesQuery);
        console.log(`📏 사이즈 옵션 ${sizes.length}개 조회됨`);

        // ✅ 2-4. 데이터 조합
        const formattedProducts = products
            .map(product => {
                const productVariants = variants.filter(v => v.product_id === product.product_id);

                if (productVariants.length === 0) {
                    console.warn(`⚠️ 상품 ${product.product_id}에 색상 변형이 없음`);
                    return null;
                }

                // ✅ 대표 색상
                const mainVariant = productVariants[0];

                // ✅ 사이즈 목록
                const variantSizes = sizes
                    .filter(s => s.variant_id === mainVariant.variant_id)
                    .map(s => Number(s.size));

                const sizeStockInfo = sizes
                    .filter(s => s.variant_id === mainVariant.variant_id)
                    .map(s => ({ size: Number(s.size), stock: s.stock_quantity }));

                // ✅ 이미지 목록
                const images = productVariants.map(v => v.image);

                // ✅ 가격 계산
                // ✅ 할인율 적용 여부 계산
let discount = mainVariant.discount || 0;

if (mainVariant.sale_start_date && mainVariant.sale_end_date) {
    const now = new Date();
    const start = new Date(mainVariant.sale_start_date);
    const end = new Date(mainVariant.sale_end_date);

    // ✅ 세일 기간이 아니면 할인율 0으로 처리
    if (!(now >= start && now <= end)) {
        discount = 0;
    }
}

// ✅ 최종 가격 계산
const price = Math.floor(product.originalPrice * (1 - discount / 100));

                // ✅ 카테고리 배열
                const categories = product.categories
                    ? product.categories.split(',').map(c => c.trim())
                    : [];

                // ✅ 배지 기반 카테고리 추가
                if (product.badge?.includes('LIFESTYLE') && !categories.includes('lifestyle')) {
                    categories.push('lifestyle');
                }
                if (product.badge?.includes('SLIP') && !categories.includes('slipon')) {
                    categories.push('slipon');
                }

                // ✅ 신제품 여부
                const regDate = new Date(mainVariant.registration_date);
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

                if (regDate >= oneMonthAgo && !categories.includes('new')) {
                    categories.push('new');
                }

                // ✅ 세일 여부
                if (mainVariant.sale_start_date && mainVariant.sale_end_date && discount > 0) {
                    const now = new Date();
                    const saleStart = new Date(mainVariant.sale_start_date);
                    const saleEnd = new Date(mainVariant.sale_end_date);

                    if (now >= saleStart && now <= saleEnd && !categories.includes('sale')) {
                        categories.push('sale');
                    }
                }

                // ✅ ✅ 전체 색상 판매량 합산
                const totalSoldCount = productVariants.reduce(
                    (sum, v) => sum + (v.sold_count || 0),
                    0
                );

                // ✅ 최종 결과 객체
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
                    sizeDetails: sizeStockInfo,
                    material: product.material || null,
                    gender: product.gender,
                    badge: product.badge,
                    categories: categories,
                    registrationDate: mainVariant.registration_date,
                    saleStart: mainVariant.sale_start_date,
                    saleEnd: mainVariant.sale_end_date,
                    isRecommended: product.is_recommended,

                    // ✅ 전체 색상 판매량 합산
                    soldCount: totalSoldCount
                };
            })
            .filter(p => p !== null);

        console.log(`✅ 총 ${formattedProducts.length}개 상품 포맷팅 완료`);

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


    // ============================================
    // 3. 상품 상세 조회
    // ============================================
    router.get('/products/:productId', async (req, res) => {
  const { productId } = req.params;

  try {
    const productSql = `
      SELECT
          p.product_id,
          p.name,
          p.description,
          p.base_price,
          p.gender,
          (
              SELECT GROUP_CONCAT(m.code SEPARATOR ',')
              FROM product_material_map pmm
              JOIN materials m ON pmm.material_id = m.material_id
              WHERE pmm.product_id = p.product_id
          ) AS material,
          p.badge,
          (
              SELECT JSON_ARRAYAGG(
                  JSON_OBJECT(
                      'variantId', pv.variant_id,
                      'colorName', pv.color_name,
                      'image', pv.representative_image_url,
                      'discountRate', pv.discount_rate,
                      'registrationDate', pv.registration_date,
                      'saleStartDate', DATE_FORMAT(pv.sale_start_date, '%Y-%m-%d'),
                      'saleEndDate', DATE_FORMAT(pv.sale_end_date, '%Y-%m-%d'),
                      'options', (
                          SELECT JSON_ARRAYAGG(
                              JSON_OBJECT(
                                  'optionId', po.option_id,
                                  'size', CAST(po.size AS UNSIGNED),
                                  'stock', po.stock_quantity
                              )
                          )
                          FROM product_options po
                          WHERE po.variant_id = pv.variant_id
                          ORDER BY CAST(po.size AS UNSIGNED) ASC
                      )
                  )
              )
              FROM product_variants pv
              WHERE pv.product_id = p.product_id
          ) AS variants
      FROM products p
      WHERE p.product_id = ?
    `;

    const [productRows] = await pool.query(productSql, [productId]);

    if (productRows.length === 0) {
      return res.status(404).json({ error: '해당 상품을 찾을 수 없습니다.' });
    }

    // ✅ variants JSON 파싱
    let variants = productRows[0].variants || [];


    // ✅ 세일 기간 체크 + 할인율 조정 + finalPrice 계산
    variants = variants.map(v => {
      let discount = v.discountRate || 0;

      if (!v.saleStartDate || !v.saleEndDate) {
        discount = 0;
      } else {
        const now = new Date();
        const start = new Date(v.saleStartDate + 'T00:00:00');
        const end = new Date(v.saleEndDate + 'T23:59:59');

        if (now < start || now > end) {
          discount = 0;
        }
      }

      const finalPrice = Math.floor(productRows[0].base_price * (1 - discount / 100));

      return {
        ...v,
        discountRate: discount,
        finalPrice
      };
    });

    // ✅ 리뷰 조회
    const reviewSql = `
      SELECT
          r.review_id,
          r.user_id,
          u.name AS author,
          r.rating,
          r.title,
          r.content,
          r.created_at
      FROM reviews r
      JOIN users u ON r.user_id = u.user_id
      WHERE r.product_id = ?
      ORDER BY r.created_at DESC
    `;
    const [reviewRows] = await pool.query(reviewSql, [productId]);

    const avgRating = reviewRows.length > 0
      ? (reviewRows.reduce((sum, r) => sum + r.rating, 0) / reviewRows.length).toFixed(1)
      : 0;

    console.log("✅ variants:", variants);

    // ✅ 최종 응답
    res.json({
      message: '✅ 상품 상세 조회 성공',
      product: {
        ...productRows[0],
        variants,
        avgRating: parseFloat(avgRating),
        reviewCount: reviewRows.length,
        reviews: reviewRows
      }
    });

  } catch (error) {
    console.error('상품 상세 조회 오류:', error);
    res.status(500).json({ error: '상품 상세 정보를 가져오는 데 실패했습니다.' });
  }
});


    return router;
};