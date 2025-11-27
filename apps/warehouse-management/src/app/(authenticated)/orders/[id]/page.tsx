import { notFound } from 'next/navigation';
import { getOrderById } from '~/actions/orderActions';
import OrderDetailClientUI from '~/components/orders/OrderDetailClientUI';
import { getColorsAction } from '~/actions/colorActions';

interface OrderPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { id } = await params;
  const [result, colorsResult] = await Promise.all([
    getOrderById(id),
    getColorsAction(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  return <OrderDetailClientUI order={result.data} colors={colorsResult.success ? colorsResult.data : []} />;
}
