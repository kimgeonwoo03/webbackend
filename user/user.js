// user/user.js (user 폴더 안에 저장)

const express = require('express');
const jwt = require('jsonwebtoken');

// server.js에서 전달받은 의존성 (pool, JWT_SECRET, bcrypt) 사용
module.exports = ({ pool, JWT_SECRET, bcrypt }) => { 
    const router = express.Router();

    // ----------------------------------------------------
    // [POST] /dev/login 라우트 (개발/테스트용 즉시 로그인)
    router.post('/dev/login', async (req, res) => {
        // 1. 요청 본문(Body)에서 role 정보를 받습니다. (기본값: 'user')
        const requestedRole = req.body.role || 'user'; 

        // 역할 유효성 검사
        if (requestedRole !== 'user' && requestedRole !== 'admin') {
            return res.status(400).json({ error: '유효하지 않은 역할(role)입니다. ("user" 또는 "admin"을 사용하세요)' });
        }
        
        // 💡 DB 조회가 필요 없으므로 고정된 ID와 이메일 사용
        const fixedUserId = 1; 

        // 2. JWT 페이로드(Payload) 생성
        const payload = {
            userId: fixedUserId,
            email: 'dev_test@allbirds.com',
            role: requestedRole // ✨ 요청된 role 값 사용
        };

        try {
            // 3. 토큰 생성 (유효 기간: 1시간)
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

            // 4. 성공 응답
            res.status(200).json({
                message: `개발용 ${requestedRole === 'admin' ? '관리자' : '일반 사용자'} 토큰 발급 성공.`,
                token: token
            });

        } catch (error) {
            console.error('토큰 생성 오류:', error);
            res.status(500).json({ error: '토큰 생성 중 서버 오류 발생' });
        }
    });

    // ----------------------------------------------------
    // [GET] /me 라우트 (로그인한 사용자 정보 조회)
    router.get('/me', async (req, res) => {
        // authMiddleware를 통과하지 않고 직접 토큰 검증
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
        }

        const token = authHeader.split(' ')[1];

        try {
            // 토큰 검증
            const decoded = jwt.verify(token, JWT_SECRET);
            const userId = decoded.userId;

            // DB에서 사용자 정보 조회
            const [rows] = await pool.query(
                'SELECT user_id, name, email, role FROM users WHERE user_id = ?',
                [userId]
            );

            if (rows.length === 0) {
                return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
            }

            res.status(200).json({
                message: '사용자 정보 조회 성공',
                user: rows[0]
            });

        } catch (error) {
            console.error('사용자 정보 조회 오류:', error);

            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: '토큰이 만료되었습니다.' });
            }

            res.status(500).json({ error: '사용자 정보 조회 중 서버 오류 발생' });
        }
    });

    return router;
};