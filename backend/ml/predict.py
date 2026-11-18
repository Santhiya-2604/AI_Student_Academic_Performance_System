
import os
import re
import joblib
import numpy as np
import pandas as pd


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "models")


# ============================================================
# DATASET KEY
# Must match train_model.py
# ============================================================

def dataset_key(dataset_name):
    if not dataset_name:
        raise ValueError("Dataset name is required.")

    name = os.path.splitext(
        os.path.basename(str(dataset_name))
    )[0]

    key = re.sub(
        r"[^a-zA-Z0-9_-]+",
        "_",
        name,
    ).strip("_").lower()

    if not key:
        raise ValueError(
            f"Invalid dataset name: {dataset_name}"
        )

    return key


def get_model_paths(dataset_name):
    """
    Resolve the model folder using the dataset filename or key.

    A key such as student_data__2 is preserved, allowing
    explicitly selected model folders to be addressed.
    """

    if not dataset_name:
        raise ValueError(
            "Dataset name or model key is required."
        )

    supplied_name = os.path.basename(
        str(dataset_name).strip()
    )

    # If the caller supplies an explicit model key with a suffix,
    # preserve it instead of stripping the suffix as a file extension.
    if (
        not supplied_name.lower().endswith(".csv")
        and re.fullmatch(
            r"[a-zA-Z0-9_-]+",
            supplied_name,
        )
    ):
        key = supplied_name.lower()
    else:
        key = dataset_key(supplied_name)

    model_dir = os.path.join(
        MODEL_DIR,
        key,
    )

    return {
        "key": key,
        "directory": model_dir,
        "model": os.path.join(
            model_dir,
            "performance_model.pkl",
        ),
        "encoder": os.path.join(
            model_dir,
            "label_encoder.pkl",
        ),
        "features": os.path.join(
            model_dir,
            "feature_columns.pkl",
        ),
        "metadata": os.path.join(
            model_dir,
            "metadata.pkl",
        ),
    }


# ============================================================
# MODEL ARTIFACT LOADING
# ============================================================

def load_model(dataset_name=None):
    paths = get_model_paths(dataset_name)

    if not os.path.isfile(paths["model"]):
        raise FileNotFoundError(
            f"No trained model exists for dataset "
            f"'{dataset_name}'. Expected: {paths['model']}. "
            "Train the dataset first and verify its model key."
        )

    return joblib.load(paths["model"])


def load_label_encoder(dataset_name=None):
    paths = get_model_paths(dataset_name)

    if not os.path.isfile(paths["encoder"]):
        raise FileNotFoundError(
            f"Label encoder not found for dataset "
            f"'{dataset_name}'."
        )

    return joblib.load(paths["encoder"])


def load_feature_columns(dataset_name=None):
    paths = get_model_paths(dataset_name)

    if not os.path.isfile(paths["features"]):
        raise FileNotFoundError(
            f"Feature columns not found for dataset "
            f"'{dataset_name}'. Train the dataset first."
        )

    return joblib.load(paths["features"])


def load_metadata(dataset_name=None):
    paths = get_model_paths(dataset_name)

    if not os.path.isfile(paths["metadata"]):
        raise FileNotFoundError(
            f"Model metadata not found for dataset "
            f"'{dataset_name}'."
        )

    return joblib.load(paths["metadata"])


# ============================================================
# INPUT COLUMN NORMALIZATION
# ============================================================

def normalize_name(name):
    return re.sub(
        r"[^a-z0-9]+",
        "_",
        str(name).strip().lower(),
    ).strip("_")


def _is_missing(value):
    if value is None:
        return True

    if isinstance(value, str):
        return value.strip().lower() in {
            "",
            "null",
            "none",
            "nan",
            "na",
            "n/a",
        }

    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


def _get_numeric_columns(model):
    """
    Read numeric columns from the fitted ColumnTransformer.
    """

    numeric_columns = set()

    if model is None or not hasattr(model, "named_steps"):
        return numeric_columns

    preprocessor = model.named_steps.get("preprocessor")

    if preprocessor is None:
        return numeric_columns

    for name, transformer, columns in getattr(
        preprocessor,
        "transformers_",
        [],
    ):
        if name == "numeric":
            try:
                numeric_columns.update(list(columns))
            except TypeError:
                pass

    return numeric_columns


# ============================================================
# PREPARE INPUT FOR PREDICTION
# ============================================================

