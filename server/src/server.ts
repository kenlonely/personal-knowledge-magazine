import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', async (_req, res) => {
  const users = await prisma.user.count().catch(() => 0);
  res.json({ ok: true, users });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});