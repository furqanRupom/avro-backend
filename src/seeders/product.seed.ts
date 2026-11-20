import { Model } from 'mongoose';
import { slugify } from '../common/utils/slugify.util';

export async function seedProducts(
  productModel: Model<any>,
  categoryMap: Map<string, any>,
) {
  const mensCat = categoryMap.get('mens-fashion');
  const womensCat = categoryMap.get('womens-fashion');
  const electronicsCat = categoryMap.get('electronics-gadgets');
  const homeCat = categoryMap.get('home-living');

  const initialProducts = [
    {
      name: 'Classic Oxford Cotton Shirt',
      slug: 'classic-oxford-cotton-shirt',
      description:
        'Breathable 100% premium cotton shirt tailored for business and casual wear.',
      images: [
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500',
      ],
      category: mensCat?._id,
      price: 34.99,
      discountPrice: 29.99,
      stock: 45,
      sku: 'SHIRT-OXF-001',
      isActive: true,
    },
    {
      name: 'Slim Fit Denim Jeans',
      slug: 'slim-fit-denim-jeans',
      description:
        'Durable stretch denim trousers offering all-day comfort and a sleek profile.',
      images: [
        'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
      ],
      category: mensCat?._id,
      price: 49.99,
      discountPrice: null,
      stock: 30,
      sku: 'JEAN-SLM-002',
      isActive: true,
    },
    {
      name: 'Floral Print Midi Dress',
      slug: 'floral-print-midi-dress',
      description:
        'Lightweight summery floral midi dress crafted with eco-friendly viscose fabric.',
      images: [
        'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500',
      ],
      category: womensCat?._id,
      price: 44.99,
      discountPrice: 39.99,
      stock: 25,
      sku: 'DRS-FLR-003',
      isActive: true,
    },
    {
      name: 'Wireless Active Noise-Canceling Earbuds',
      slug: 'wireless-active-noise-canceling-earbuds',
      description:
        'Bluetooth 5.3 earbuds featuring 32-hour battery life and high-fidelity sound.',
      images: [
        'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500',
      ],
      category: electronicsCat?._id,
      price: 79.99,
      discountPrice: 59.99,
      stock: 60,
      sku: 'EAR-WLS-004',
      isActive: true,
    },
    {
      name: 'Smart Fitness Band Pro',
      slug: 'smart-fitness-band-pro',
      description:
        'Water-resistant fitness tracker with AMOLED display and heart rate monitoring.',
      images: [
        'https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=500',
      ],
      category: electronicsCat?._id,
      price: 39.99,
      discountPrice: null,
      stock: 4, // Intentionally low stock for testing dashboard!
      sku: 'SMT-BND-005',
      isActive: true,
    },
    {
      name: 'Ceramic Pour-Over Coffee Dripper Set',
      slug: 'ceramic-pour-over-coffee-dripper-set',
      description:
        'Handcrafted heat-retaining ceramic coffee dripper with wooden stand.',
      images: [
        'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500',
      ],
      category: homeCat?._id,
      price: 28.5,
      discountPrice: 24.0,
      stock: 18,
      sku: 'HOM-COF-006',
      isActive: true,
    },
  ];

  for (const item of initialProducts) {
    if (!item.category) continue;

    const sku = item.sku.toUpperCase();
    const existing = await productModel.findOne({ sku });

    if (!existing) {
      const slug = slugify(item.slug || item.name);
      await productModel.create({
        ...item,
        sku,
        slug,
      });
      console.log(`[Seed] Created product: ${item.name} (${sku})`);
    } else {
      console.log(`[Seed] Product '${item.name}' already exists. Skipping.`);
    }
  }
}
