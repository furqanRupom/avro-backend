import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Role } from '../auth/enums/role.enum';

export async function seedAdmin(userModel: Model<any>) {
  const email = process.env.ADMIN_EMAIL || 'admin@avro.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';
  const name = process.env.ADMIN_NAME || 'Avro Administrator';

  const existingAdmin = await userModel.findOne({ email: email.toLowerCase() });
  if (existingAdmin) {
    console.log(`[Seed] Admin user '${email}' already exists. Skipping.`);
    return existingAdmin;
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const admin = await userModel.create({
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    phone: '+8801700000001',
    role: Role.ADMIN,
    address: {
      division: 'Dhaka',
      district: 'Dhaka',
      area: 'Gulshan',
      street: 'Road 11',
      postalCode: '1212',
    },
    isActive: true,
  });

  console.log(`[Seed] Created admin user: ${email}`);
  return admin;
}
