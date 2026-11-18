
import os
import re
import pandas as pd


# ============================================================
# COLUMN ALIASES
# ============================================================

SUBJECT_SCORE_COLUMN_ALIASES = {
    "subjects",
    "subject_scores",
    "subject_marks",
    "subject_wise_scores",
    "subject_wise_marks",
}

TARGET_ALIASES = [
    "performance_category",
    "performance_level",
    "performance_class",
    "academic_performance",
    "academic_status",
    "performance_status",
    "result_category",
    "final_grade",
    "letter_grade",
    "grade",
    "result",
    "pass_fail",
    "pass_status",
    "status",
    "performance",
    "category",
]

PERCENTAGE_ALIASES = [
    "overall_performance_percentage",
    "overall_percentage",
    "overall_percent",
    "total_percentage",
    "total_percent",
    "final_percentage",
    "final_percent",
    "final_exam_percentage",
    "percentage",
    "percent",
    "total_marks",
    "total_score",
    "overall_marks",
    "final_score",
]

IDENTIFIER_COLUMNS = {
    "student_id",
    "studentid",
    "id",
    "roll_no",
    "roll_number",
    "rollno",
    "register_number",
    "registration_number",
    "registration_no",
    "admission_number",
    "name",
    "student_name",
    "full_name",
    "email",
    "phone",
    "mobile",
}

NON_FEATURE_COLUMNS = {
    "performance_category",
    "risk_status",
    "performance_trend",
    "lowest_subject",
    "recommendation",
    "recommendations",
}


# ============================================================
# SUBJECT SCORE PARSING
# ============================================================

def parse_subject_scores(value):
    if value is None:
        return []

    try:
        if pd.isna(value):
            return []
    except (TypeError, ValueError):
        pass

    text = str(value).strip()

    if not text:
        return []

    scores = []

    parts = re.split(
        r"\s*[|;]\s*|\s*,\s*(?=[^,]+:\s*[-+]?\d)",
        text,
    )

    for part in parts:
        match = re.search(
            r"[^:|;,]+?\s*:\s*([-+]?\d+(?:\.\d+)?)",
            part,
        )

        if match is None:
            continue

        try:
            score = float(match.group(1))
        except (TypeError, ValueError):
            continue

        if 0 <= score <= 100:
            scores.append(score)

    return scores


def derive_subject_average(value):
    scores = parse_subject_scores(value)

    if len(scores) < 3:
        return None

    return round(sum(scores) / len(scores), 2)


# ============================================================
# COLUMN NORMALIZATION
# ============================================================

def normalize_column_name(column):
    name = str(column).strip().lower()
    name = re.sub(r"[^a-z0-9]+", "_", name)
    return name.strip("_")


def normalize_dataframe_columns(df):
    df = df.copy()
    normalized_columns = []

    for index, column in enumerate(df.columns):
        normalized = normalize_column_name(column)

        if not normalized:
            normalized = f"column_{index + 1}"

        normalized_columns.append(normalized)

    counts = {}
    unique_columns = []

    for column in normalized_columns:
        count = counts.get(column, 0)

        if count == 0:
            unique_columns.append(column)
        else:
            unique_columns.append(f"{column}_{count}")

        counts[column] = count + 1

    df.columns = unique_columns
    return df


# ============================================================
# COLUMN DETECTION
# ============================================================

def is_identifier_column(column):
    if column in IDENTIFIER_COLUMNS:
        return True

    identifier_suffixes = (
        "_student_id",
        "_email",
        "_phone",
        "_name",
        "_roll_number",
        "_register_number",
        "_registration_number",
    )

    return column.endswith(identifier_suffixes)


def _has_multiple_classes(series):
    values = series.dropna().astype(str).str.strip()
    values = values[values.ne("")]
    return len(values) > 0 and values.nunique() >= 2


def find_target_column(df):
    for column in TARGET_ALIASES:
        if column in df.columns:
            if _has_multiple_classes(df[column]):
                return column

    for column in df.columns:
        if is_identifier_column(column):
            continue

        if (
            "performance" in column
            and any(
                word in column
                for word in ("category", "level", "class", "status")
            )
            and _has_multiple_classes(df[column])
        ):
            return column

    for column in df.columns:
        if is_identifier_column(column):
            continue

        if not _has_multiple_classes(df[column]):
            continue

        if any(
            word in column
            for word in ("grade", "result", "outcome")
        ):
            return column

    return None


