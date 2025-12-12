// user/user.js

const express = require('express');
const jwt = require('jsonwebtoken');

// server.js에서 전달받은 의존성 (pool, JWT_SECRET) 사용
// NOTE: bcrypt를 더 이상 받지 않습니다.
module.exports = ({ pool, JWT_SECRET }) => { 
    const router = express.Router();

    // ==========================================================
    // 1. [POST] /login : 실제 로그인 (일반 텍스트 비교)
    // ==========================================================
    router.post('/login', async (req, res) => {
        const { email, password } = req.body; // 입력 비밀번호

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

            // 2. 비밀번호 비교 (⭐️ 핵심 수정 부분: 일반 텍스트 비교 ⭐️)
            // DB에 저장된 일반 텍스트와 입력된 일반 텍스트를 직접 비교합니다.
            const isMatch = (password === user.password_hash);

            if (!isMatch) {
                return res.status(401).json({ error: '가입되지 않은 이메일이거나 비밀번호가 틀렸습니다.' });
            }

            // 3. 로그인 성공: JWT 토큰 발급
            const payload = {
                userId: user.user_id,
                email: user.email,
                role: user.role,
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
    // 2. [POST] /logout : 로그아웃 (유지)
    // ==========================================================
    // (로그아웃 로직은 비밀번호와 무관하므로 변경 없음)
    router.post('/logout', async (req, res) => {
        try {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    console.log(`✅ 사용자 로그아웃: ${decoded.email} (ID: ${decoded.userId})`);
                } catch (error) {
                    console.log('만료된 토큰으로 로그아웃 시도');
                }
            }

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
    // 3. [POST] /register : 회원가입 (일반 텍스트 저장)
    // ==========================================================
    router.post('/register', async (req, res) => {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: '이메일, 비밀번호, 이름은 필수입니다.' });
        }

        try {
            // 1. 비밀번호 처리 (⭐️ 핵심 수정 부분: 일반 텍스트 그대로 저장 ⭐️)
            const plainTextPassword = password; 

            // 2. 기본 권한 설정
            const userRole = role === 'admin' ? 'admin' : 'user';

            // 3. DB에 저장
            const sql = `
                INSERT INTO users (email, password_hash, name, role) 
                VALUES (?, ?, ?, ?)
            `;
            // 해시 값 대신 일반 텍스트를 저장합니다.
            const [result] = await pool.query(sql, [email, plainTextPassword, name, userRole]); 

            res.status(201).json({
                message: '회원가입 성공 (비밀번호 일반 텍스트 저장됨)',
                userId: result.insertId
            });

        } catch (error) {
            console.error('회원가입 오류:', error);
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: '이미 존재하는 이메일입니다.' });
            }
            res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
        }
    });

    return router;
};