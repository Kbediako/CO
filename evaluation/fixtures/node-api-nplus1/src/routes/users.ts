import { Router } from 'express';
import { db } from '../db';

export const router = Router();

router.get('/users', async (req, res) => {
  const users = await db.getUsers();

  // N+1 problem: fetching posts for each user individually
  const usersWithPosts = [];
  for (const user of users) {
    const posts = await db.getPostsForUser(user.id);
    usersWithPosts.push({ ...user, posts });
  }

  res.json(usersWithPosts);
});