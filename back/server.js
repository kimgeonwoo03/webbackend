// server.js (최종 수정본 - 404 에러 해결 및 전체 기능 통합)

// **1. dotenv를 가장 먼저 로드합니다.**
require('dotenv').config(); 

// 2. 필요한 모듈 가져오기
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors'); 
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt');

// 3. 환경 변수와 모듈 정의
const app = express();
const PORT = 3000; 
const FRONTEND_PORT = 5173; 
const JWT_SECRET = process.env.JWT_SECRET; 


// 4. MySQL 연결 풀 설정
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();


// 5. 연결 테스트 함수
async function testDbConnection() {
    try {
        const connection = await pool.getConnection();
        console.log("✅ MySQL 데이터베이스에 성공적으로 연결되었습니다.");
        connection.release(); 
    } catch (error) {
        console.error("❌ MySQL 연결 오류:", error.message);
    }
}
testDbConnection();


// **6. 인증/인가 미들웨어 정의**
const authMiddleware = require('../middleware/auth')({ JWT_SECRET });
const adminAuth = require('../middleware/adminAuth');


// 7. Express 미들웨어 설정
app.use(express.json()); 
app.use(cors({
    origin: `http://localhost:${FRONTEND_PORT}`, 
    credentials: true,
}));


// **8. 라우터 연결**

// (1) 회원 관련 라우터
const userRoutes = require('../user/user')({ pool, JWT_SECRET, bcrypt });
app.use('/user', userRoutes);


// ✅ 로그인한 사용자 정보 조회 (프론트의 authApi.getMe()와 매칭)
app.get('/api/user/me', authMiddleware, (req, res) => {
    res.json({
        user: {
            user_id: req.user.userId,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
    });
});

// (2) 🛒 [일반 고객용] 상품 라우터 (Leeproduct.js)
const customerProductRoutes = require('../mainproduct/Leeproduct')({ pool, authMiddleware }); 
app.use('/api', customerProductRoutes);


// (3) 🔧 [관리자용] 상품 라우터 (product.js) - ✨ [수정됨] 경로 중복 방지
// product.js 내부에서 이미 '/admin/...' 경로를 정의하고 있으므로, 여기서는 '/api'에 연결해야 합니다.
const adminProductRoutes = require('../product/product')({ pool, authMiddleware, adminAuth });
app.use('/api', adminProductRoutes);


// (4) 📦 주문 관련 라우터
try {
    const orderRouter = require('../order/order')({ pool, authMiddleware });
    app.use('/api/user', orderRouter);
    console.log('✅ 주문 라우터 연결 완료');
} catch (error) {
    console.error('⚠️ 주문 라우터 연결 실패:', error.message);
}

// (5) ⭐ 리뷰 관련 라우터
try {
    const reviewRouter = require('../review/review')({ pool, authMiddleware });
    app.use('/api', reviewRouter); 
    console.log('✅ 리뷰 라우터 연결 완료');
} catch (error) {
    console.error('⚠️ 리뷰 라우터 연결 실패 (파일 경로를 확인하세요):', error.message);
}

// (6) 🛒 장바구니 관련 라우터
try {
    const cartRouter = require('../cart/cart')({ pool, authMiddleware });
    app.use('/api', cartRouter); 
    console.log('✅ 장바구니 라우터 연결 완료');
} catch (error) {
    console.error('⚠️ 장바구니 라우터 연결 실패 (파일 경로를 확인하세요):', error.message);
}

// (7) 💳 결제 관련 라우터
try {
    const checkoutRouter = require('../checkout/checkout')({ pool, authMiddleware });
    app.use('/api', checkoutRouter); 
    console.log('✅ 결제 라우터 연결 완료');
} catch (error) {
    console.error('⚠️ 결제 라우터 연결 실패 (파일 경로를 확인하세요):', error.message);
}


// 9. 기본 라우트
app.get('/', (req, res) => {
    res.send('Express 서버가 실행 중입니다.');
});

// 10. 테스트 라우트 (로그인/관리자 확인용)
app.get('/mypage', authMiddleware, (req, res) => {
    res.json({ message: '인증 성공', role: req.user.role });
});
app.get('/admin/dashboard', authMiddleware, adminAuth, (req, res) => {
    res.json({ message: '관리자 권한 확인됨', role: req.user.role });
});


// 12. 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`- 관리자 API: http://localhost:${PORT}/api/admin/products`);
});