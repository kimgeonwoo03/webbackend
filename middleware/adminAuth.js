// middleware/adminAuth.js

const checkAdminRole = (req, res, next) => {
    // auth.js 미들웨어가 먼저 실행되어 req.user에 정보가 저장되었는지 확인
    if (!req.user) {
        // 이 오류는 authMiddleware가 먼저 실행되지 않았을 때만 발생해야 합니다.
        return res.status(500).json({ error: '인증 정보가 없습니다. (authMiddleware 먼저 실행 필요)' });
    }
    
    // role이 'admin'인지 확인합니다.
    if (req.user.role === 'admin') { 
        // 관리자 권한이 있으면 다음 단계로 진행
        next();
    } else {
        // 관리자 권한이 없으면 403 Forbidden 응답
        return res.status(403).json({ error: '접근 권한이 없습니다. 관리자만 접근 가능합니다.' });
    }
};

module.exports = checkAdminRole;