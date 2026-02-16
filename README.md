# 🛒 Dynamic Pricing Grocery Store

An AI-powered dynamic pricing system for online grocery retail. The system uses machine learning to automatically adjust product prices based on demand, inventory levels, and market trends.

## 🌟 Features

- **AI-Powered Dynamic Pricing**: Machine learning model that predicts optimal prices based on:
  - Product demand (7-day and 30-day sales)
  - Current inventory levels
  - Sales trends
  - Product popularity
  - Scarcity factor

- **Real-time Price Updates**: Prices adjust dynamically based on market conditions
- **200+ Product Catalog**: Comprehensive grocery database with 200 products across 15+ categories
- **Interactive Frontend**: Modern, responsive web interface with:
  - Product search and filtering
  - Category-based browsing
  - Real-time pricing display
  - Stock status indicators
  - Market insights dashboard

- **RESTful API**: Complete API for all pricing and product operations
- **Low Stock Alerts**: Automatic alerts for products running low on inventory
- **Analytics Dashboard**: Market insights including top-demand products and category statistics

## 📁 Project Structure

```
dynamic-pricing-grocery/
├── backend/
│   ├── app.py                  # FastAPI server with API endpoints
│   ├── model.py                # ML model training script
│   ├── pricing_model.pkl       # Trained ML model (generated after running model.py)
│   ├── scaler.pkl              # Feature scaler (generated after running model.py)
│   ├── data/
│   │   └── groceries.csv       # 200-item grocery database
│   └── requirements.txt        # Python dependencies
│
├── frontend/
│   ├── index.html              # Main web interface
│   ├── style.css               # Styling and responsive design
│   └── script.js               # Frontend logic and API integration
│
└── README.md                   # This file
```

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Backend Setup

1. **Clone or navigate to the project directory**:
   ```bash
   cd dynamic-pricing-grocery/backend
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Train the ML model** (only needs to be done once):
   ```bash
   python model.py
   ```
   This will:
   - Load the 200-item grocery database
   - Extract features for dynamic pricing
   - Train a Random Forest model
   - Save the trained model to `pricing_model.pkl`
   - Save the feature scaler to `scaler.pkl`

4. **Start the FastAPI server**:
   ```bash
   python app.py
   ```
   The server will start at: `http://127.0.0.1:8000`

   You can also use:
   ```bash
   uvicorn app:app --reload
   ```

5. **Verify the API is running**:
   - Visit `http://127.0.0.1:8000/docs` for interactive API documentation (Swagger UI)
   - Or test directly: `http://127.0.0.1:8000` should return status message

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd dynamic-pricing-grocery/frontend
   ```

2. **Open the web interface**:
   - Option 1: Simply open `index.html` in your web browser
   - Option 2: Use a local web server:
     ```bash
     # Using Python 3
     python -m http.server 8080
     ```
   Then visit: `http://localhost:8080`

## 📊 API Endpoints

### Health & Information
- `GET /` - API health check
- `GET /api/categories` - Get all product categories

### Products
- `GET /api/products` - Get all products with dynamic pricing
- `GET /api/products/{product_id}` - Get specific product details
- `GET /api/products/category/{category}` - Get products by category

### Pricing & Analytics
- `POST /api/price-prediction` - Predict price based on custom features
- `GET /api/insights` - Get market analytics and insights

### Interactive API Documentation
After starting the backend, visit: `http://127.0.0.1:8000/docs`

## 🤖 How the ML Model Works

### Feature Engineering
The model uses five key features:
1. **Demand Ratio**: 7-day sales / current stock
2. **Inventory Level**: Normalized stock level (0-1)
3. **Sales Trend**: 30-day sales / 7-day sales
4. **Popularity**: Sales volume relative to price
5. **Scarcity**: Inverse of stock level

### Model Architecture
- **Algorithm**: Random Forest Regressor (100 trees)
- **Training Data**: 200 grocery products with historical sales data
- **Train/Test Split**: 80/20
- **Output**: Predicted optimal price

### Price Adjustment Strategy
- High demand products → Price increases (up to 50% above base)
- Low stock items → Price increases to maximize revenue
- Oversaturated products → Price decreases (down to 50% below base)
- Price range: Base price ± 50%

