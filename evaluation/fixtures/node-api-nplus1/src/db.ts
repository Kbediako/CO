type User = { id: number; name: string };
type Post = { id: number; userId: number; title: string };

const users: User[] = [
  { id: 1, name: 'Ada Lovelace' },
  { id: 2, name: 'Alan Turing' }
];

const posts: Post[] = [
  { id: 1, userId: 1, title: 'Computing notes' },
  { id: 2, userId: 1, title: 'Analytical Engine' },
  { id: 3, userId: 2, title: 'Enigma work' }
];

export const db = {
  async getUsers(): Promise<User[]> {
    return users;
  },
  async getAllPosts(): Promise<Post[]> {
    return posts;
  }
};
