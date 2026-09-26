import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const required = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};
const validatePassword = (password: string) => {
  if (password.length < 12) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must be at least 12 characters');
  if (!/[A-Z]/.test(password)) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain an uppercase letter');
  if (!/[a-z]/.test(password)) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain a lowercase letter');
  if (!/[0-9]/.test(password)) throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain a number');
};

async function main() {
  if (process.env.NODE_ENV !== 'production') throw new Error('This command is for production only');
  if (process.env.ALLOW_INITIAL_ADMIN_BOOTSTRAP !== 'yes') throw new Error('Set ALLOW_INITIAL_ADMIN_BOOTSTRAP=yes');
  if (process.env.BOOTSTRAP_CONFIRM !== 'I_UNDERSTAND_ONE_TIME_BOOTSTRAP') throw new Error('Set BOOTSTRAP_CONFIRM=I_UNDERSTAND_ONE_TIME_BOOTSTRAP');
  const username = required('BOOTSTRAP_ADMIN_USERNAME');
  const email = required('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
  const fullName = required('BOOTSTRAP_ADMIN_FULL_NAME');
  const code = required('BOOTSTRAP_ADMIN_CODE');
  const password = required('BOOTSTRAP_ADMIN_PASSWORD');
  validatePassword(password);
  if (await prisma.user.count({ where: { roles: { has: Role.ADMIN } } })) throw new Error('An ADMIN user already exists; bootstrap is disabled');
  const [u, e, c] = await Promise.all([
    prisma.user.findUnique({ where: { username }, select: { id: true } }),
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { code }, select: { id: true } }),
  ]);
  if (u) throw new Error('BOOTSTRAP_ADMIN_USERNAME is already in use');
  if (e) throw new Error('BOOTSTRAP_ADMIN_EMAIL is already in use');
  if (c) throw new Error('BOOTSTRAP_ADMIN_CODE is already in use');
  const user = await prisma.user.create({
    data: { username, email, passwordHash: await bcrypt.hash(password, 12), fullName, code, roles: [Role.ADMIN] },
    select: { username: true, email: true },
  });
  console.log(`Initial ADMIN created successfully: ${user.username} (${user.email})`);
  console.log('Remove bootstrap values from the deployment secret store and restart the backend.');
}
main().catch((error) => { console.error(`Admin bootstrap failed: ${error instanceof Error ? error.message : 'unknown error'}`); process.exitCode = 1; }).finally(() => prisma.$disconnect());
