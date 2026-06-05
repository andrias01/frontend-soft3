export interface RecipeProductItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface RecipeSubRecipeItem {
  subRecipeId: string;
  quantity: number;
}

export interface RecipeResponse {
  id: string;
  name: string;
  categoryId: string;
  locationId: string;
  products: RecipeProductItem[];
  subRecipes: RecipeSubRecipeItem[];
  baseCost: number;
  profitMargin: number;
  sellingPrice: number;
  visibleInMenu: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeRequest {
  name: string;
  categoryId: string;
  products: RecipeProductItem[];
  subRecipes: RecipeSubRecipeItem[];
  profitMargin: number;
  visibleInMenu: boolean;
  active: boolean;
}

export interface ApiError {
  error: string;
  message: string;
  timestamp: string;
}
