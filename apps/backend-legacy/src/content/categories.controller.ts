import { Controller, Get } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  listCategories() {
    return this.contentService.listCategories();
  }
}
