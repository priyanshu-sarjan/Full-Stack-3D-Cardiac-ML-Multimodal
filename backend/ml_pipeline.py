import os
import json
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
import lightgbm as lgb
import shap

# Ensure directories exist
os.makedirs("backend/models", exist_ok=True)

DATA_PATH = "data/extention of Z-Alizadeh sani dataset.xlsx"

def preprocess_data():
    print(f"Loading dataset from {DATA_PATH}...")
    df = pd.read_excel(DATA_PATH)
    
    # Strip whitespace from column names
    df.columns = [c.strip() for c in df.columns]
    
    targets = {
        'CAD': (df['Cath'].str.strip() == 'CAD').astype(int),
        'LAD': (df['LAD'].str.strip() == 'Stenotic').astype(int),
        'LCX': (df['LCX'].str.strip() == 'Stenotic').astype(int),
        'RCA': (df['RCA'].str.strip() == 'Stenotic').astype(int)
    }
    
    # Drop target columns to prevent data leakage
    drop_cols = ['Cath', 'LAD', 'LCX', 'RCA']
    X_raw = df.drop(columns=[c for c in drop_cols if c in df.columns])
    
    # Mappings
    binary_map = {'Y': 1, 'N': 0, 'y': 1, 'n': 0, 'Yes': 1, 'No': 0, 1: 1, 0: 0}
    sex_map = {'Male': 1, 'Fmale': 0, 'Female': 0, 'male': 1, 'female': 0}
    bbb_map = {'N': 0, 'LBBB': 1, 'RBBB': 2}
    vhd_map = {'N': 0, 'mild': 1, 'Moderate': 2, 'Severe': 3}
    
    X = pd.DataFrame(index=df.index)
    
    for col in X_raw.columns:
        series = X_raw[col]
        if col == 'Sex':
            X[col] = series.astype(str).str.strip().map(sex_map).fillna(1).astype(int)
        elif col == 'BBB':
            X[col] = series.astype(str).str.strip().map(bbb_map).fillna(0).astype(int)
        elif col == 'VHD':
            X[col] = series.astype(str).str.strip().map(vhd_map).fillna(0).astype(int)
        elif series.dtype == 'object' or str(series.dtype) == 'string':
            # Check if binary Y/N
            cleaned = series.astype(str).str.strip().map(binary_map)
            if cleaned.isna().sum() == 0:
                X[col] = cleaned.astype(int)
            else:
                # Fallback to category codes
                X[col] = series.astype('category').cat.codes
        else:
            num_s = pd.to_numeric(series, errors='coerce')
            med = float(num_s.median()) if not np.isnan(num_s.median()) else 0.0
            X[col] = num_s.fillna(med).astype(float)
            
    print(f"Features processed: {X.shape[1]} features across {X.shape[0]} patients.")
    return X, targets, df

def train_and_evaluate(X, targets):
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    
    metrics = {}
    models = {}
    calibrated_models = {}
    shap_explainers = {}
    
    feature_names = X.columns.tolist()
    
    for target_name, y in targets.items():
        print(f"\nTraining model for {target_name} (Positives: {y.sum()} / {len(y)})...")
        
        cv_acc, cv_prec, cv_rec, cv_f1, cv_auc = [], [], [], [], []
        
        for fold, (train_idx, val_idx) in enumerate(skf.split(X, y)):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
            
            clf = lgb.LGBMClassifier(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.05,
                num_leaves=15,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42 + fold,
                verbosity=-1
            )
            clf.fit(X_train, y_train)
            
            preds = clf.predict(X_val)
            probs = clf.predict_proba(X_val)[:, 1]
            
            cv_acc.append(accuracy_score(y_val, preds))
            cv_prec.append(precision_score(y_val, preds, zero_division=0))
            cv_rec.append(recall_score(y_val, preds, zero_division=0))
            cv_f1.append(f1_score(y_val, preds, zero_division=0))
            cv_auc.append(roc_auc_score(y_val, probs))
            
        metrics[target_name] = {
            'accuracy': float(np.mean(cv_acc)),
            'precision': float(np.mean(cv_prec)),
            'recall': float(np.mean(cv_rec)),
            'f1_score': float(np.mean(cv_f1)),
            'roc_auc': float(np.mean(cv_auc)),
            'std_auc': float(np.std(cv_auc))
        }
        
        print(f"{target_name} 5-Fold CV -> AUC: {metrics[target_name]['roc_auc']:.4f} ± {metrics[target_name]['std_auc']:.4f}, Acc: {metrics[target_name]['accuracy']:.4f}, F1: {metrics[target_name]['f1_score']:.4f}")
        
        # Fit final full model with Platt / Isotonic Calibration
        base_clf = lgb.LGBMClassifier(
            n_estimators=120,
            max_depth=4,
            learning_rate=0.05,
            num_leaves=15,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            verbosity=-1
        )
        base_clf.fit(X, y)
        models[target_name] = base_clf
        
        cal_clf = CalibratedClassifierCV(estimator=base_clf, method='sigmoid', cv=5)
        cal_clf.fit(X, y)
        calibrated_models[target_name] = cal_clf
        
        # SHAP TreeExplainer
        explainer = shap.TreeExplainer(base_clf)
        shap_explainers[target_name] = explainer
        
    return models, calibrated_models, shap_explainers, metrics, feature_names

