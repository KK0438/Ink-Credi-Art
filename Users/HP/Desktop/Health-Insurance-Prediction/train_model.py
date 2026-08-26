import json
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.tree import DecisionTreeRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error

def generate_insurance_dataset(n_samples=1338, random_state=42):
    """Generates synthetic dataset following standard Medical Cost Personal dataset distribution."""
    np.random.seed(random_state)
    
    age = np.random.randint(18, 65, n_samples)
    sex = np.random.choice(['female', 'male'], n_samples, p=[0.495, 0.505])
    bmi = np.random.normal(30.6, 6.1, n_samples)
    bmi = np.clip(bmi, 15.0, 53.1)
    children = np.random.choice([0, 1, 2, 3, 4, 5], n_samples, p=[0.42, 0.24, 0.18, 0.12, 0.03, 0.01])
    smoker = np.random.choice(['yes', 'no'], n_samples, p=[0.205, 0.795])
    region = np.random.choice(['southwest', 'southeast', 'northwest', 'northeast'], n_samples)
    
    # Calculate base charges matching insurance distribution
    charges = []
    for i in range(n_samples):
        # Base fee
        c = 2500.0 + (age[i] * 250.0) + (children[i] * 450.0)
        
        # BMI effect
        if bmi[i] > 25.0:
            c += (bmi[i] - 25.0) * 120.0
            
        # Smoker interaction (Huge non-linear jump for obese smokers)
        if smoker[i] == 'yes':
            if bmi[i] >= 30.0:
                c += 30000.0 + (bmi[i] - 30.0) * 350.0 + (age[i] * 120.0)
            else:
                c += 14000.0 + (age[i] * 80.0)
                
        # Regional slight variation
        if region[i] == 'southeast':
            c += 500.0
        elif region[i] == 'northeast':
            c += 300.0
            
        # Random noise (~10%)
        noise = np.random.normal(0, 1100.0)
        c = max(1121.87, c + noise)
        charges.append(round(c, 2))
        
    df = pd.DataFrame({
        'age': age,
        'sex': sex,
        'bmi': np.round(bmi, 1),
        'children': children,
        'smoker': smoker,
        'region': region,
        'charges': charges
    })
    return df

def feature_engineering(df):
    """Engineers domain-specific features for medical insurance prediction."""
    data = df.copy()
    
    # 1. BMI Categories
    data['bmi_category'] = pd.cut(
        data['bmi'], 
        bins=[0, 18.5, 24.9, 29.9, 100], 
        labels=['underweight', 'normal', 'overweight', 'obese']
    )
    
    # 2. Smoker * BMI Interaction (Key non-linear risk factor)
    data['smoker_numeric'] = (data['smoker'] == 'yes').astype(int)
    data['is_obese'] = (data['bmi'] >= 30.0).astype(int)
    data['smoker_bmi_interaction'] = data['smoker_numeric'] * data['bmi']
    data['smoker_obese_interaction'] = data['smoker_numeric'] * data['is_obese']
    
    # 3. Age Brackets
    data['age_group'] = pd.cut(
        data['age'],
        bins=[0, 35, 50, 100],
        labels=['young', 'middle', 'senior']
    )
    
    # 4. Composite Health Risk Score (0 to 10 scale)
    data['risk_score'] = (
        (data['age'] > 45).astype(int) * 2 +
        (data['bmi'] >= 30.0).astype(int) * 3 +
        (data['smoker'] == 'yes').astype(int) * 4 +
        (data['children'] >= 3).astype(int) * 1
    )
    
    return data

