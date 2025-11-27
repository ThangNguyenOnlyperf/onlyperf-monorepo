import { GalleryClient, type GalleryItem } from "./GalleryClient";

export type { GalleryItem };

interface GalleryProps {
  items: GalleryItem[];
  className?: string;
}

export default function Gallery(props: GalleryProps) {
  return <GalleryClient {...props} />;
}
