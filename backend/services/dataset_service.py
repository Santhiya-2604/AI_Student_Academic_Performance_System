
import json
import re
from pathlib import Path
from datetime import datetime

import pandas as pd
from werkzeug.utils import secure_filename
from flask import send_file


# -------------------------------------------------
# PATHS
# -------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

DATASETS_DIR = BASE_DIR / "data" / "datasets"
DATASETS_DIR.mkdir(parents=True, exist_ok=True)

METADATA_FILE = DATASETS_DIR / "datasets.json"


# -------------------------------------------------
# METADATA HELPERS
# -------------------------------------------------

def load_metadata():
    if not METADATA_FILE.exists():
        return []

    try:
        with open(METADATA_FILE, "r", encoding="utf-8") as file:
            data = json.load(file)

        return data if isinstance(data, list) else []

    except (OSError, json.JSONDecodeError):
        return []


def save_metadata(data):
    temporary_file = METADATA_FILE.with_suffix(".tmp")

    with open(temporary_file, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=4, ensure_ascii=False)

    temporary_file.replace(METADATA_FILE)


# -------------------------------------------------
# SAFE DATASET NAME
# -------------------------------------------------

def make_safe_name(name):
    name = str(name).strip()
    name = re.sub(r"[^a-zA-Z0-9_-]", "_", name)
    name = re.sub(r"_+", "_", name)

    return name.strip("_") or "dataset"


# -------------------------------------------------
# VALIDATE DATASET
# Supports different CSV column names and schemas.
# -------------------------------------------------

def validate_dataset(file_path):
    try:
        file_path = Path(file_path)

        if not file_path.is_file():
            return {
                "success": False,
                "message": "The uploaded CSV file could not be found."
            }

        df = pd.read_csv(file_path, encoding="utf-8-sig")

        if df.empty:
            return {
                "success": False,
                "message": "The uploaded dataset is empty."
            }

        if len(df.columns) < 2:
            return {
                "success": False,
                "message": "The dataset must contain at least two columns."
            }

        # Clean column names without imposing a fixed schema.
        df.columns = [
            str(column).strip()
            for column in df.columns
        ]

        if any(not column for column in df.columns):
            return {
                "success": False,
                "message": "The dataset contains an empty column name."
            }

        if df.columns.duplicated().any():
            duplicate_names = df.columns[
                df.columns.duplicated()
            ].tolist()

            return {
                "success": False,
                "message": (
                    "The dataset contains duplicate column names: "
                    + ", ".join(map(str, duplicate_names))
                )
            }

        # Completely empty columns are allowed, but report them.
        empty_columns = [
            column
            for column in df.columns
            if df[column].isna().all()
        ]

        return {
            "success": True,
            "message": "Dataset validation successful.",
            "rows": int(df.shape[0]),
            "columns": int(df.shape[1]),
            "column_names": list(df.columns),
            "duplicate_rows": int(df.duplicated().sum()),
            "null_values": int(df.isnull().sum().sum()),
            "empty_columns": empty_columns
        }

    except (UnicodeDecodeError, pd.errors.ParserError) as error:
        return {
            "success": False,
            "message": f"Unable to read the CSV format: {str(error)}"
        }

    except Exception as error:
        return {
            "success": False,
            "message": f"Unable to validate dataset: {str(error)}"
        }


# -------------------------------------------------
# SAVE NEW DATASET
# -------------------------------------------------

