export interface Flower {
  id?: number;
  name: string;
  meaning: string;
  availablity: string; // Keep original spelling for existing data
  info: string;
  color: string;
  price: number;
  imageUrl: string;
}

export interface FlowerCreateRequest {
  name: string;
  meaning: string;
  availability: string; // Correct spelling for API
  info: string;
  color: string;
  price: number;
  imageUrl: string;
}

export interface CartItem {
  flower: Flower;
  quantity: number;
}
