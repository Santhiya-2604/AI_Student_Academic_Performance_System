
import os
import re
import glob
import joblib
import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import (
    LabelEncoder,
    OneHotEncoder,
    StandardScaler,
)
from sklearn.impute import SimpleImputer
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

from ml.preprocessing import preprocess_dataset


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(BASE_DIR)

DATASET_DIR = os.path.join(
    BACKEND_DIR,
    "data",
    "datasets",
)

MODEL_DIR = os.path.join(
    BASE_DIR,
    "models",
)

os.makedirs(MODEL_DIR, exist_ok=True)


# ============================================================
# DATASET MODEL KEY
# Must match predict.py
# ============================================================

def dataset_key(file_path):
    """
    Create a consistent model key from a dataset filename.

    Example:
        Student Performance.csv -> student_performance

    Training and prediction must use the same key.
    """

    name = os.path.splitext(
        os.path.basename(str(file_path))
    )[0]

    key = re.sub(
        r"[^a-zA-Z0-9_-]+",
        "_",
        name,
    ).strip("_").lower()

    if not key:
        raise ValueError(
            "Cannot create a model key from this dataset filename."
        )

    return key


def get_unique_model_key(file_path):
    """
    Compatibility helper.

    Keep the canonical filename-based key so predict.py can
    locate the model using the dataset filename.
    """

    return dataset_key(file_path)


# ============================================================
# BUILD FEATURE PREPROCESSOR
# ============================================================

def build_preprocessor(X):
    if X is None or X.empty:
        raise ValueError(
            "Training features are empty."
        )

    numeric_columns = X.select_dtypes(
        include=["number", "bool"]
    ).columns.tolist()

    categorical_columns = [
        column
        for column in X.columns
        if column not in numeric_columns
    ]

    transformers = []

    # Numeric columns
    if numeric_columns:
        numeric_pipeline = Pipeline([
            (
                "imputer",
                SimpleImputer(strategy="median"),
            ),
            (
                "scaler",
                StandardScaler(),
            ),
        ])

        transformers.append((
            "numeric",
            numeric_pipeline,
            numeric_columns,
        ))

    # Categorical columns
    if categorical_columns:
        categorical_pipeline = Pipeline([
            (
                "imputer",
                SimpleImputer(strategy="most_frequent"),
            ),
            (
                "encoder",
                OneHotEncoder(
                    handle_unknown="ignore",
                ),
            ),
        ])

        transformers.append((
            "categorical",
            categorical_pipeline,
            categorical_columns,
        ))

    if not transformers:
        raise ValueError(
            "No usable numeric or categorical features found."
        )

    return ColumnTransformer(
        transformers=transformers,
        remainder="drop",
    )


# ============================================================
# TRAIN ONE DATASET
# ============================================================

