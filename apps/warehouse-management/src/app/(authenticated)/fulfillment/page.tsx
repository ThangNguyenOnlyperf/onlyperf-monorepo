import { getPendingShopifyOrdersAction } from "~/actions/fulfillmentActions";
import FulfillmentClientUI from "~/components/fulfillment/FulfillmentClientUI";

export default async function FulfillmentPage() {
  const result = await getPendingShopifyOrdersAction();
  const pendingOrders = result.success ? result.data ?? [] : [];

  return <FulfillmentClientUI initialOrders={pendingOrders} />;
}
