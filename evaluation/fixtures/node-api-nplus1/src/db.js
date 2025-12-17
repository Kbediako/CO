const users = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' }
];

const posts = [
  { id: 1, userId: 1, title: 'Computing notes' },
  { id: 2, userId: 1, title: 'Analytical Engine' },
  { id: 3, userId: 2, title: 'Enigma work' }
];

const metrics = {
  getUsersCalls: 0,
  getPostsForUserCalls: 0,
  getAllPostsCalls: 0
};

function resetMetrics() {
  metrics.getUsersCalls = 0;
  metrics.getPostsForUserCalls = 0;
  metrics.getAllPostsCalls = 0;
}

const db = {
  metrics,
  resetMetrics,
  async getUsers() {
    metrics.getUsersCalls += 1;
    return users;
  },
  async getPostsForUser(userId) {
    metrics.getPostsForUserCalls += 1;
    return posts.filter((post) => post.userId === userId);
  },
  async getAllPosts() {
    metrics.getAllPostsCalls += 1;
    return posts;
  }
};

module.exports = { db };
