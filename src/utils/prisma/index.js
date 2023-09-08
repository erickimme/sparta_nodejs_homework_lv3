import { PrismaClient } from '@prisma/client';

// PrismaClient 인스턴스를 생성합니다.
export const prisma = new PrismaClient({
  // Prisma를 이용해 데이터베이스를 접근할 때, SQL을 출력해줍니다.
  log: ['query', 'info', 'warn', 'error'],
  // 에러 메시지를 평문이 아닌, 개발자가 읽기 쉬운 형태로 출력해줍니다.
  errorFormat: 'pretty',
});

// const prisma = new PrismaClient();
// // sequential transaction
// const [posts, coments] = await prisma.$transaction([
//   prisma.posts.findMany(),
//   prisma.comments.findMany(),
// ]);

// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// // Sequential 트랜잭션은 순차적으로 실행됩니다.
// // Raw Quyery를 이용하여, 트랜잭션을 실행할 수 있습니다.
// const [users, userInfos] = await prisma.$transaction([
//   prisma.$queryRaw`SELECT * FROM Users`,
//   prisma.$queryRaw`SELECT * FROM UserInfos`,
// ]);

// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// // Prisma의 Interactive 트랜잭션을 실행합니다.
// const result = await prisma.$transaction(async (tx) => {
//   // 트랜잭션 내에서 사용자를 생성합니다.
//   const user = await tx.users.create({
//     data: {
//       email: 'testuser@gmail.com',
//       password: 'aaaa4321',
//     },
//   });

//   // 에러가 발생하여, 트랜잭션 내에서 실행된 모든 쿼리가 롤백됩니다.
//   throw new Error('트랜잭션 실패!');
//   return user;
// });
