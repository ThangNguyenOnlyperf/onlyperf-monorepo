import OutboundClientUI from '~/components/outbound/OutboundClientUI';

export default function OutboundPage() {
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Xuất kho - Bán hàng
        </h1>
        <p className="text-muted-foreground mt-2">
          Quét mã QR sản phẩm để thêm vào giỏ hàng và xử lý đơn hàng
        </p>
      </div>
      
      <OutboundClientUI />
    </div>
  );
}