## 🎨 Frontend Features

### Product Browsing
- View all 200 products with real-time dynamic prices
- Search products by name or category
- Filter by product category
- Sort by: name, price, demand, or stock

### Pricing Display
- Base price (original cost)
- Dynamic price (AI-calculated)
- Price change percentage (+/-)
- Demand level indicator (High/Medium/Low)
- Stock availability status

### Dashboard Insights
- Total products in catalog
- Total inventory available
- 7-day sales volume
- Average product price
- Low stock alerts
- Top-demand products

### Responsive Design
- Desktop optimized
- Tablet friendly
- Mobile responsive
- Smooth animations and transitions

## 🔧 Configuration & Customization

### Adjusting Model Behavior

Edit `backend/model.py` to modify:
- Number of trees: `n_estimators=100`
- Tree depth: `max_depth=15`
- Feature importance weights

### Changing Price Bounds

In `backend/app.py`, modify:
```python
# Adjust price bounds (currently 50% to 150% of base price)
predicted_price = np.clip(predicted_price, base_price * 0.5, base_price * 1.5)
```

### Customizing Frontend

- Edit `frontend/style.css` for colors and layout
- Modify `frontend/script.js` for API calls and logic
- Update product cards in `createProductCard()` function

## 📈 Data Structure

### CSV Format (groceries.csv)
```csv
product_id,name,category,base_price,stock,sales_7,sales_30,day
1,Rice,Grains,50,20,30,120,2
```

**Columns**:
- `product_id`: Unique identifier
- `name`: Product name
- `category`: Product category
- `base_price`: Original/cost price in rupees
- `stock`: Current inventory units
- `sales_7`: Units sold in 7 days
- `sales_30`: Units sold in 30 days
- `day`: Day of week (1-7)

## 🐛 Troubleshooting

### "API Connection Failed"
- Ensure backend is running: `python app.py`
- Check if port 8000 is already in use
- Try running on a different port: `uvicorn app:app --port 8001`

### "Model files not found"
- Run `python model.py` in the backend directory
- Ensure CSV file exists at `backend/data/groceries.csv`

### CORS Errors
- Check that CORS middleware is enabled in `app.py`
- Frontend and backend should be on different ports

### Slow Performance
- Increase model training data
- Optimize feature calculations
- Consider caching API responses

## 📝 API Usage Examples

### Get All Products
```bash
curl http://127.0.0.1:8000/api/products
```

### Get Specific Product
```bash
curl http://127.0.0.1:8000/api/products/1
```

### Get Products by Category
```bash
curl http://127.0.0.1:8000/api/products/category/Dairy
```

### Get Market Insights
```bash
curl http://127.0.0.1:8000/api/insights
```

## 📊 Sample Output

### Product Card Example
```json
{
  "product_id": 1,
  "name": "Rice",
  "category": "Grains",
  "base_price": 50,
  "dynamic_price": 52.50,
  "discount_percent": 5.0,
  "demand_level": "High",
  "stock": 20
}
```

## 🎯 Future Enhancements

- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] User authentication and shopping cart
- [ ] Order history and recommendations
- [ ] Real-time WebSocket updates
- [ ] Admin dashboard for price management
- [ ] Competitor price tracking
- [ ] Customer review integration
- [ ] Payment gateway integration
- [ ] Inventory management system
- [ ] Advanced analytics and reporting

## 📚 Technology Stack

### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn
- **ML**: Scikit-learn
- **Data**: Pandas, NumPy
- **API**: RESTful with CORS support

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Responsive grid layout
- **JavaScript**: Vanilla JS (no frameworks)
- **Styling**: Modern gradients and animations

## 📄 License

This project is open source and available for educational and commercial use.

## 👤 Author

Dynamic Pricing Grocery System v1.0
Created as a complete e-commerce solution with AI-driven pricing.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest improvements
- Add new features
- Optimize code

## 📞 Support

For questions or issues:
1. Check the Troubleshooting section
2. Review API documentation at `/docs`
3. Examine the code comments

---

**Happy Shopping with Dynamic Pricing! 🛒✨**
