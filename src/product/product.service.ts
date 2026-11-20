import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { CategoryRepository } from '../category/category.repository';
import { slugify } from '../common/utils/slugify.util';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductSortBy, QueryProductsDto } from './dto/query-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { ProductRepository } from './product.repository';

@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    @Inject(forwardRef(() => CategoryRepository))
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async create(createProductDto: CreateProductDto) {
    // 1. Validate Category
    const category = await this.categoryRepository.findById(
      createProductDto.category,
    );
    if (!category || !category.isActive) {
      throw new BadRequestException('Selected category does not exist or is inactive');
    }

    // 2. Validate Prices
    if (
      createProductDto.discountPrice !== undefined &&
      createProductDto.discountPrice !== null &&
      createProductDto.discountPrice > createProductDto.price
    ) {
      throw new BadRequestException(
        'Discount price cannot be greater than regular price',
      );
    }

    // 3. Unique Slug
    const slug = createProductDto.slug
      ? slugify(createProductDto.slug)
      : slugify(createProductDto.name);

    const existingSlug = await this.productRepository.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictException(`Product with slug '${slug}' already exists`);
    }

    // 4. Unique SKU
    const sku = createProductDto.sku.toUpperCase().trim();
    const existingSku = await this.productRepository.findBySku(sku);
    if (existingSku) {
      throw new ConflictException(`Product with SKU '${sku}' already exists`);
    }

    return this.productRepository.create({
      name: createProductDto.name.trim(),
      slug,
      description: createProductDto.description.trim(),
      images: createProductDto.images || [],
      category: new Types.ObjectId(createProductDto.category),
      price: createProductDto.price,
      discountPrice:
        createProductDto.discountPrice !== undefined
          ? createProductDto.discountPrice
          : null,
      stock: createProductDto.stock,
      sku,
      isActive:
        createProductDto.isActive !== undefined
          ? createProductDto.isActive
          : true,
    });
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existing = await this.productRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }

    const updateData: Record<string, any> = Object.assign(
      {},
      updateProductDto,
    );

    // Validate Category if provided
    if (updateProductDto.category) {
      const category = await this.categoryRepository.findById(
        updateProductDto.category,
      );
      if (!category || !category.isActive) {
        throw new BadRequestException('Selected category does not exist or is inactive');
      }
      updateData.category = new Types.ObjectId(updateProductDto.category);
    }

    // Validate Prices
    const targetPrice =
      updateProductDto.price !== undefined
        ? updateProductDto.price
        : existing.price;
    const targetDiscount =
      updateProductDto.discountPrice !== undefined
        ? updateProductDto.discountPrice
        : existing.discountPrice;

    if (
      targetDiscount !== undefined &&
      targetDiscount !== null &&
      targetDiscount > targetPrice
    ) {
      throw new BadRequestException(
        'Discount price cannot be greater than regular price',
      );
    }

    // Unique Slug if changed
    if (updateProductDto.slug) {
      const slug = slugify(updateProductDto.slug);
      const existingSlug = await this.productRepository.findBySlug(slug);
      if (existingSlug && existingSlug._id.toString() !== id) {
        throw new ConflictException(`Product with slug '${slug}' already exists`);
      }
      updateData.slug = slug;
    }

    // Unique SKU if changed
    if (updateProductDto.sku) {
      const sku = updateProductDto.sku.toUpperCase().trim();
      const existingSku = await this.productRepository.findBySku(sku);
      if (existingSku && existingSku._id.toString() !== id) {
        throw new ConflictException(`Product with SKU '${sku}' already exists`);
      }
      updateData.sku = sku;
    }

    return this.productRepository.updateById(id, updateData);
  }

  async updateStock(id: string, updateStockDto: UpdateStockDto) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }

    return this.productRepository.updateById(id, {
      stock: updateStockDto.stock,
    });
  }

  async delete(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }

    return this.productRepository.deleteById(id);
  }

  async findBySlugPublic(slug: string) {
    const product = await this.productRepository.findBySlug(slug, true);
    if (!product) {
      throw new NotFoundException(`Product '${slug}' not found`);
    }
    return product;
  }

  async findById(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Product with id '${id}' not found`);
    }
    return product;
  }

  async findAll(query: QueryProductsDto, isAdmin = false) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    // Public endpoints only see active products
    if (!isAdmin) {
      filter.isActive = true;
    }

    // Search by name, description, or SKU
    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { sku: searchRegex },
      ];
    }

    // Category filter (support category ID or slug)
    if (query.category) {
      if (Types.ObjectId.isValid(query.category)) {
        filter.category = new Types.ObjectId(query.category);
      } else {
        const cat = await this.categoryRepository.findBySlug(query.category);
        if (cat) {
          filter.category = cat._id;
        } else {
          return {
            items: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
          };
        }
      }
    }

    // Price range filters
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined) {
        filter.price.$gte = query.minPrice;
      }
      if (query.maxPrice !== undefined) {
        filter.price.$lte = query.maxPrice;
      }
    }

    // Sort order
    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    if (query.sortBy === ProductSortBy.PRICE_ASC) {
      sort = { price: 1 };
    } else if (query.sortBy === ProductSortBy.PRICE_DESC) {
      sort = { price: -1 };
    } else if (query.sortBy === ProductSortBy.NAME_ASC) {
      sort = { name: 1 };
    }

    const [items, total] = await Promise.all([
      this.productRepository.findWithFilters(filter, sort, skip, limit),
      this.productRepository.countWithFilters(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
