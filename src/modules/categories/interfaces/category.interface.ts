import { Category } from '@prisma/client';

export interface CategoryWithRelations extends Category {
  parent?: CategoryWithRelations | null;
  children?: CategoryWithRelations[];
}

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}
