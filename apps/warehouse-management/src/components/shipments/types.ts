export interface ProductLineItem {
  id: string;
  brand: string;
  model: string;
  quantity: number;
}

export interface ShipmentFormData {
  receiptNumber: string;
  receiptDate: string;
  supplierName: string;
  items: ProductLineItem[];
}

export interface Brand {
  id: string;
  name: string;
}

export interface Model {
  id: string;
  name: string;
}

// Mock data
export const mockBrands: Brand[] = [
  { id: '1', name: 'Nike' },
  { id: '2', name: 'Adidas' },
  { id: '3', name: 'Puma' },
  { id: '4', name: 'Reebok' },
  { id: '5', name: 'New Balance' },
  { id: '6', name: 'Converse' },
  { id: '7', name: 'Vans' },
  { id: '8', name: 'Under Armour' },
];

export const mockModels: Record<string, Model[]> = {
  '1': [
    { id: '1-1', name: 'Air Max 90' },
    { id: '1-2', name: 'Air Force 1' },
    { id: '1-3', name: 'Blazer Mid' },
    { id: '1-4', name: 'Jordan 1' },
    { id: '1-5', name: 'Dunk Low' },
  ],
  '2': [
    { id: '2-1', name: 'Ultraboost' },
    { id: '2-2', name: 'Stan Smith' },
    { id: '2-3', name: 'Superstar' },
    { id: '2-4', name: 'NMD R1' },
    { id: '2-5', name: 'Yeezy 350' },
  ],
  '3': [
    { id: '3-1', name: 'Suede Classic' },
    { id: '3-2', name: 'RS-X' },
    { id: '3-3', name: 'Future Rider' },
    { id: '3-4', name: 'Clyde' },
  ],
  '4': [
    { id: '4-1', name: 'Classic Leather' },
    { id: '4-2', name: 'Club C' },
    { id: '4-3', name: 'Nano X' },
    { id: '4-4', name: 'Zig Kinetica' },
  ],
  '5': [
    { id: '5-1', name: '574' },
    { id: '5-2', name: '990' },
    { id: '5-3', name: 'Fresh Foam' },
    { id: '5-4', name: '327' },
  ],
  '6': [
    { id: '6-1', name: 'Chuck Taylor All Star' },
    { id: '6-2', name: 'Chuck 70' },
    { id: '6-3', name: 'One Star' },
    { id: '6-4', name: 'Run Star Hike' },
  ],
  '7': [
    { id: '7-1', name: 'Old Skool' },
    { id: '7-2', name: 'Sk8-Hi' },
    { id: '7-3', name: 'Authentic' },
    { id: '7-4', name: 'Era' },
  ],
  '8': [
    { id: '8-1', name: 'Curry Flow' },
    { id: '8-2', name: 'HOVR Phantom' },
    { id: '8-3', name: 'Charged Assert' },
    { id: '8-4', name: 'Project Rock' },
  ],
};