const { db } = require('../db');

async function getUsersWithPosts() {
  const users = await db.getUsers();

  const usersWithPosts = [];
  for (const user of users) {
    const posts = await db.getPostsForUser(user.id);
    usersWithPosts.push({ ...user, posts });
  }

  return usersWithPosts;
}

module.exports = { getUsersWithPosts };
