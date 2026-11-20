import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { slugify } from '../common/utils/slugify.util';
import { ProductRepository } from '../product/product.repository';
import { CategoryRepository } from './category.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    @Inject(forwardRef(() => ProductRepository))
    private readonly productRepository: ProductRepository,
  ) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const slug = createCategoryDto.slug
      ? slugify(createCategoryDto.slug)
      : slugify(createCategoryDto.name);

    const existing = await this.categoryRepository.findBySlug(slug);
    if (existing) {
      throw new ConflictException(`Category with slug '${slug}' already exists`);
    }

    return this.categoryRepository.create({
      name: createCategoryDto.name.trim(),
      slug,
      description: createCategoryDto.description?.trim() || '',
      image: createCategoryDto.image?.trim() || '',
      isActive: createCategoryDto.isActive !== undefined ? createCategoryDto.isActive : true,
    });
  }

  async findAll(activeOnly = false) {
    return this.categoryRepository.findAll(activeOnly);
  }

  async findBySlug(slug: string) {
    const category = await this.categoryRepository.findBySlug(slug);
    if (!category) {
      throw new NotFoundException(`Category with slug '${slug}' not found`);
    }
    return category;
  }

  async findById(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundException(`Category with id '${id}' not found`);
    }
    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findById(id);

    const updateData: Record<string, any> = Object.assign(
      {},
      updateCategoryDto,
    );

    if (updateCategoryDto.slug) {
      const slug = slugify(updateCategoryDto.slug);
      const existing = await this.categoryRepository.findBySlug(slug);
      if (existing && existing._id.toString() !== id) {
        throw new ConflictException(`Category with slug '${slug}' already exists`);
      }
      updateData.slug = slug;
    } else if (updateCategoryDto.name && !updateCategoryDto.slug) {
      // Keep existing slug unless explicitly provided
    }

    return this.categoryRepository.updateById(id, updateData);
  }

  async delete(id: string) {
    await this.findById(id);

    const associatedProducts =
      await this.productRepository.countByCategoryId(id);
    if (associatedProducts > 0) {
      throw new BadRequestException(
        `Cannot delete category. It is associated with ${associatedProducts} product(s).`,
      );
    }

    return this.categoryRepository.deleteById(id);
  }
}
