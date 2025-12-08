// user/user.js

const express = require('express');
const jwt = require('jsonwebtoken');

module.exports = ({ pool, JWT_SECRET, bcrypt }) => { 
    const router = express.Router();

    // ----------------------------------------------------
    // [POST] /user/dev/login (개발용 만능 로그인)
    // ----------------------------------------------------
    router.post('/dev/login', async (req, res) => {
        try {
            // 1. 요청 Body에서 정보 받기 (없으면 기본값 사용)
            // role: 대소문자 구분 없이 입력받아도 대문자로 변환 (DB ENUM과 일치)
            const role = req.body.role ? req.body.role.toUpperCase() : 'USER';
            
            // userId: 요청받은 ID가 있으면 쓰고, 없으면 1번(관리자) 사용
            const userId = req.body.userId || 1; 

            // 2. JWT 페이로드(Payload) 생성
            // 실제로는 DB에서 해당 userId의 이메일 등을 조회해야 하지만, 
            // 개발용이므로 임의의 이메일을 넣습니다.
            const payload = {
                userId: userId,
                email: `test_user_${userId}@allbirds.com`,
                role: role 
            };

            // 3. 토큰 생성 (유효 기간: 12시간으로 넉넉하게)
            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

            // 4. 성공 응답
            console.log(`✅ 개발용 토큰 발급 완료: UserID ${userId} (${role})`);
            
            res.status(200).json({
                message: `개발용 로그인 성공 (User ID: ${userId}, Role: ${role})`,
                token: token
            });

        } catch (error) {
            console.error('토큰 생성 오류:', error);
            res.status(500).json({ error: '토큰 생성 중 서버 오류 발생' });
        }
    });

    return router;
};