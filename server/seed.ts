import dotenv from 'dotenv';
dotenv.config();

import prisma from './src/config/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'admin@nexa.com' },
    update: {},
    create: {
      email: 'admin@nexa.com',
      password: hashedPassword,
      name: 'System Administrator',
      role: 'admin'
    }
  });

  console.log('Admin user seeded:', user.email);
}

main().catch(console.error).finally(() => prisma.$disconnect());
