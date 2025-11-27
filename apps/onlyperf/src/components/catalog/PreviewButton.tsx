import { Button } from "@/components/ui/button";

interface PreviewButtonProps {
  onClick: () => void;
}

export function PreviewButton({ onClick }: PreviewButtonProps) {
  return (
    <div className="absolute bottom-4 left-4 right-4 hidden lg:block">
      <Button
        variant="secondary"
        onClick={onClick}
        className="w-full bg-white text-black hover:bg-gray-100 rounded-none h-auto py-2 px-4 text-sm font-normal"
      >
        Xem trước
      </Button>
    </div>
  );
}
