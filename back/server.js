// server.js (최종 통합본)

// **1. dotenv를 가장 먼저 로드합니다.**
require('dotenv').config(); // .env 파일의 환경 변수 로드

// 2. 필요한 모듈 가져오기
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors'); 
// ✨ 인증/인가에 필요한 모듈 추가
const jwt = require('jsonwebtoken'); 
const bcrypt = require('bcrypt');     // userRoutes에 전달하기 위해 require합니다.

// 3. 환경 변수와 모듈 정의
const app = express();
const PORT = 3000; // 백엔드 포트
const FRONTEND_PORT = 5173; // React 프론트엔드 포트
const JWT_SECRET = process.env.JWT_SECRET; // JWT_SECRET 정의 (정상)


// 4. MySQL 연결 풀(Connection Pool) 설정
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise(); // Promise API를 사용 가능하도록 설정


// 5. 연결 테스트 함수 (기존 코드 유지)
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
// JWT_SECRET 정의 후에 와야 합니다.
const authMiddleware = require('../middleware/auth')({ JWT_SECRET });
const adminAuth = require('../middleware/adminAuth');


// 7. Express 미들웨어 설정
// 7-1. JSON 요청 파싱 (라우터보다 먼저 와야 합니다.)
app.use(express.json()); 

// 7-2. CORS 미들웨어 설정 (프론트엔드 연결 필수!)
app.use(cors({
    origin: `http://localhost:${FRONTEND_PORT}`, 
    credentials: true,
}));


// **8. 라우터 파일에 의존성 주입하여 불러오기 및 연결**
// userRoutes는 모든 미들웨어 설정 후에 연결하는 것이 일반적입니다.

// (1) 회원 관련 라우터
const userRoutes = require('../user/user')({ pool, JWT_SECRET, bcrypt });
app.use('/user', userRoutes);

// (2) 상품 관련 라우터
const productRoutes = require('../product/product')({ pool, authMiddleware, adminAuth })
app.use('/api', productRoutes);

// (3) ★[추가됨] 주문 관련 라우터 연결★
// 경로가 /api/user 로 시작하고, 라우터 내부에서 /orders 를 처리하므로
// 최종 주소는 /api/user/orders 가 됩니다.
try {
    const orderRouter = require('../order/order')({ pool, authMiddleware });
    app.use('/api/user', orderRouter);
    console.log('✅ 주문 라우터(Order Router)가 연결되었습니다.');
} catch (error) {
    console.error('⚠️ 주문 라우터 연결 실패 (파일 경로를 확인하세요):', error.message);
}


// 9. 기본 라우트 설정 (상태 확인용)
app.get('/', (req, res) => {
    res.send('Express 서버가 실행 중입니다. (기본 모드)');
});


// **10. 인증/인가 테스트 라우트 (미들웨어 테스트용)**
// 토큰 검증 미들웨어 테스트
app.get('/mypage', authMiddleware, (req, res) => {
    res.json({
        message: '보호된 페이지에 접근 성공',
        role: req.user.role, 
        detail: 'JWT 토큰에서 추출된 정보입니다.'
    });
});

// 관리자 권한 미들웨어 테스트
app.get('/admin/dashboard', authMiddleware, adminAuth, (req, res) => {
    res.json({
        message: '✅ 관리자 대시보드 접근 성공!',
        role: req.user.role,
        detail: '관리자 권한으로만 이 정보를 볼 수 있습니다.'
    });
});


// 11. 데이터베이스 쿼리 예시 라우트 (상품 목록)
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT product_id, name, base_price FROM products LIMIT 5');
        res.json({
            message: '✅ 상품 목록 조회 성공',
            products: rows
        });
    } catch (error) {
        console.error('DB 쿼리 오류:', error);
        res.status(500).json({ error: '데이터베이스에서 데이터를 가져오는 데 실패했습니다.' });
    }
});


// 12. 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`🤝 React 웹 (${FRONTEND_PORT})과 통신 준비 완료.`);
});