def train_dataset(file_path):
    """
    Train and save a classification model for one CSV dataset.

    Raises an exception when training fails, allowing Flask
    endpoints to report the failure instead of silently
    continuing as though training succeeded.
    """

    if not os.path.isfile(file_path):
        raise FileNotFoundError(
            f"Dataset file not found: {file_path}"
        )

    dataset_name = os.path.basename(file_path)
    key = dataset_key(file_path)

    output_dir = os.path.join(
        MODEL_DIR,
        key,
    )

    os.makedirs(
        output_dir,
        exist_ok=True,
    )

    print("\n" + "=" * 60)
    print(f"TRAINING DATASET: {dataset_name}")
    print(f"MODEL KEY: {key}")
    print("=" * 60)

    try:
        # ----------------------------------------------------
        # 1. Preprocess dataset
        # ----------------------------------------------------

        df, X, y, feature_columns = preprocess_dataset(
            file_path
        )

        if len(X) < 4:
            raise ValueError(
        f"Only {len(X)} usable rows are available. "
        "At least 4 rows are required by this pipeline."
    )
        if X.shape[1] == 0:
            raise ValueError(
                "No usable input features are available."
            )

        if y.nunique() < 2:
            raise ValueError(
                "At least two target classes are required."
            )

        # Use consistent string labels.
        y = y.astype(str)

        print(f"Usable rows: {len(X)}")
        print(f"Feature count: {len(feature_columns)}")
        print(f"Target classes: {y.nunique()}")

        # ----------------------------------------------------
        # 2. Encode target labels
        # ----------------------------------------------------

        label_encoder = LabelEncoder()

        y_encoded = label_encoder.fit_transform(y)

        class_counts = pd.Series(
            y_encoded
        ).value_counts()

        # Stratification requires at least two samples per class.
        stratify_y = (
            y_encoded
            if (
                len(class_counts) >= 2
                and class_counts.min() >= 2
            )
            else None
        )

        # ----------------------------------------------------
        # 3. Split training and testing data
        # ----------------------------------------------------

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y_encoded,
            test_size=0.20,
            random_state=42,
            stratify=stratify_y,
        )

        if len(X_train) == 0 or len(X_test) == 0:
            raise ValueError(
                "Unable to create valid training and testing sets."
            )

        print(f"Training rows: {len(X_train)}")
        print(f"Testing rows: {len(X_test)}")

        # ----------------------------------------------------
        # 4. Candidate machine-learning models
        # ----------------------------------------------------

        models = {
            "DecisionTree": DecisionTreeClassifier(
                random_state=42,
                max_depth=8,
                min_samples_split=4,
            ),

            "RandomForest": RandomForestClassifier(
                n_estimators=200,
                random_state=42,
                max_depth=10,
                n_jobs=-1,
            ),

            "LogisticRegression": LogisticRegression(
                max_iter=3000,
                random_state=42,
            ),
        }

        best_pipeline = None
        best_accuracy = -1.0
        best_model_name = None
        model_results = {}

        # ----------------------------------------------------
        # 5. Train and compare models
        # ----------------------------------------------------

        for model_name, estimator in models.items():

            try:
                pipeline = Pipeline([
                    (
                        "preprocessor",
                        build_preprocessor(X_train),
                    ),
                    (
                        "classifier",
                        estimator,
                    ),
                ])

                pipeline.fit(
                    X_train,
                    y_train,
                )

                predictions = pipeline.predict(
                    X_test,
                )

                accuracy = float(
                    accuracy_score(
                        y_test,
                        predictions,
                    )
                )

                model_results[model_name] = accuracy

                print(
                    f"{model_name} accuracy: "
                    f"{accuracy * 100:.2f}%"
                )

                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    best_pipeline = pipeline
                    best_model_name = model_name

            except Exception as model_error:
                print(
                    f"{model_name} training failed: "
                    f"{model_error}"
                )

        if best_pipeline is None:
            raise RuntimeError(
                "All candidate models failed. "
                "Check the dataset columns and values."
            )

        # ----------------------------------------------------
        # 6. Save trained artifacts
        # ----------------------------------------------------

        model_path = os.path.join(
            output_dir,
            "performance_model.pkl",
        )

        encoder_path = os.path.join(
            output_dir,
            "label_encoder.pkl",
        )

        features_path = os.path.join(
            output_dir,
            "feature_columns.pkl",
        )

        metadata_path = os.path.join(
            output_dir,
            "metadata.pkl",
        )

        metadata = {
            "dataset_key": key,
            "dataset_name": dataset_name,
            "model_name": best_model_name,
            "accuracy": float(best_accuracy),
            "feature_columns": list(feature_columns),
            "row_count": int(len(X)),
            "training_rows": int(len(X_train)),
            "testing_rows": int(len(X_test)),
            "target_classes": (
                label_encoder.classes_.tolist()
            ),
            "model_results": model_results,
        }

        # Save the fitted pipeline, encoder and metadata.
        joblib.dump(
            best_pipeline,
            model_path,
        )

        joblib.dump(
            label_encoder,
            encoder_path,
        )

        joblib.dump(
            list(feature_columns),
            features_path,
        )

        joblib.dump(
            metadata,
            metadata_path,
        )

        # ----------------------------------------------------
        # 7. Training summary
        # ----------------------------------------------------

        result = {
            "success": True,
            "dataset_name": dataset_name,
            "dataset_key": key,
            "model_name": best_model_name,
            "accuracy": float(best_accuracy),
            "row_count": int(len(X)),
            "feature_count": len(feature_columns),
            "target_classes": (
                label_encoder.classes_.tolist()
            ),
            "model_path": model_path,
        }

        print("\nTRAINING COMPLETED")
        print(f"Dataset: {dataset_name}")
        print(f"Selected model: {best_model_name}")
        print(
            f"Test accuracy: {best_accuracy * 100:.2f}%"
        )
        print(f"Saved model folder: {output_dir}")

        return result

    except Exception as error:
        print(
            f"\nTRAINING FAILED: {dataset_name}"
        )
        print(f"Reason: {error}")

        # Do not hide failures from the calling Flask route.
        raise


# ============================================================
# TRAIN ALL DATASETS
# ============================================================

def train_model():
    """
    Train every CSV inside backend/data/datasets.

    One invalid dataset will not stop the remaining datasets.
    """

    csv_files = glob.glob(
        os.path.join(
            DATASET_DIR,
            "*.csv",
        )
    )

    if not csv_files:
        raise FileNotFoundError(
            f"No CSV datasets found in: {DATASET_DIR}"
        )

    print(
        f"Found {len(csv_files)} CSV dataset(s)."
    )

    successful = []
    failed = []

    for file_path in sorted(csv_files):

        try:
            result = train_dataset(file_path)
            successful.append(result)

        except Exception as error:
            failed.append({
                "dataset_name": os.path.basename(file_path),
                "error": str(error),
            })

    print("\n" + "=" * 60)
    print("DATASET TRAINING SUMMARY")
    print("=" * 60)

    print(f"Successful: {len(successful)}")
    print(f"Failed: {len(failed)}")

    for result in successful:
        print(
            f"SUCCESS: {result['dataset_name']} | "
            f"{result['model_name']} | "
            f"{result['accuracy'] * 100:.2f}%"
        )

    for result in failed:
        print(
            f"FAILED: {result['dataset_name']} | "
            f"{result['error']}"
        )

    print("\nDataset training process completed.")

    return {
        "success": len(successful) > 0,
        "trained_count": len(successful),
        "failed_count": len(failed),
        "trained_datasets": successful,
        "failed_datasets": failed,
    }


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    train_model()
