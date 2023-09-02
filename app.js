// app.js

import express from 'express';
import PostsRouter from './routes/posts.router.js';
import CommentsRouter from './routes/comments.router.js';

const app = express();
const PORT = 3018;

app.use(express.json());
app.use('/api', [PostsRouter, CommentsRouter]);

app.listen(PORT, () => {
  console.log(PORT, '포트로 서버가 열렸어요!');
});
