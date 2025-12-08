// middleware/adminAuth.js

const checkAdminRole = (req, res, next) => {
    // 1. authMiddleware가 먼저 실행되어 req.user가 있는지 확인
    if (!req.user) {
        return res.status(500).json({ error: '인증 정보가 없습니다. (authMiddleware가 먼저 실행되어야 합니다)' });
    }
    
    // 2. 역할(Role) 확인 (대소문자 무시하고 비교)
    // req.user.role이 없는 경우를 대비해 빈 문자열 처리
    const userRole = req.user.role ? req.user.role.toUpperCase() : '';

    if (userRole === 'ADMIN') { 
        // 관리자 권한이 확인되면 통과
        next();
    } else {
        // 관리자가 아니면 403 Forbidden (접근 금지)
        return res.status(403).json({ error: '접근 권한이 없습니다. 관리자만 접근 가능합니다.' });
    }
};

module.exports = checkAdminRole;