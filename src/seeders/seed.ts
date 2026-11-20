import * as dotenv from 'dotenv';
import mongoose from 'mongoose';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Category, CategorySchema } from '../category/schemas/category.schema';
import { Product, ProductSchema } from '../product/schemas/product.schema';
import { seedAdmin } from './admin.seed';
import { seedCategories } from './category.seed';
import { seedProducts } from './product.seed';

dotenv.config();

async function runSeeds() {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/avro';

  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  try {
    const userModel = mongoose.model(User.name, UserSchema);
    const categoryModel = mongoose.model(Category.name, CategorySchema);
    const productModel = mongoose.model(Product.name, ProductSchema);

    console.log('--- Starting Seed Execution ---');

    console.log('\n1. Seeding Admin User...');
    await seedAdmin(userModel);

    console.log('\n2. Seeding Categories...');
    const categoryMap = await seedCategories(categoryModel);

    console.log('\n3. Seeding Products...');
    await seedProducts(productModel, categoryMap);

    console.log('\n--- Seeding Completed Successfully! ---');
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  }
}

void runSeeds();