def train_and_evaluate():
    print("Generating dataset...")
    df = generate_insurance_dataset(1338, random_state=42)
    df.to_csv('insurance_dataset.csv', index=False)
    print(f"Dataset saved. Shape: {df.shape}")
    
    print("\nPerforming Feature Engineering...")
    df_fe = feature_engineering(df)
    
    # Features and Target
    X = df_fe.drop(columns=['charges'])
    y = df_fe['charges']
    
    # Log transformation on target to stabilize variance
    y_log = np.log(y)
    
    # Train-test split (80-20)
    X_train, X_test, y_train, y_test, y_train_log, y_test_log = train_test_split(
        X, y, y_log, test_size=0.2, random_state=42
    )
    
    print(f"Train samples: {len(X_train)}, Test samples: {len(X_test)}")
    
    # Numerical and Categorical feature columns
    num_cols = ['age', 'bmi', 'children', 'smoker_bmi_interaction', 'smoker_obese_interaction', 'risk_score']
    cat_cols = ['sex', 'smoker', 'region', 'bmi_category', 'age_group']
    
    # Preprocessor definition
    preprocessor = ColumnTransformer(
        transformers=[
            ('num', StandardScaler(), num_cols),
            ('cat', OneHotEncoder(drop='first', handle_unknown='ignore'), cat_cols)
        ]
    )
    
    # Fit preprocessor on training data ONLY
    X_train_prep = preprocessor.fit_transform(X_train)
    X_test_prep = preprocessor.transform(X_test)
    
    # Feature Names after OneHotEncoding
    cat_encoder = preprocessor.named_transformers_['cat']
    encoded_cat_names = cat_encoder.get_feature_names_out(cat_cols)
    feature_names = num_cols + list(encoded_cat_names)
    
    # Model Dictionary
    models = {
        'Linear Regression': LinearRegression(),
        'Ridge Regression': Ridge(alpha=10.0),
        'Decision Tree': DecisionTreeRegressor(max_depth=5, random_state=42),
        'Random Forest (Default)': RandomForestRegressor(n_estimators=100, random_state=42),
        'Gradient Boosting': GradientBoostingRegressor(n_estimators=100, learning_rate=0.08, max_depth=3, random_state=42)
    }
    
    results = {}
    test_predictions = {}
    
    print("\n--- Model Baseline Evaluation ---")
    for name, model in models.items():
        model.fit(X_train_prep, y_train_log)
        preds_log = model.predict(X_test_prep)
        preds = np.exp(preds_log)
        
        r2 = r2_score(y_test, preds)
        mae = mean_absolute_error(y_test, preds)
        rmse = np.sqrt(mean_squared_error(y_test, preds))
        mape = np.mean(np.abs((y_test - preds) / y_test)) * 100
        
        results[name] = {
            'R2_Score': round(r2, 4),
            'MAE': round(mae, 2),
            'RMSE': round(rmse, 2),
            'MAPE': round(mape, 2)
        }
        print(f"[{name}] R2: {r2*100:.2f}%, MAE: ${mae:.2f}, RMSE: ${rmse:.2f}, MAPE: {mape:.2f}%")
        
    print("\n--- Hyperparameter Tuning Random Forest (GridSearchCV) ---")
    rf_param_grid = {
        'n_estimators': [100, 200, 300],
        'max_depth': [4, 6, 8, 10, None],
        'min_samples_split': [2, 5, 10],
        'min_samples_leaf': [1, 2, 4],
        'max_features': ['sqrt', 1.0]
    }
    
    rf_grid = GridSearchCV(
        RandomForestRegressor(random_state=42),
        rf_param_grid,
        cv=5,
        scoring='r2',
        n_jobs=-1,
        verbose=1
    )
    rf_grid.fit(X_train_prep, y_train_log)
    
    best_rf = rf_grid.best_estimator_
    best_rf_preds_log = best_rf.predict(X_test_prep)
    best_rf_preds = np.exp(best_rf_preds_log)
    
    best_rf_r2 = r2_score(y_test, best_rf_preds)
    best_rf_mae = mean_absolute_error(y_test, best_rf_preds)
    best_rf_rmse = np.sqrt(mean_squared_error(y_test, best_rf_preds))
    best_rf_mape = np.mean(np.abs((y_test - best_rf_preds) / y_test)) * 100
    
    print(f"\nBest RF Params: {rf_grid.best_params_}")
    print(f"Tuned Random Forest R2: {best_rf_r2*100:.2f}%, MAE: ${best_rf_mae:.2f}, RMSE: ${best_rf_rmse:.2f}")
    
    results['Random Forest (Tuned)'] = {
        'R2_Score': round(best_rf_r2, 4),
        'MAE': round(best_rf_mae, 2),
        'RMSE': round(best_rf_rmse, 2),
        'MAPE': round(best_rf_mape, 2)
    }
    
    # Feature Importances from Best RF
    importances = best_rf.feature_importances_
    fi_df = pd.DataFrame({'feature': feature_names, 'importance': importances})
    fi_df = fi_df.sort_values(by='importance', ascending=False)
    
    # Test Predictions vs Actual for visualization
    sample_vis = pd.DataFrame({
        'actual': y_test.values[:50],
        'predicted': best_rf_preds[:50],
        'smoker': X_test['smoker'].values[:50],
        'bmi': X_test['bmi'].values[:50],
        'age': X_test['age'].values[:50]
    }).to_dict(orient='records')
    
    output_data = {
        'metrics': results,
        'best_params': rf_grid.best_params_,
        'feature_importances': fi_df.to_dict(orient='records'),
        'sample_predictions': sample_vis,
        'summary': {
            'train_size': len(X_train),
            'test_size': len(X_test),
            'top_model': 'Random Forest (Tuned)',
            'accuracy_percentage': round(best_rf_r2 * 100, 2)
        }
    }
    
    with open('model_results.json', 'w') as f:
        json.dump(output_data, f, indent=2)
        
    print("\nModel training and hyperparameter tuning finished successfully! Exported to 'model_results.json'.")

if __name__ == '__main__':
    train_and_evaluate()
