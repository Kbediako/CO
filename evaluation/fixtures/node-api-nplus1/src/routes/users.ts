import { type Request, type Response, Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/users', async (_req: Request, res: Response) => {
  const users = await db.getUsers();
  const allPosts = await db.getAllPosts();

  const usersWithPosts = users.map((user) => ({
    ...user,
    posts: allPosts.filter((post) => post.userId === user.id)
  }));

  res.json(usersWithPosts);
});
