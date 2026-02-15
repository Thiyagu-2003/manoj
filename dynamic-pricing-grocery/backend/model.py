import pandas as pd
import numpy as np
import pickle
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import os

# Load data
data_path = os.path.join(os.path.dirname(__file__), 'data', 'groceries.csv')
df = pd.read_csv(data_path)

# Feature engineering for dynamic pricing
# Features: demand (sales_7/stock), inventory level, sales trend, day of week
df['demand_ratio'] = df['sales_7'] / (df['stock'] + 1)  # Avoid division by zero
df['inventory_level'] = df['stock'] / (df['stock'].max())  # Normalize inventory
df['sales_trend'] = df['sales_30'] / (df['sales_7'] + 1)  # Trend: monthly vs weekly
df['popularity'] = df['sales_30'] / (df['base_price'] * df['stock'] + 1)  # Popularity metric
df['scarcity'] = 1 / (df['stock'] + 1)  # Scarcity factor

# Prepare features and target
X = df[['demand_ratio', 'inventory_level', 'sales_trend', 'popularity', 'scarcity', 'day']]
y = df['base_price']

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Scale features
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Train Random Forest model for price prediction
model = RandomForestRegressor(
    n_estimators=100,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1
)

model.fit(X_train_scaled, y_train)

# Evaluate model
train_score = model.score(X_train_scaled, y_train)
test_score = model.score(X_test_scaled, y_test)

print(f"Training R² Score: {train_score:.4f}")
print(f"Testing R² Score: {test_score:.4f}")
print(f"Feature Importance: {dict(zip(X.columns, model.feature_importances_))}")

# Save model and scaler
model_path = os.path.join(os.path.dirname(__file__), 'pricing_model.pkl')
scaler_path = os.path.join(os.path.dirname(__file__), 'scaler.pkl')

with open(model_path, 'wb') as f:
    pickle.dump(model, f)

with open(scaler_path, 'wb') as f:
    pickle.dump(scaler, f)

print(f"\nModel saved to {model_path}")
print(f"Scaler saved to {scaler_path}")
