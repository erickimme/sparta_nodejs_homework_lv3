// routes/posts.router.js

import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router(); // express.Router()를 이용해 라우터를 생성합니다.

/* 게시물 생성 Logic */
// 1. request body input : user, password, title, content
// 2. validation check : user, password, title, content
// 3. reqeust  {  "title": "안녕하세요 게시글 제목입니다.",  "content": "안녕하세요 content 입니다."}
// 3. create post in Posts table : user, password, title, content
// 4. response : {  "message": "게시글을 생성하였습니다."} 출력
// 5. error handling : # 400 body 또는 params를 입력받지 못한 경우 { message: '데이터 형식이 올바르지 않습니다.' } 출력
router.post('/posts', authMiddleware, async (req, res, next) => {
  const { userId } = req.user;
  const { title, content } = req.body;
  console.log('Posting router');
  console.log(userId, title, content);

  if (!title || !content) {
    res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
  } else {
    try {
      const createdPost = await prisma.posts.create({
        data: {
          UserId: +userId,
          title,
          content,
        },
      });
      res.status(201).json({ message: '게시글을 생성하였습니다.' });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

/*  전체 게시물 목록 조회 Logic */
// 1. request body input : 없음
// 2. validation check : 없음
// 3. 제목, 작성자명(nickname), 작성 날짜를 조회하기 + 작성 날짜 기준으로 내림차순 정렬하기
//  (= select all posts in Posts table and sort by createdAt in descending order)
// 4. response :
// # 200 게시글 조회에 성공한 경우
// {
// "posts": [
// {
// "postId": "62d6d12cd88cadd496a9e54e",
// "userId": "62d6d12cd23fadd49532124e",
// "nickname": "Developer",
// "title": "안녕하세요 2번째 게시글 제목입니다.",
// "createdAt": "2023-08-25T07:45:56.000Z",
// "updatedAt": "2023-08-25T07:45:56.000Z"
// },
// {
// "postId": "62d6d12cd88cadd496a9e54f",
// "userId": "62d6d12cd23fadd49532124e",
// "nickname": "Developer",
// "title": "안녕하세요 게시글 제목입니다.",
// "createdAt": "2023-08-25T07:45:15.000Z",
// "updatedAt": "2023-08-25T07:45:15.000Z"
// }
// ]
// }
// 5. error handling : # 400 예외 케이스에서 처리하지 못한 에러 {"errorMessage": "게시글 조회에 실패하였습니다."}

//1. 전체 게시글 목록 조회 API

router.get('/posts', async (req, res, next) => {
  try {
    const posts = await prisma.posts.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        postId: true,
        user: true,
        title: true,
        createdAt: true,
      },
    });
    res.status(200).json({ data: posts });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/* 게시물 상세 조회 Logic */
// 1. request body input : 없음
// 2. validation check : 없음
// 3. select post in Posts table by postId
// 4. response :
// {
//     "data":
//     {
//     "postId": "62d6cb83bb5a517ef2eb83cb",
//     "user": "Developer",
//     "title": "안녕하세요",
//     "content": "안녕하세요 content 입니다.",
//     "createdAt": "2023-08-27T15:19:31.730Z"
//     }
// }
// 5. error handling : # 404 postId에 해당하는 게시물이 없는 경우 { message: '게시글 조회에 실패하였습니다.' } 출력
// 5. error handling: # 400 body 또는 params를 입력받지 못한 경우 { message: '데이터 형식이 올바르지 않습니다.' } 출력
router.get('/posts/:postId', async (req, res, next) => {
  const { postId } = req.params;

  if (!postId) {
    res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
  } else {
    try {
      const post = await prisma.posts.findUnique({
        where: {
          postId,
        },
        select: {
          postId: true,
          user: true,
          title: true,
          content: true,
          createdAt: true,
        },
      });
      if (!post) {
        res.status(404).json({ message: '게시글 조회에 실패하였습니다.' });
      } else {
        res.status(200).json({ data: post });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

/* 상세 게시물 수정 Logic */
// 1. request body input : password, title, content
// {
//     "password": "1234",
//     "title": "안녕하세요2",
//     "content": "안녕하세요 content 입니다."
// }
// 2. validation check : password, title, content
// 3. select post in Posts table by postId
// 4. update post in Posts table by postId
// 5. response : {  "message": "게시글을 수정하였습니다."} 출력
// 6. error handling : # 404 postId에 해당하는 게시물이 없는 경우 { message: '게시글 조회에 실패하였습니다.' } 출력
// 6. error handling : # 400 body 또는 params를 입력받지 못한 경우 { message: '데이터 형식이 올바르지 않습니다.' } 출력
// 6. error handling : # 401 password가 일치하지 않는 경우 { message: '비밀번호가 일치하지 않습니다.' } 출력
router.put('/posts/:postId', async (req, res, next) => {
  const { postId } = req.params;
  const { password, title, content } = req.body;

  if (!postId || !password || !title || !content) {
    res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
  } else {
    try {
      const post = await prisma.posts.findUnique({
        where: {
          postId,
        },
      });
      if (!post) {
        res.status(404).json({ message: '게시글 조회에 실패하였습니다.' });
      } else {
        if (post.password !== password) {
          res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        } else {
          const updatedPost = await prisma.posts.update({
            where: {
              postId,
              password,
            },
            data: {
              title,
              content,
            },
          });
          res.status(200).json({ message: '게시글을 수정하였습니다.' });
        }
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

/* 게시물 삭제 Logic */
// 1. request body input : password
// {
//     "password": "1234"
// }
// 2. validation check : password
// 3. select post in Posts table by postId
// 4. delete post in Posts table by postId
// 5. response : {  "message": "게시글을 삭제하였습니다."} 출력
// 6. error handling : # 404 postId에 해당하는 게시물이 없는 경우 { message: '게시글 조회에 실패하였습니다.' } 출력
// 6. error handling : # 400 body 또는 params를 입력받지 못한 경우 { message: '데이터 형식이 올바르지 않습니다.' } 출력
// 6. error handling : # 401 password가 일치하지 않는 경우 { message: '비밀번호가 일치하지 않습니다.' } 출력
router.delete('/posts/:postId', async (req, res, next) => {
  const { postId } = req.params;
  const { password } = req.body;

  if (!postId || !password) {
    res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
  } else {
    try {
      const post = await prisma.posts.findUnique({
        where: {
          postId,
        },
      });
      if (!post) {
        res.status(404).json({ message: '게시글 조회에 실패하였습니다.' });
      } else {
        if (post.password !== password) {
          res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });
        } else {
          const deletedPost = await prisma.posts.delete({
            where: {
              postId,
              password,
            },
          });
          res.status(200).json({ message: '게시글을 삭제하였습니다.' });
        }
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

export default router;