def find_percentage_column(df):
    for column in PERCENTAGE_ALIASES:
        if column not in df.columns:
            continue

        numeric = pd.to_numeric(
            df[column],
            errors="coerce",
        )

        if numeric.notna().any():
            return column

    for column in SUBJECT_SCORE_COLUMN_ALIASES:
        if column not in df.columns:
            continue

        valid_rows = sum(
            derive_subject_average(value) is not None
            for value in df[column].dropna()
        )

        if valid_rows >= max(1, len(df) // 3):
            return column

    for column in df.columns:
        if (
            "percentage" in column
            or column.endswith("_percent")
        ):
            numeric = pd.to_numeric(
                df[column],
                errors="coerce",
            )

            if numeric.notna().any():
                return column

    for column in df.columns:
        if (
            any(
                word in column
                for word in ("total", "final", "overall")
            )
            and any(
                word in column
                for word in ("marks", "score")
            )
        ):
            numeric = pd.to_numeric(
                df[column],
                errors="coerce",
            )

            if numeric.notna().any():
                return column

    return None


# ============================================================
# PERFORMANCE CATEGORY CREATION
# ============================================================

def _category_from_score(value):
    if value >= 75:
        return "Excellent"

    if value >= 50:
        return "Good"

    return "Average"


def create_performance_category(df):
    df = df.copy()
    target_column = find_target_column(df)

    # Use an existing classification target when available.
    if target_column:
        target = df[target_column].copy()

        target = target.replace(
            r"^\s*$",
            pd.NA,
            regex=True,
        )

        valid = target.notna()
        df = df.loc[valid].copy()

        target = (
            target.loc[valid]
            .astype(str)
            .str.strip()
        )

        if target.nunique() < 2:
            raise ValueError(
                f"Target column '{target_column}' "
                "has fewer than 2 distinct classes."
            )

        df["performance_category"] = target.to_numpy()
        return df

    # Otherwise, derive categories from a score column.
    score_column = find_percentage_column(df)

    if score_column is None:
        raise ValueError(
            "Could not identify a target label or score column. "
            "Provide a result/grade column or a clearly named "
            "percentage/total-score column."
        )

    if score_column in SUBJECT_SCORE_COLUMN_ALIASES:
        scores = df[score_column].map(derive_subject_average)

        numeric_scores = pd.to_numeric(
            scores,
            errors="coerce",
        )
    else:
        numeric_scores = pd.to_numeric(
            df[score_column],
            errors="coerce",
        )

    valid = numeric_scores.notna()
    df = df.loc[valid].copy()
    numeric_scores = numeric_scores.loc[valid]

    if numeric_scores.empty:
        raise ValueError(
            f"Column '{score_column}' contains no usable scores."
        )

    df["performance_category"] = numeric_scores.map(
        _category_from_score
    )

    if df["performance_category"].nunique() < 2:
        raise ValueError(
            f"Derived target from '{score_column}' has only "
            "one class. At least two classes are required "
            "for classification."
        )

    return df


# ============================================================
# FEATURE SELECTION
# ============================================================

def get_feature_columns(df):
    feature_columns = []

    target_column = find_target_column(df)
    score_column = find_percentage_column(df)

    for column in df.columns:
        if column in NON_FEATURE_COLUMNS:
            continue

        if is_identifier_column(column):
            continue

        if column == target_column:
            continue

        if column == score_column:
            continue

        if df[column].nunique(dropna=True) <= 1:
            continue

        if (
            pd.api.types.is_numeric_dtype(df[column])
            or pd.api.types.is_bool_dtype(df[column])
            or pd.api.types.is_object_dtype(df[column])
            or isinstance(df[column].dtype, pd.CategoricalDtype)
            or pd.api.types.is_string_dtype(df[column])
        ):
            feature_columns.append(column)

    return feature_columns


# ============================================================
# FEATURE PREPARATION
# ============================================================

def prepare_features(df, feature_columns):
    result = pd.DataFrame(index=df.index)

    for column in feature_columns:
        if column not in df.columns:
            result[column] = pd.NA
            continue

        series = df[column]

        if (
            pd.api.types.is_object_dtype(series)
            or pd.api.types.is_string_dtype(series)
        ):
            converted = pd.to_numeric(
                series,
                errors="coerce",
            )

            non_missing = int(series.notna().sum())

            if (
                non_missing > 0
                and converted.notna().sum() / non_missing >= 0.85
            ):
                series = converted

        result[column] = series

    return result


# ============================================================
# COMPLETE DATASET PREPROCESSING
# ============================================================

def preprocess_dataset(file_path):
    """
    Reads and validates a CSV dataset.

    Returns:
        df, X, y, feature_columns
    """

    if not os.path.isfile(file_path):
        raise FileNotFoundError(
            f"Dataset not found: {file_path}"
        )

    try:
        df = pd.read_csv(file_path)

    except pd.errors.EmptyDataError as exc:
        raise ValueError(
            "Dataset file is empty or has no CSV header."
        ) from exc

    except UnicodeDecodeError:
        df = pd.read_csv(
            file_path,
            encoding="latin-1",
        )

    if df.empty:
        raise ValueError("Dataset is empty.")

    if len(df.columns) < 2:
        raise ValueError(
            "Dataset must contain at least two columns."
        )

    df = normalize_dataframe_columns(df)
    df = create_performance_category(df)

    feature_columns = get_feature_columns(df)

    if not feature_columns:
        raise ValueError(
            "No usable feature columns found after excluding "
            "the target, score and identifier columns."
        )

    X = prepare_features(df, feature_columns)
    y = df["performance_category"].astype("string")

    valid = (
        y.notna()
        & y.str.strip().ne("")
    )

    X = X.loc[valid].copy()
    y = y.loc[valid].astype(str).copy()
    df = df.loc[valid].copy()

    # Minimum rows required for model training.
    if len(X) < 4:
        raise ValueError(
            f"Only {len(X)} usable rows found. "
            "At least 4 usable rows are required for training."
        )

    if y.nunique() < 2:
        raise ValueError(
            "At least 2 target classes are required for training."
        )

    return df, X, y, feature_columns
