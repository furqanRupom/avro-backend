import { Model } from 'mongoose';
import { slugify } from '../common/utils/slugify.util';

export const initialCategories = [
  {
    name: "Men's Fashion",
    slug: 'mens-fashion',
    description: 'Clothing, shoes, and accessories for men',
    image: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?w=500',
    isActive: true,
  },
  {
    name: "Women's Fashion",
    slug: 'womens-fashion',
    description: 'Trending fashion apparel and jewelry for women',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=500',
    isActive: true,
  },
  {
    name: 'Electronics & Gadgets',
    slug: 'electronics-gadgets',
    description: 'Smartphones, audio, chargers, and accessories',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500',
    isActive: true,
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    description: 'Decor, kitchenware, and daily essentials',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=500',
    isActive: true,
  },
];

export async function seedCategories(
  categoryModel: Model<any>,
): Promise<Map<string, any>> {
  const categoryMap = new Map<string, any>();

  for (const item of initialCategories) {
    const slug = slugify(item.slug || item.name);
    let category = await categoryModel.findOne({ slug });

    if (!category) {
      category = await categoryModel.create({
        ...item,
        slug,
      });
      console.log(`[Seed] Created category: ${item.name} (${slug})`);
    } else {
      console.log(`[Seed] Category '${item.name}' already exists. Skipping.`);
    }

    categoryMap.set(slug, category);
  }

  return categoryMap;
}
