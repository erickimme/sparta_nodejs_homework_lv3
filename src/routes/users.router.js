import express from 'express';
import bcrypt from 'bcrypt';
import joi from 'joi';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import errorhandlingMiddleware from '../middlewares/error-handling.middleware.js';

const router = express.Router();

/* 사용자 회원가입 API Logic */
// - 닉네임, 비밀번호, 비밀번호 확인을 **request**에서 전달받기
// - 닉네임은 `최소 3자 이상, 알파벳 대소문자(a~z, A~Z), 숫자(0~9)`로 구성하기
// - 비밀번호는 `최소 4자 이상이며, 닉네임과 같은 값이 포함된 경우 회원가입에 실패`로 만들기
// - 비밀번호 확인은 비밀번호와 정확하게 일치하기
// {  "nickname": "Developer",  "password": "1234",  "confirm": "1234"}
// - 데이터베이스에 존재하는 닉네임을 입력한 채 회원가입 버튼을 누른 경우 "중복된 닉네임입니다." 라는 에러메세지를 **response**에 포함하기
// # 201 회원가입에 성공한 경우
// {  "message": "회원 가입에 성공하였습니다."}

/* Joi유효성 검사 */
// - value 데이터 - 필수적으로 존재
// - value 데이터 - 문자열
// - value 데이터 최소 1글자, 최대 50글자
// - validate 실패했을 때 error

// - 닉네임은 `최소 3자 이상, 알파벳 대소문자(a~z, A~Z), 숫자(0~9)`로 구성하기
// - 비밀번호는 `최소 4자 이상이며, 닉네임과 같은 값이 포함된 경우 회원가입에 실패`로 만들기
const nickname_pattern = /^[a-z|A-Z|0-9]+$/;
const postUserSchema = joi.object({
  nickname: joi.string().min(3).pattern(new RegExp(nickname_pattern)).required().messages({
    'string.pattern.base': '닉네임은 알파벳 대소문자(a~z, A~Z), 숫자(0~9)`로 구성되어야합니다.',
    'string.min': '닉네임은 최소 3자 이상이여야합니다.',
  }),
  password: joi
    .string()
    .min(4)
    .custom((value, helpers) => {
      if (value.includes(helpers.state.ancestors[0].nickname)) {
        return helpers.error('password.nicknameInPassword');
      }
      return value;
    })
    .required()
    .messages({
      'password.nicknameInPassword': '비밀번호에 닉네임이 포함되어 있습니다.',
      'string.min': '비밀번호는 최소 4자 이상이여야합니다.',
    }),
  confirm: joi.string().valid(joi.ref('password')).required().messages({
    'any.only': '비밀번호와 비밀번호 확인이 일치하지 않습니다.',
  }),
});

router.post('/signup', async (req, res, next) => {
  try {
    const { nickname, password, confirm } = req.body;

    // req.body에 nickname, password, confirm이 없는 경우
    if (!nickname || !password || !confirm) {
      res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
    }

    // 닉네임, 패스워드 validate using joi
    // const value = await postUserSchema.validateAsync(req.body);
    const { error, value } = postUserSchema.validate(req.body);

    // Joi 유효성 검사 실패시 실패한 메시지 전달
    // *TODO*: message를 한국어로 전달하기 //
    if (error) {
      console.log(error);
      res.status(400).json({ error: error.details[0].message });
    } else {
      if (!value) {
        return res.status(400).json({ errorMessage: '검증할 데이터가 존재하지 않습니다.' });
      }

      // 회원가입 로직
      // 이미 존재하는 유저인지 확인
      const isExistUser = await prisma.users.findFirst({
        where: { nickname },
      });
      if (isExistUser) {
        return res.status(409).json({ message: '중복된 닉네임입니다.' });
      } else {
        // bcrypt를 이용한 암호화
        const hashedPassword = await bcrypt.hash(password, 10);
        // 회원가입 성공 시 Users 테이블에 사용자 생성
        const createdUser = await prisma.users.create({
          data: {
            nickname,
            password: hashedPassword,
          },
        });

        // 회원가입 성공 시 UserInfos 테이블에 사용자 정보를 생성
        const createdUserInfo = await prisma.userInfos.create({
          data: {
            UserId: createdUser.userId,
          },
        });
        return res.status(201).json({ message: '회원 가입에 성공하였습니다.' });
      }
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/** 사용자 로그인 API Logic */
// - 닉네임, 비밀번호를 **request**에서 전달받기
// - 로그인 버튼을 누른 경우 닉네임과 비밀번호가 데이터베이스에 등록됐는지 확인한 뒤, 하나라도 맞지 않는 정보가 있다면 "닉네임 또는 패스워드를 확인해주세요."라는 에러 메세지를 **response**에 포함하기
// - 로그인 성공 시, 로그인에 성공한 유저의 정보를 JWT를 활용하여 클라이언트에게 Cookie로 전달하기
// request
// {  "nickname": "Developer",  "password": "1234"}

// response
// # 200 로그인에 성공한 경우 {  "token": "eyJhbGciO......."}

// response header
// { “Authorization”: “Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTY3MTc4MDgyOH0.INRgdu1_eIjKurmG2nOkbSAnQaTBBIwUNRSWGizqdHo” }

// error handling
// # 412 해당하는 유저가 존재하지 않는 경우
// {"errorMessage": "닉네임 또는 패스워드를 확인해주세요."}
// # 400 예외 케이스에서 처리하지 못한 에러
// {"errorMessage": "로그인에 실패하였습니다."}
router.post('/login', async (req, res, next) => {
  const { nickname, password } = req.body;
  const user = await prisma.users.findFirst({ where: { nickname } });
  console.log(nickname === user.nickname); // true
  console.log(password === user.password); // false
  console.log(password, user.password);
  console.log(nickname, user.nickname);
  console.log(await bcrypt.compare(password, user.password));
  console.log(await bcrypt.compare(nickname, user.nickname));

  if (!user) {
    res.status(412).json({ errorMessage: '닉네임 또는 패스워드를 확인해주세요.' });
  }
  // 입력받은 사용자의 닉네임, 비밀번호와 데이터베이스에 저장된 닉네임, 비밀번호를 비교
  else if (!(await bcrypt.compare(password, user.password)) || nickname != user.nickname) {
    return res.status(400).json({ errorMessage: '로그인에 실패하였습니다.' });
  }

  //로그인 성공
  const token = jwt.sign(
    {
      userId: user.userId,
    },
    'customized_secret_key'
  );
  // authorization
  res.cookie('authorization', `Bearer ${token}`);
  return res.status(200).json({ tokens: `${token}` });
});

/** 사용자 정보 조회 API 비즈니스 로직 */
/* TODO: 시간 남으면 이것도 작업 도전 */
// 1. 클라이언트가 **로그인된 사용자인지 검증**합니다.
// 2. 사용자를 조회할 때, 1:1 관계를 맺고 있는 **Users**와 **UserInfos** 테이블을 조회합니다.
// 3. 조회한 사용자의 상세한 정보를 클라이언트에게 반환합니다.

export default router;
