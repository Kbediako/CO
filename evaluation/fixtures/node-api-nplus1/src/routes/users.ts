import { Router } from 'express';
import { db } from '../db';

export const router = Router();

router.get('/users', async (req, res) => {
  const users = await db.getUsers();
  const allPosts = await db.getAllPosts();
  
  const usersWithPosts = users.map(user => ({
    ...user,
    posts: allPosts.filter(p => p.userId === user.id)
  }));

  res.json(usersWithPosts);
});