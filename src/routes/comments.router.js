// routes/comments.router.js

import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { parseModelToFlatObject } from '../utils/prisma/object.helper.js';

const router = express.Router(); // express.Router()를 이용해 라우터를 생성합니다.

/* 댓글 생성 Logic */
// model Comments {
//   commentId   String @id @default(uuid()) @map("commentId")
//   PostId      String @map("PostId")
//   UserId      String @map("UserId")

//   comment     String @map("comment") @db.Text

//   createdAt DateTime @default(now()) @map("createdAt")
//   updatedAt DateTime @updatedAt @map("updatedAt")

//     User Users @relation(fields: [UserId], references: [userId], onDelete: Cascade)
//     Post Posts @relation(fields: [PostId], references: [postId], onDelete: Cascade)

//   @@map("Comments")
// }

router.post('/posts/:postId/comments', authMiddleware, async (req, res, next) => {
  const { postId } = req.params;
  const { comment } = req.body;

  if (!postId || !comment) {
    res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
  } else if (!comment) {
    res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
  } else {
    try {
      const createdComment = await prisma.comments.create({
        data: {
          PostId: postId,
          UserId: req.user.userId,
          comment,
        },
      });
      res.status(201).json({ message: '댓글을 작성하였습니다.' });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

/*  게시글 별 댓글 전체 목록 조회 Logic */
// 1. request body input : 없음
// 2. validation check : 없음
// 3. select all comments in Comments table and sort by createdAt in descending order
// 4. response :
/* TODO: UserId -> userId 로 출력해야함 */
// # 200 댓글 목록 조회에 성공한 경우
// {
// "comments": [
// {
// "commentId": "62d6d12cd88cadd496a9e54f",
// "userId": "62d6d12cd23fadd49532124e",
// "nickname": "Developer",
// "comment": "안녕하세요 2번째 댓글입니다.",
// "createdAt": "2023-08-25T07:54:24.000Z",
// "updatedAt": "2023-08-25T07:54:24.000Z"
// },
// {
// "commentId": "62d6d12cd88cadd496a9e543",
// "userId": "62d6d12cd23fadd49532124e",
// "nickname": "Developer",
// "comment": "안녕하세요 댓글입니다.",
// "createdAt": "2023-08-25T07:53:31.000Z",
// "updatedAt": "2023-08-25T07:53:31.000Z"
// }
// ]
// }
// 5. error handling : # 400 postId를 입력받지 못한 경우 { message: '데이터 형식이 올바르지 않습니다.' } 출력
// 5. error handling : # 404 postId에 해당하는 댓글이 없는 경우 { message: '댓글 조회에 실패하였습니다.' } 출력
router.get('/posts/:postId/comments', async (req, res, next) => {
  const { postId } = req.params;
  if (!postId) {
    res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
  } else {
    try {
      const comments = await prisma.comments.findMany({
        where: {
          PostId: postId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          commentId: true,
          UserId: true,
          PostId: true,
          User: {
            select: {
              nickname: true,
            },
          },
          comment: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (comments.length === 0) {
        res.status(404).json({ message: '댓글 조회에 실패하였습니다.' });
      } else {
        res
          .status(200)
          .json({ comments: comments.map((comment) => parseModelToFlatObject(comment)) });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

/* 댓글 수정 Logic */
// 1. request body input : password, content
// 2. validation check : password, content
// 3. select comment in Comments table by commentId
// 4. 댓글 조회되었다면 해당하는 게시글과 댓글의 `password`가 일치하는지 확인합니다.
// 5. update comment in Comments table : password, content
// 6. response : {  "message": "댓글을 수정하였습니다."} 출력
// 7. error handling : # 400 body의 content를 입력받지 못한 경우 { message: '댓글 내용을 입력해주세요.' } 출력
// 7. error handling : # 400 body 또는 params를 입력받지 못한 경우 { message: '데이터 형식이 올바르지 않습니다.' } 출력
// 7. error handling : # 404 _commentId에 해당하는 댓글이 존재하지 않을 경우 { message: '댓글 조회에 실패하였습니다.' } 출력
router.put('/posts/:postId/comments/:commentId', authMiddleware, async (req, res, next) => {
  const { postId, commentId } = req.params;
  const { comment } = req.body;

  if (!postId || !commentId || !comment) {
    res.status(400).json({ message: '데이터 형식이 올바르지 않습니 || ' });
  } else if (!comment) {
    res.status(400).json({ message: '댓글 내용을 입력해주세요.' });
  } else {
    try {
      const targetComment = await prisma.comments.findUnique({
        where: {
          commentId: commentId,
        },
      });
      if (!targetComment) {
        res.status(404).json({ message: '댓글 조회에 실패하였습니다.' });
      } else {
        const updatedComment = await prisma.comments.update({
          where: {
            commentId,
          },
          data: {
            comment,
          },
        });
        res.status(200).json({ message: '댓글을 수정하였습니다.' });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

/* 댓글 삭제 Logic */
// 1. request body input : password
// 2. paramerter : /posts/:postId/comments/:commentId
// 3. validation check : password
// 4. select comment in Comments table by commentId
// 5. 댓글 조회되었다면 해당하는 게시글과 댓글의 `password`가 일치하는지 확인합니다.
// 6. delete comment in Comments table by commentId
// 7. response : {  "message": "댓글을 삭제하였습니다."} 출력
// 8. error handling : # 400 body 또는 params를 입력받지 못한 경우 { message: '데이터 형식이 올바르지 않습니다.' } 출력
// 8. error handling : # 404 _commentId에 해당하는 댓글이 존재하지 않을 경우 { message: '댓글 조회에 실패하였습니다.' } 출력
router.delete('/posts/:postId/comments/:commentId', authMiddleware, async (req, res, next) => {
  const { postId, commentId } = req.params;

  if ((!postId, !commentId)) {
    res.status(400).json({ message: '데이터 형식이 올바르지 않습니다.' });
  } else {
    try {
      const comment = await prisma.comments.findUnique({
        where: {
          commentId,
        },
      });
      if (!comment) {
        res.status(404).json({ message: '댓글 조회에 실패하였습니다.' });
      } else {
        await prisma.comments.delete({
          where: {
            commentId,
            PostId: postId,
          },
        });
        res.status(200).json({ message: '댓글을 삭제하였습니다.' });
      }
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
});

export default router;
