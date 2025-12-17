const assert = require('node:assert/strict');

const { db } = require('../src/db');
const { getUsersWithPosts } = require('../src/routes/users');

async function main() {
  db.resetMetrics();

  const usersWithPosts = await getUsersWithPosts();

  assert.equal(
    db.metrics.getPostsForUserCalls,
    0,
    'expected no per-user post queries (avoid N+1 behavior)'
  );
  assert.equal(db.metrics.getAllPostsCalls, 1, 'expected a single bulk post query');

  assert.deepEqual(usersWithPosts, [
    {
      id: 1,
      name: 'Ada Lovelace',
      posts: [
        { id: 1, userId: 1, title: 'Computing notes' },
        { id: 2, userId: 1, title: 'Analytical Engine' }
      ]
    },
    {
      id: 2,
      name: 'Alan Turing',
      posts: [{ id: 3, userId: 2, title: 'Enigma work' }]
    }
  ]);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

