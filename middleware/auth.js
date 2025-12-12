// middleware/auth.js

const jwt = require('jsonwebtoken');

module.exports = ({ JWT_SECRET }) => (req, res, next) => {
    // 1. Authorization 헤더에서 토큰을 추출
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '인증 헤더가 누락되었거나 형식이 잘못되었습니다.' });
    }
    
    const token = authHeader.split(' ')[1];

    // 2. 토큰이 없는 경우
    if (!token) {
        return res.status(401).json({ error: '액세스 토큰이 필요합니다.' });
    }

    try {
        // 3. 토큰 검증 및 디코드
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // 4. 디코드된 사용자 정보를 req 객체에 저장
        req.user = decoded; 
        
        // 5. 다음 미들웨어 또는 라우트 핸들러로 이동
        next();

    } catch (error) {
        // 토큰이 만료되었거나 유효하지 않은 경우
        return res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
    }
};