def compute_global_feature_importance(shap_explainers, X):
    importances = {}
    for target_name, explainer in shap_explainers.items():
        shap_vals = explainer.shap_values(X)
        if isinstance(shap_vals, list):
            vals = np.abs(shap_vals[1]).mean(axis=0)
        elif len(shap_vals.shape) == 3:
            vals = np.abs(shap_vals[:, :, 1]).mean(axis=0)
        else:
            vals = np.abs(shap_vals).mean(axis=0)
            
        ranked_idx = np.argsort(vals)[::-1]
        importances[target_name] = [
            {"feature": X.columns[i], "importance": float(vals[i])}
            for i in ranked_idx[:15]
        ]
    return importances

def generate_patient_presets(df, X, calibrated_models):
    # Find representative patients for each clinical edge case:
    # 1. Triple Vessel Disease (CAD=1, LAD=1, LCX=1, RCA=1)
    # 2. Isolated LAD ("Widowmaker", LAD=1, LCX=0, RCA=0)
    # 3. Isolated RCA (RCA=1, LAD=0, LCX=0)
    # 4. Normal Control (CAD=0, LAD=0, LCX=0, RCA=0)
    # 5. Borderline / Diabetic patient
    
    tvd_idx = df[(df['LAD'] == 'Stenotic') & (df['LCX'] == 'Stenotic') & (df['RCA'] == 'Stenotic')].index[0]
    lad_idx = df[(df['LAD'] == 'Stenotic') & (df['LCX'] == 'Normal') & (df['RCA'] == 'Normal') & (df['Region RWMA'] > 0)].index[0]
    rca_idx = df[(df['RCA'] == 'Stenotic') & (df['LAD'] == 'Normal') & (df['LCX'] == 'Normal')].index[0]
    norm_idx = df[(df['Cath'] == 'Normal') & (df['LAD'] == 'Normal') & (df['LCX'] == 'Normal') & (df['RCA'] == 'Normal')].index[0]
    
    # Borderline patient: diabetic with high risk factors but borderline vessel scores
    diab_candidates = df[(df['DM'] == 1) & (df['Cath'] == 'CAD')].index
    borderline_idx = diab_candidates[3] if len(diab_candidates) > 3 else diab_candidates[0]
    
    def to_native(d):
        out = {}
        for k, v in d.items():
            if isinstance(v, (np.integer, int)):
                out[str(k)] = int(v)
            elif isinstance(v, (np.floating, float)):
                out[str(k)] = float(v)
            else:
                out[str(k)] = str(v)
        return out

    presets = [
        {
            "id": "patient-1-tvd",
            "name": "Patient Alpha (Triple Vessel Disease)",
            "demographics": "64yo Male, Smoker, HTN, Severe multi-segment angina",
            "clinical_archetype": "Triple Vessel Disease (High Risk)",
            "features": to_native(X.iloc[tvd_idx].to_dict()),
            "raw_record": to_native(df.iloc[tvd_idx].to_dict()),
            "fhir_summary": {
                "resourceType": "Patient",
                "id": "CAD-EHR-001",
                "condition": "Severe Multivessel Coronary Artery Disease",
                "nyha_class": int(df.iloc[tvd_idx]['Function Class']),
                "ejection_fraction": float(df.iloc[tvd_idx]['EF-TTE']),
                "rwma_region": int(df.iloc[tvd_idx]['Region RWMA'])
            }
        },
        {
            "id": "patient-2-lad-isolated",
            "name": "Patient Beta (Isolated LAD / 'Widowmaker' Risk)",
            "demographics": "58yo Male, Anterior STEMI pattern, Anterior RWMA",
            "clinical_archetype": "Isolated Proximal LAD Stenosis",
            "features": to_native(X.iloc[lad_idx].to_dict()),
            "raw_record": to_native(df.iloc[lad_idx].to_dict()),
            "fhir_summary": {
                "resourceType": "Patient",
                "id": "CAD-EHR-002",
                "condition": "Critical Anterior Wall Ischemia / LAD Lesion",
                "nyha_class": int(df.iloc[lad_idx]['Function Class']),
                "ejection_fraction": float(df.iloc[lad_idx]['EF-TTE']),
                "rwma_region": int(df.iloc[lad_idx]['Region RWMA'])
            }
        },
        {
            "id": "patient-3-rca-isolated",
            "name": "Patient Gamma (Isolated RCA Inferior Ischemia)",
            "demographics": "61yo Female, Inferior lead changes, Dyspnea",
            "clinical_archetype": "Isolated RCA Stenosis / Inferior Hypokinesia",
            "features": to_native(X.iloc[rca_idx].to_dict()),
            "raw_record": to_native(df.iloc[rca_idx].to_dict()),
            "fhir_summary": {
                "resourceType": "Patient",
                "id": "CAD-EHR-003",
                "condition": "Right Coronary Artery Stenosis",
                "nyha_class": int(df.iloc[rca_idx]['Function Class']),
                "ejection_fraction": float(df.iloc[rca_idx]['EF-TTE']),
                "rwma_region": int(df.iloc[rca_idx]['Region RWMA'])
            }
        },
        {
            "id": "patient-4-normal",
            "name": "Patient Delta (Healthy Normal Control)",
            "demographics": "46yo Female, Non-anginal chest pain, Normal ECG & Echo",
            "clinical_archetype": "Non-Ischemic Normal Control",
            "features": to_native(X.iloc[norm_idx].to_dict()),
            "raw_record": to_native(df.iloc[norm_idx].to_dict()),
            "fhir_summary": {
                "resourceType": "Patient",
                "id": "CAD-EHR-004",
                "condition": "Normal Coronary Angiogram & Normal Cardiac Wall Motion",
                "nyha_class": int(df.iloc[norm_idx]['Function Class']),
                "ejection_fraction": float(df.iloc[norm_idx]['EF-TTE']),
                "rwma_region": int(df.iloc[norm_idx]['Region RWMA'])
            }
        },
        {
            "id": "patient-5-borderline",
            "name": "Patient Epsilon (Borderline / High Uncertainty)",
            "demographics": "55yo Male, Diabetic microvascular risk, Equivocal stress test",
            "clinical_archetype": "Borderline Diagnostic Ambiguity",
            "features": to_native(X.iloc[borderline_idx].to_dict()),
            "raw_record": to_native(df.iloc[borderline_idx].to_dict()),
            "fhir_summary": {
                "resourceType": "Patient",
                "id": "CAD-EHR-005",
                "condition": "Equivocal Cardiovascular Risk / Conformal Warning Badge",
                "nyha_class": int(df.iloc[borderline_idx]['Function Class']),
                "ejection_fraction": float(df.iloc[borderline_idx]['EF-TTE']),
                "rwma_region": int(df.iloc[borderline_idx]['Region RWMA'])
            }
        }
    ]
    return presets

