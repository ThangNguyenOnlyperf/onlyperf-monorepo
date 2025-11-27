import { Money } from "@shopify/hydrogen-react";
import ProductVariantDivider from "./ProductVariantDivider";

interface ProductMetaProps {
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  availableForSale: boolean;
  tags?: string[];
}

/**
 * Product meta information component
 * Displays stock status, title, price, and tags
 */
export function ProductMeta({
  title,
  price,
  availableForSale,
  tags = [],
}: ProductMetaProps) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white ">
        {title}
      </h1>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-sm bg-primary text-white cursor-default flex items-center justify-center px-2 text-sm font-medium  dark:bg-zinc-800 dark:text-zinc-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {/* Price */}
      <div>
        <Money
          as="p"
          data={{
            amount: price.amount,
            currencyCode: price.currencyCode as any,
          }}
          className="text-2xl font-bold text-zinc-900 dark:text-white"
        />
      </div>
      <ProductVariantDivider />
    </div>
  );
}