def prepare_input(input_data, feature_columns, model=None):
    """
    Accepts a dictionary or a single-row DataFrame.

    Missing features are represented as NaN and handled by the
    fitted training pipeline's imputers.

    Column names are matched case-insensitively after normalization.
    """

    if isinstance(input_data, pd.DataFrame):

        if input_data.empty:
            raise ValueError(
                "Prediction input DataFrame is empty."
            )

        if len(input_data) != 1:
            raise ValueError(
                "prepare_input expects one student record at a time."
            )

        source = input_data.iloc[0].to_dict()

    elif isinstance(input_data, dict):
        source = input_data.copy()

    else:
        raise TypeError(
            "Input data must be a dictionary or pandas DataFrame."
        )

    if not feature_columns:
        raise ValueError(
            "The trained model has no feature columns."
        )

    # Build normalized lookup.
    normalized_source = {}

    for key, value in source.items():
        normalized_key = normalize_name(key)

        if not normalized_key:
            continue

        if normalized_key not in normalized_source:
            normalized_source[normalized_key] = value

        elif _is_missing(normalized_source[normalized_key]):
            normalized_source[normalized_key] = value

    numeric_columns = _get_numeric_columns(model)

    values = {}

    for column in feature_columns:

        # Exact matching first.
        if column in source:
            value = source[column]
        else:
            # Fallback for variations such as "Study Hours"
            # versus "study_hours".
            value = normalized_source.get(
                normalize_name(column),
                np.nan,
            )

        if _is_missing(value):
            values[column] = np.nan
            continue

        # Numeric features must remain numeric.
        if column in numeric_columns:
            try:
                numeric_value = pd.to_numeric(
                    value,
                    errors="coerce",
                )

                if pd.isna(numeric_value):
                    values[column] = np.nan
                else:
                    values[column] = float(numeric_value)

            except (TypeError, ValueError):
                values[column] = np.nan

        else:
            # Categorical features are passed to the fitted
            # OneHotEncoder as strings.
            values[column] = str(value).strip()

    return pd.DataFrame(
        [values],
        columns=feature_columns,
    )


# ============================================================
# FEATURE IMPORTANCE
# ============================================================

def get_feature_importance(model, X):
    """
    Returns the top five original features.

    One-hot encoded columns belonging to the same feature
    are grouped together.
    """

    results = []

    try:
        preprocessor = model.named_steps["preprocessor"]
        classifier = model.named_steps["classifier"]

        transformed_names = (
            preprocessor.get_feature_names_out()
        )

        if hasattr(classifier, "feature_importances_"):
            importance_values = (
                classifier.feature_importances_
            )

        elif hasattr(classifier, "coef_"):
            importance_values = np.abs(
                classifier.coef_
            ).mean(axis=0)

        else:
            return results

        if len(transformed_names) != len(importance_values):
            return results

        original_columns = list(X.columns)
        grouped = {}

        for transformed_name, importance in zip(
            transformed_names,
            importance_values,
        ):
            name = str(transformed_name)

            # Remove ColumnTransformer prefix.
            if "__" in name:
                name = name.split("__", 1)[1]

            matching = [
                column
                for column in original_columns
                if (
                    name == column
                    or name.startswith(column + "_")
                )
            ]

            feature_name = (
                max(matching, key=len)
                if matching
                else name
            )

            grouped[feature_name] = (
                grouped.get(feature_name, 0.0)
                + float(importance)
            )

        total = sum(grouped.values())

        for feature_name, importance in grouped.items():

            percentage = (
                importance / total * 100.0
                if total > 0
                else 0.0
            )

            results.append({
                "feature": feature_name,
                "importance": round(
                    percentage,
                    2,
                ),
            })

        results.sort(
            key=lambda item: item["importance"],
            reverse=True,
        )

    except Exception as error:
        # Importance is optional; prediction should continue
        # if the installed sklearn version cannot calculate it.
        print(
            f"Feature importance unavailable: {error}"
        )
        return []

    return results[:5]


# ============================================================
# PREDICT PERFORMANCE
# ============================================================

def predict_performance(input_data, dataset_name=None):
    """
    Predict the performance category for one student.

    dataset_name must identify the dataset/model used for training.
    """

    if not dataset_name:
        raise ValueError(
            "Dataset name is required for prediction."
        )

    model = load_model(dataset_name)
    label_encoder = load_label_encoder(dataset_name)
    feature_columns = load_feature_columns(dataset_name)

    # Prepare one student's input using the model's feature schema.
    X = prepare_input(
        input_data,
        feature_columns,
        model,
    )

    prediction = model.predict(X)[0]

    # Pipeline classifier outputs the integer labels encoded
    # by LabelEncoder during training.
    predicted_category = label_encoder.inverse_transform(
        [int(prediction)]
    )[0]

    confidence = None

    if hasattr(model, "predict_proba"):
        try:
            probabilities = model.predict_proba(X)[0]

            confidence = (
                float(np.max(probabilities)) * 100.0
            )

        except Exception as error:
            print(
                f"Confidence score unavailable: {error}"
            )

    feature_importance = get_feature_importance(
        model,
        X,
    )

    return {
        "success": True,
        "prediction": str(predicted_category),
        "confidence": (
            round(confidence, 2)
            if confidence is not None
            else None
        ),
        "feature_importance": feature_importance,
    }