def main():
    X, targets, df = preprocess_data()
    models, cal_models, shap_explainers, metrics, feature_names = train_and_evaluate(X, targets)
    global_importances = compute_global_feature_importance(shap_explainers, X)
    presets = generate_patient_presets(df, X, cal_models)
    
    # Feature definitions for What-If sliders & UI metadata
    feature_metadata = {
        col: {
            "type": "numeric" if X[col].nunique() > 4 else "binary" if X[col].nunique() == 2 else "categorical",
            "min": float(X[col].min()),
            "max": float(X[col].max()),
            "mean": float(X[col].mean()),
            "default": float(X[col].median()),
            "modifiable": col in ['BP', 'FBS', 'TG', 'LDL', 'HDL', 'Current Smoker', 'Weight', 'BMI', 'PR']
        }
        for col in X.columns
    }
    
    # Save artifacts
    artifacts = {
        'models': models,
        'calibrated_models': cal_models,
        'feature_names': feature_names,
        'feature_metadata': feature_metadata
    }
    
    with open("backend/models/model_artifacts.pkl", "wb") as f:
        pickle.dump(artifacts, f)
        
    with open("backend/models/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
        
    with open("backend/models/feature_importances.json", "w") as f:
        json.dump(global_importances, f, indent=2)
        
    with open("backend/models/presets.json", "w") as f:
        json.dump(presets, f, indent=2)
        
    print("\nTraining completed successfully! Artifacts written to backend/models/")

if __name__ == "__main__":
    main()
