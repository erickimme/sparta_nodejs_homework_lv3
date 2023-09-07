import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

// 사용자 인증 미들웨어
export default async function (req, res, next) {
  try {
    const { authorization } = req.cookies;
    if (!authorization) throw new Error('토큰이 존재하지 않습니다.');

    const [tokenType, tokenValue] = authorization.split(' ');

    // // Bearer 토큰 형식인지 맞는지 확인
    if (tokenType !== 'Bearer') {
      // res.clearCookie(); // 인증에 실패하였을 경우 Cookie를 삭제합니다.
      throw new Error('토큰 타입이 일치하지 않습니다.');
    }

    // 서버에서 JWT가 맞는지 검증
    const decodedToken = jwt.verify(tokenValue, 'customized_secret_key');
    const userId = decodedToken.userId;

    // JWT의 userId를 이용해 데이터베이스에서 사용자를 조회
    const user = await prisma.users.findFirst({
      where: { userId: userId },
    });
    if (!user) {
      res.clearCookie('authorization');
      throw new Error('존재하지 않는 사용자입니다.');
    }
    // req.user에 사용자 정보를 저장
    req.user = user;

    // 다음 미들웨어로 넘어감
    next();
  } catch (error) {
    res.clearCookie('authorization');

    // 토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
    switch (error.message) {
      case 'TokenExpiredError':
        return res.status(401).json({ message: '토큰이 만료되었습니다.' });
      case 'JsonWebTokenError':
        return res.status(401).json({ message: '토큰이 조작되었습니다.' });
      default:
        return res.status(401).json({ message: error.message ?? '비정상적인 요청입니다.' });
    }
  }
}
