from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import pickle
import os
from typing import List, Optional

# Initialize FastAPI app
app = FastAPI(
    title="Dynamic Pricing API",
    description="AI-powered dynamic pricing for grocery products",
    version="1.0.0"
)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define data models
class Product(BaseModel):
    product_id: int
    name: str
    category: str
    base_price: float
    stock: int
    dynamic_price: float
    discount_percent: float
    demand_level: str

class PricingRequest(BaseModel):
    demand_ratio: float
    inventory_level: float
    sales_trend: float
    popularity: float
    scarcity: float
    day: int

# Load data and models at startup
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, 'data', 'groceries.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'pricing_model.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')

# Load CSV data
df = pd.read_csv(DATA_PATH)

# Load trained model and scaler
try:
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    with open(SCALER_PATH, 'rb') as f:
        scaler = pickle.load(f)
except FileNotFoundError:
    print("Warning: Model files not found. Please run model.py first to train the model.")
    model = None
    scaler = None

def calculate_dynamic_price(product_id: int) -> dict:
    """Calculate dynamic price for a product based on ML model"""
    product = df[df['product_id'] == product_id]
    
    if product.empty:
        return None
    
    product = product.iloc[0]
    base_price = product['base_price']
    
    # Calculate features
    demand_ratio = product['sales_7'] / (product['stock'] + 1)
    inventory_level = product['stock'] / (df['stock'].max())
    sales_trend = product['sales_30'] / (product['sales_7'] + 1)
    popularity = product['sales_30'] / (base_price * product['stock'] + 1)
    scarcity = 1 / (product['stock'] + 1)
    
    # Predict dynamic price using ML model
    if model and scaler:
        features = np.array([[demand_ratio, inventory_level, sales_trend, popularity, scarcity, product['day']]])
        features_scaled = scaler.transform(features)
        predicted_price = model.predict(features_scaled)[0]
    else:
        # Fallback to simple formula if model not available
        predicted_price = base_price * (1 + (demand_ratio * 0.3) - (inventory_level * 0.2))
    
    # Ensure price is reasonable (between 50% and 150% of base price)
    predicted_price = np.clip(predicted_price, base_price * 0.5, base_price * 1.5)
    
    # Calculate discount/markup percentage
    discount_percent = ((predicted_price - base_price) / base_price) * 100
    
    # Determine demand level
    if demand_ratio > 2:
        demand_level = "High"
    elif demand_ratio > 1:
        demand_level = "Medium"
    else:
        demand_level = "Low"
    
    return {
        'base_price': float(base_price),
        'dynamic_price': float(round(predicted_price, 2)),
        'discount_percent': float(round(discount_percent, 2)),
        'demand_level': demand_level,
        'demand_ratio': float(round(demand_ratio, 2)),
        'stock': int(product['stock'])
    }

# API Endpoints

@app.get("/", tags=["Health"])
def read_root():
    """Health check endpoint"""
    return {
        "status": "success",
        "message": "Dynamic Pricing API is running",
        "version": "1.0.0"
    }

@app.get("/api/products", response_model=List[Product], tags=["Products"])
def get_all_products():
    """Get all products with dynamic pricing"""
    products = []
    for _, row in df.iterrows():
        pricing = calculate_dynamic_price(int(row['product_id']))
        if pricing:
            products.append(Product(
                product_id=int(row['product_id']),
                name=row['name'],
                category=row['category'],
                base_price=pricing['base_price'],
                stock=pricing['stock'],
                dynamic_price=pricing['dynamic_price'],
                discount_percent=pricing['discount_percent'],
                demand_level=pricing['demand_level']
            ))
    return products

@app.get("/api/products/{product_id}", tags=["Products"])
def get_product(product_id: int):
    """Get a specific product with dynamic pricing"""
    product = df[df['product_id'] == product_id]
    
    if product.empty:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    
    product = product.iloc[0]
    pricing = calculate_dynamic_price(product_id)
    
    return {
        "product_id": int(product['product_id']),
        "name": product['name'],
        "category": product['category'],
        "base_price": pricing['base_price'],
        "dynamic_price": pricing['dynamic_price'],
        "discount_percent": pricing['discount_percent'],
        "demand_level": pricing['demand_level'],
        "demand_ratio": pricing['demand_ratio'],
        "stock": pricing['stock'],
        "sales_7_days": int(product['sales_7']),
        "sales_30_days": int(product['sales_30'])
    }

@app.get("/api/products/category/{category}", tags=["Products"])
def get_products_by_category(category: str):
    """Get all products in a specific category with dynamic pricing"""
    products_in_category = df[df['category'].str.lower() == category.lower()]
    
    if products_in_category.empty:
        raise HTTPException(status_code=404, detail=f"Category {category} not found")
    
    products = []
    for _, row in products_in_category.iterrows():
        pricing = calculate_dynamic_price(int(row['product_id']))
        if pricing:
            products.append(Product(
                product_id=int(row['product_id']),
                name=row['name'],
                category=row['category'],
                base_price=pricing['base_price'],
                stock=pricing['stock'],
                dynamic_price=pricing['dynamic_price'],
                discount_percent=pricing['discount_percent'],
                demand_level=pricing['demand_level']
            ))
    return products

@app.get("/api/categories", tags=["Products"])
def get_categories():
    """Get all unique product categories"""
    categories = df['category'].unique().tolist()
    return {
        "categories": sorted(categories),
        "total": len(categories)
    }

@app.post("/api/price-prediction", tags=["Pricing"])
def predict_price(request: PricingRequest):
    """Predict price based on custom features"""
    if not model or not scaler:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    features = np.array([[
        request.demand_ratio,
        request.inventory_level,
        request.sales_trend,
        request.popularity,
        request.scarcity,
        request.day
    ]])
    
    features_scaled = scaler.transform(features)
    predicted_price = model.predict(features_scaled)[0]
    
    return {
        "predicted_price": float(round(predicted_price, 2)),
        "confidence": "high"
    }

@app.get("/api/insights", tags=["Analytics"])
def get_insights():
    """Get market insights and statistics"""
    
    # Top 10 high-demand products
    df['demand_ratio'] = df['sales_7'] / (df['stock'] + 1)
    top_demand = df.nlargest(10, 'demand_ratio')[['product_id', 'name', 'demand_ratio']].to_dict('records')
    
    # Low stock alerts (< 10 items)
    low_stock = df[df['stock'] < 10][['product_id', 'name', 'stock']].to_dict('records')
    
    # Category statistics
    category_stats = df.groupby('category').agg({
        'product_id': 'count',
        'base_price': 'mean',
        'stock': 'sum',
        'sales_7': 'sum'
    }).rename(columns={'product_id': 'product_count'}).to_dict('index')
    
    return {
        "total_products": len(df),
        "total_stock": int(df['stock'].sum()),
        "total_sales_7days": int(df['sales_7'].sum()),
        "total_sales_30days": int(df['sales_30'].sum()),
        "average_price": float(round(df['base_price'].mean(), 2)),
        "top_demand_products": top_demand,
        "low_stock_alerts": low_stock,
        "category_statistics": category_stats
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
