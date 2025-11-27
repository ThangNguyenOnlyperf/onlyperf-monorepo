import { redirect } from 'next/navigation';

interface ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  // Since products are actually shipment items, redirect to the correct page
  redirect(`/items/${id}`);
}