def save_dataset(file_path, dataset_name):
    dataset_path = None

    try:
        dataset_name = str(dataset_name or "").strip()

        if not dataset_name:
            return {
                "success": False,
                "message": "Dataset name is required."
            }

        validation = validate_dataset(file_path)

        if not validation["success"]:
            return validation

        df = pd.read_csv(file_path, encoding="utf-8-sig")
        df.columns = [str(column).strip() for column in df.columns]

        # Preserve every original row. Duplicates are reported, not removed.
        duplicate_count = int(df.duplicated().sum())

        safe_name = make_safe_name(dataset_name)
        dataset_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        filename = f"{safe_name}_{dataset_id}.csv"
        dataset_path = DATASETS_DIR / filename

        # Write the new CSV before updating metadata.
        df.to_csv(dataset_path, index=False, encoding="utf-8-sig")

        dataset_info = {
            "id": dataset_id,
            "name": dataset_name,
            "filename": filename,
            "rows": int(df.shape[0]),
            "columns": int(df.shape[1]),
            "column_names": list(df.columns),
            "duplicate_rows": duplicate_count,
            "null_values": int(df.isnull().sum().sum()),
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        metadata = load_metadata()
        metadata.append(dataset_info)

        try:
            save_metadata(metadata)
        except Exception:
            # Avoid leaving a CSV behind when metadata saving fails.
            if dataset_path.exists():
                dataset_path.unlink()
            raise

        return {
            "success": True,
            "message": "Dataset uploaded and saved successfully.",
            "dataset": dataset_info
        }

    except Exception as error:
        return {
            "success": False,
            "message": f"Unable to save dataset: {str(error)}"
        }


# -------------------------------------------------
# UPLOAD DATASET
# -------------------------------------------------

def upload_dataset(file, dataset_name):
    temp_path = None

    try:
        if file is None:
            return {
                "success": False,
                "message": "Please select a CSV file."
            }

        original_filename = secure_filename(file.filename or "")

        if not original_filename:
            return {
                "success": False,
                "message": "Invalid file name."
            }

        if not original_filename.lower().endswith(".csv"):
            return {
                "success": False,
                "message": "Only CSV files are supported."
            }

        if not str(dataset_name or "").strip():
            return {
                "success": False,
                "message": "Dataset name is required."
            }

        temp_filename = (
            f"_temp_{datetime.now().strftime('%Y%m%d%H%M%S%f')}.csv"
        )
        temp_path = DATASETS_DIR / temp_filename

        file.save(str(temp_path))

        return save_dataset(temp_path, dataset_name)

    except Exception as error:
        return {
            "success": False,
            "message": f"Unable to upload dataset: {str(error)}"
        }

    finally:
        if temp_path is not None:
            try:
                if temp_path.exists():
                    temp_path.unlink()
            except OSError:
                pass


# -------------------------------------------------
# GET ALL DATASETS
# -------------------------------------------------

def get_all_datasets():
    return {
        "success": True,
        "datasets": load_metadata()
    }


def get_datasets():
    return get_all_datasets()


# -------------------------------------------------
# GET SINGLE DATASET
# -------------------------------------------------

def get_dataset(dataset_id):
    for dataset in load_metadata():
        if str(dataset.get("id")) == str(dataset_id):
            return {
                "success": True,
                "dataset": dataset
            }

    return {
        "success": False,
        "message": "Dataset not found."
    }


# -------------------------------------------------
# GET DATASET PATH
# -------------------------------------------------

def get_dataset_path(dataset_id):
    for dataset in load_metadata():
        if str(dataset.get("id")) == str(dataset_id):
            filename = dataset.get("filename")

            if not filename:
                return None

            # Prevent metadata filenames from escaping the dataset directory.
            if Path(filename).name != filename:
                return None

            path = DATASETS_DIR / filename

            if path.is_file():
                return path

    return None


# -------------------------------------------------
# DATASET PREVIEW
# -------------------------------------------------

def get_dataset_preview(dataset_id, limit=10):
    dataset_path = get_dataset_path(dataset_id)

    if dataset_path is None:
        return {
            "success": False,
            "message": "Dataset not found."
        }

    try:
        limit = max(1, min(int(limit), 500))
        df = pd.read_csv(dataset_path, encoding="utf-8-sig")

        # Make NaN values JSON-friendly.
        preview = (
            df.head(limit)
            .astype(object)
            .where(pd.notna(df.head(limit)), None)
            .to_dict(orient="records")
        )

        return {
            "success": True,
            "data": preview,
            "columns": list(df.columns),
            "total_rows": int(df.shape[0])
        }

    except Exception as error:
        return {
            "success": False,
            "message": f"Unable to preview dataset: {str(error)}"
        }


# -------------------------------------------------
# DOWNLOAD DATASET
# -------------------------------------------------

def download_dataset(dataset_id):
    dataset_path = get_dataset_path(dataset_id)

    if dataset_path is None:
        return {
            "success": False,
            "message": "Dataset not found."
        }

    return send_file(
        str(dataset_path),
        mimetype="text/csv",
        as_attachment=True,
        download_name=dataset_path.name
    )


# -------------------------------------------------
# DELETE DATASET
# -------------------------------------------------

def delete_dataset(dataset_id):
    metadata = load_metadata()

    target_dataset = next(
        (
            dataset
            for dataset in metadata
            if str(dataset.get("id")) == str(dataset_id)
        ),
        None
    )

    if target_dataset is None:
        return {
            "success": False,
            "message": "Dataset not found."
        }

    filename = target_dataset.get("filename")

    if not filename or Path(filename).name != filename:
        return {
            "success": False,
            "message": "Invalid dataset filename in metadata."
        }

    dataset_path = DATASETS_DIR / filename

    try:
        # Save updated metadata first; if that fails, keep the CSV intact.
        updated_metadata = [
            dataset
            for dataset in metadata
            if str(dataset.get("id")) != str(dataset_id)
        ]

        save_metadata(updated_metadata)

        try:
            if dataset_path.is_file():
                dataset_path.unlink()
        except OSError as error:
            # Restore metadata if file deletion fails.
            save_metadata(metadata)
            return {
                "success": False,
                "message": f"Unable to delete dataset file: {str(error)}"
            }

        return {
            "success": True,
            "message": "Dataset deleted successfully."
        }

    except Exception as error:
        return {
            "success": False,
            "message": f"Unable to delete dataset: {str(error)}"
        }
