// user/user.js

const express = require('express');
const jwt = require('jsonwebtoken');

// server.js에서 전달받은 의존성 (pool, JWT_SECRET, bcrypt) 사용
module.exports = ({ pool, JWT_SECRET, bcrypt }) => { 
    const router = express.Router();

    // ==========================================================
    // 1. [POST] /login : 실제 로그인 (DB 조회 + 비밀번호 검증)
    // ==========================================================
    router.post('/login', async (req, res) => {
        const { email, password } = req.body;

        // 필수 입력값 확인
        if (!email || !password) {
            return res.status(400).json({ error: '이메일과 비밀번호를 모두 입력해주세요.' });
        }

        try {
            // 1. DB에서 이메일로 사용자 찾기
            const sql = 'SELECT user_id, email, password_hash, name, role FROM users WHERE email = ?';
            const [rows] = await pool.query(sql, [email]);

            // 사용자가 없는 경우
            if (rows.length === 0) {
                return res.status(401).json({ error: '가입되지 않은 이메일이거나 비밀번호가 틀렸습니다.' });
            }

            const user = rows[0];

            // 2. 비밀번호 비교 (입력한 비밀번호 vs DB의 해시된 비밀번호)
            const isMatch = await bcrypt.compare(password, user.password_hash);

            if (!isMatch) {
                return res.status(401).json({ error: '가입되지 않은 이메일이거나 비밀번호가 틀렸습니다.' });
            }

            // 3. 로그인 성공: JWT 토큰 발급
            const payload = {
                userId: user.user_id,
                email: user.email,
                role: user.role, // 'user' or 'admin'
                name: user.name
            };

            const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

            // 4. 응답 전송
            res.status(200).json({
                message: '로그인 성공!',
                token: token,
                role: user.role,
                name: user.name
            });

        } catch (error) {
            console.error('로그인 오류:', error);
            res.status(500).json({ error: '서버 오류가 발생했습니다.' });
        }
    });


    // ==========================================================
    // 2. [POST] /logout : 로그아웃
    // ==========================================================
    router.post('/logout', async (req, res) => {
        try {
            // 옵션 1: 토큰 기반 로깅 (선택사항)
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    
                    // 로그아웃 기록을 DB에 남기고 싶다면 여기에 추가
                    console.log(`✅ 사용자 로그아웃: ${decoded.email} (ID: ${decoded.userId})`);
                    
                    // 옵션: 로그아웃 이력을 DB에 저장
                    // const logSql = 'INSERT INTO logout_logs (user_id, logout_time) VALUES (?, NOW())';
                    // await pool.query(logSql, [decoded.userId]);
                    
                } catch (error) {
                    // 만료된 토큰이어도 로그아웃은 허용
                    console.log('만료된 토큰으로 로그아웃 시도');
                }
            }

            // 로그아웃 성공 응답
            // (실제 토큰 삭제는 프론트엔드에서 처리)
            res.status(200).json({
                message: '로그아웃 성공',
                detail: '토큰을 삭제하고 로그인 페이지로 이동하세요.'
            });

        } catch (error) {
            console.error('로그아웃 오류:', error);
            res.status(500).json({ error: '로그아웃 처리 중 오류가 발생했습니다.' });
        }
    });


    // ==========================================================
    // 3. [POST] /register : 회원가입 (테스트 계정 생성용)
    // ==========================================================
    router.post('/register', async (req, res) => {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: '이메일, 비밀번호, 이름은 필수입니다.' });
        }

        try {
            // 1. 비밀번호 암호화 (해싱)
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // 2. 기본 권한 설정 (요청이 없으면 'user')
            const userRole = role === 'admin' ? 'admin' : 'user';

            // 3. DB에 저장
            const sql = `
                INSERT INTO users (email, password_hash, name, role) 
                VALUES (?, ?, ?, ?)
            `;
            const [result] = await pool.query(sql, [email, hashedPassword, name, userRole]);

            res.status(201).json({
                message: '회원가입 성공',
                userId: result.insertId
            });

        } catch (error) {
            console.error('회원가입 오류:', error);
            // 이메일 중복 등의 오류 처리
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
            }
            res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
        }
    });

    return router;
};