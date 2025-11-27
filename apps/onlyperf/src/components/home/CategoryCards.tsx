import { type CategoryCard, CategoryCardsClient } from "./CategoryCardsClient";

export type { CategoryCard };

interface CategoryCardsProps {
  items?: CategoryCard[];
  className?: string;
}

export function CategoryCards(props: CategoryCardsProps) {
  return <CategoryCardsClient {...props} />;
}
