// server.js (사용자/인증 기능 제거 버전)

// **1. dotenv를 가장 먼저 로드합니다.**
require('dotenv').config(); // .env 파일의 환경 변수 로드

// 2. 필요한 모듈 가져오기
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors'); // ✨ CORS를 위해 추가

// 3. 환경 변수와 모듈 정의
const app = express();
const PORT = 3000; // 백엔드 포트
const FRONTEND_PORT = 5173; // React 프론트엔드 포트

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


// 6. Express 미들웨어 설정
// 6-1. JSON 요청 파싱
app.use(express.json());

// 6-2. CORS 미들웨어 설정 (프론트엔드 연결 필수!)
app.use(cors({
    origin: `http://localhost:${FRONTEND_PORT}`, // React 웹의 포트만 허용
    credentials: true,
}));


// 7. 기본 라우트 설정 (상태 확인용)
app.get('/', (req, res) => {
    res.send('Express 서버가 실행 중입니다. (기본 모드)');
});

// 8. 데이터베이스 쿼리 예시 라우트 (프론트엔드에서 데이터 요청 테스트용)
// 예: 모든 상품 목록을 가져오는 라우트
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


// 9. 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
    console.log(`🤝 React 웹 (${FRONTEND_PORT})과 통신 준비 완료.`);
});