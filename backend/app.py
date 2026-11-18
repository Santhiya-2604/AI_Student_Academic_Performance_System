from flask import (
    Flask,
    request,
    jsonify,
    send_file
)

from flask_cors import CORS

import os
import re
import pandas as pd
import traceback
import numpy as np
from datetime import datetime

from ml.predict import (
    predict_performance,
    load_feature_columns,
    dataset_key as canonical_dataset_key
)

# Train a model for each uploaded CSV using the existing flexible ML pipeline.
from ml.train_model import train_dataset

from database.database import (
    init_database,
    authenticate_user,
    create_user,

    create_created_dataset,
    get_created_datasets,
    get_created_dataset,
    get_previous_subjects,

    add_created_student,
    update_created_student,
    delete_created_student,
    delete_created_dataset,

    create_student,
    get_all_students,
    get_student,
    get_connection,
)
from gemini_assistant import ask_academic_assistant


# =========================================================
# APP
# =========================================================

app = Flask(__name__)

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "*"
        }
    }
)

app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024


# =========================================================
# PATHS
# =========================================================

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "data"
)

DATASET_DIR = os.path.join(
    DATA_DIR,
    "datasets"
)

os.makedirs(
    DATASET_DIR,
    exist_ok=True
)


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

init_database()


# =========================================================
# ACADEMIC CALCULATION HELPERS
# =========================================================

def normalize_student_columns(student):

    normalized = {}

    for key in student.keys():

        normalized_name = (
            str(key)
            .strip()
            .lower()
            .replace(" ", "_")
            .replace("-", "_")
        )

        normalized[normalized_name] = key

    return normalized


# =========================================================
# STUDENT ID NORMALIZATION
# =========================================================

def normalize_student_id(value):
    """
    Keeps Student ID as a string.

    Example:
        101     -> "101"
        101.0   -> "101"
        "101"   -> "101"
        " 101 " -> "101"
    """

    if value is None:
        return ""

    try:

        if pd.isna(value):
            return ""

    except Exception:
        pass

    text = str(value).strip()

    # Pandas may convert an ID such as 101 into 101.0
    if text.endswith(".0"):

        try:

            number = float(text)

            if number.is_integer():

                text = str(
                    int(number)
                )

        except Exception:
            pass

    return text


def get_student_value(
    student,
    possible_columns
):

    normalized_columns = normalize_student_columns(
        student
    )

    for column in possible_columns:

        normalized_column = (
            str(column)
            .strip()
            .lower()
            .replace(" ", "_")
            .replace("-", "_")
        )

        if normalized_column not in normalized_columns:
            continue

        original_column = (
            normalized_columns[
                normalized_column
            ]
        )

        value = student.get(
            original_column
        )

        if value is None:
            continue

        try:

            if pd.isna(value):
                continue

        except Exception:
            pass

        if str(value).strip() == "":
            continue

        return value

    return None


def get_numeric_value(
    student,
    possible_columns
):

    value = get_student_value(
        student,
        possible_columns
    )

    if value is None:
        return None

    try:

        return float(value)

    except (
        ValueError,
        TypeError
    ):

        return None


# =========================================================
# OVERALL PERFORMANCE
# =========================================================

def calculate_overall_performance(
    student
):

    existing = get_numeric_value(
        student,
        [
            "overall_performance_percentage",
            "overall_percentage",
            "overall_performance",
            "overall_score"
        ]
    )

    if existing is not None:

        return round(
            existing,
            2
        )

    subject_values = []

    normalized_columns = (
        normalize_student_columns(
            student
        )
    )

    excluded_columns = {
        "internal_1_marks",
        "internal_2_marks",
        "assignment_score",
        "average_subject_marks"
    }

    for normalized_name, original_name in (
        normalized_columns.items()
    ):

        if (
            "marks" not in normalized_name
            and "score" not in normalized_name
        ):
            continue

        if normalized_name in excluded_columns:
            continue

        value = student.get(
            original_name
        )

        try:

            numeric_value = float(
                value
            )

            if 0 <= numeric_value <= 100:

                subject_values.append(
                    numeric_value
                )

        except (
            ValueError,
            TypeError
        ):

            continue

    if subject_values:

        return round(
            sum(subject_values)
            / len(subject_values),
            2
        )

    academic_values = []

    academic_columns = [

        "internal_1_marks",

        "internal_2_marks",

        "assignment_score",

        "previous_semester_percentage",

        "learning_activity_score"

    ]

    for column in academic_columns:

        value = get_numeric_value(
            student,
            [column]
        )

        if value is not None:

            if 0 <= value <= 100:

                academic_values.append(
                    value
                )

    if academic_values:

        return round(
            sum(academic_values)
            / len(academic_values),
            2
        )

    return None


# =========================================================
# PERFORMANCE CATEGORY
# =========================================================

def calculate_performance_category(
    overall
):

    if overall is None:
        return None

    if overall >= 85:
        return "Excellent"

    if overall >= 70:
        return "Good"

    return "Average"


# =========================================================
# RISK STATUS
# =========================================================

def calculate_risk_status(
    student,
    overall
):

    if overall is None:
        return None

    attendance = get_numeric_value(
        student,
        [
            "attendance_percentage",
            "attendance"
        ]
    )

    backlog = get_numeric_value(
        student,
        [
            "backlog_count",
            "backlogs"
        ]
    )

    study_hours = get_numeric_value(
        student,
        [
            "study_hours_per_day",
            "study_hours"
        ]
    )

    risk_score = 0

    # -----------------------------------------------------
    # OVERALL PERFORMANCE
    # -----------------------------------------------------

    if overall < 50:

        risk_score += 3

    elif overall < 65:

        risk_score += 2

    elif overall < 75:

        risk_score += 1

    # -----------------------------------------------------
    # ATTENDANCE
    # -----------------------------------------------------

    if attendance is not None:

        if attendance < 60:

            risk_score += 3

        elif attendance < 75:

            risk_score += 2

        elif attendance < 80:

            risk_score += 1

    # -----------------------------------------------------
    # BACKLOG
    # -----------------------------------------------------

    if backlog is not None:

        if backlog >= 3:

            risk_score += 3

        elif backlog == 2:

            risk_score += 2

        elif backlog == 1:

            risk_score += 1

    # -----------------------------------------------------
    # STUDY HOURS
    # -----------------------------------------------------

    if study_hours is not None:

        if study_hours < 2:

            risk_score += 2

        elif study_hours < 4:

            risk_score += 1

    # -----------------------------------------------------
    # FINAL RISK
    # -----------------------------------------------------

    if risk_score >= 5:

        return "High"

    if risk_score >= 2:

        return "Medium"

    return "Low"


# =========================================================
# PERFORMANCE TREND
# =========================================================

def calculate_performance_trend(
    student,
    overall
):

    if overall is None:
        return None

    previous = get_numeric_value(
        student,
        [
            "previous_semester_percentage",
            "previous_percentage",
            "previous_semester_performance"
        ]
    )

    if previous is None:

        return "Stable"

    difference = (
        overall - previous
    )

    if difference >= 5:

        return "Improving"

    if difference <= -5:

        return "Declining"

    return "Stable"


# =========================================================
# ENRICH STUDENT DATA
# =========================================================

def enrich_student_data(
    student
):

    # -----------------------------------------------------
    # CONVERT NaN
    # -----------------------------------------------------

    for key, value in list(
        student.items()
    ):

        try:

            if pd.isna(value):

                student[key] = None

        except Exception:

            pass

    # -----------------------------------------------------
    # STUDENT ID
    # -----------------------------------------------------

    possible_id_columns = [

        "student_id",
        "studentid",
        "id",
        "roll_no",
        "roll_number",
        "register_number",
        "registration_number"
    ]

    existing_student_id = get_student_value(
        student,
        possible_id_columns
    )

    if existing_student_id is not None:

        # Preserve original column if possible
        normalized_columns = (
            normalize_student_columns(
                student
            )
        )

        for possible_id in possible_id_columns:

            if possible_id in normalized_columns:

                original_column = (
                    normalized_columns[
                        possible_id
                    ]
                )

                student[original_column] = (
                    normalize_student_id(
                        existing_student_id
                    )
                )

                break

    # -----------------------------------------------------
    # OVERALL
    # -----------------------------------------------------

    overall = (
        calculate_overall_performance(
            student
        )
    )

    existing_overall = get_numeric_value(
        student,
        [
            "overall_performance_percentage",
            "overall_percentage",
            "overall_performance",
            "overall_score"
        ]
    )

    if (
        existing_overall is None
        and overall is not None
    ):

        student[
            "overall_performance_percentage"
        ] = overall

    # -----------------------------------------------------
    # PERFORMANCE CATEGORY
    # -----------------------------------------------------

    existing_category = get_student_value(
        student,
        [
            "performance_category"
        ]
    )

    category = (
        calculate_performance_category(
            overall
        )
    )

    if (
        existing_category is None
        and category is not None
    ):

        student[
            "performance_category"
        ] = category

    # -----------------------------------------------------
    # RISK
    # -----------------------------------------------------

    existing_risk = get_student_value(
        student,
        [
            "risk_status",
            "risk",
            "risk_level"
        ]
    )

    risk = calculate_risk_status(
        student,
        overall
    )

    if (
        existing_risk is None
        and risk is not None
    ):

        student[
            "risk_status"
        ] = risk

    # -----------------------------------------------------
    # TREND
    # -----------------------------------------------------

    existing_trend = get_student_value(
        student,
        [
            "performance_trend",
            "trend"
        ]
    )

    trend = calculate_performance_trend(
        student,
        overall
    )

    if (
        existing_trend is None
        and trend is not None
    ):

        student[
            "performance_trend"
        ] = trend

    return student


# =========================================================
# HOME
# =========================================================

@app.route(
    "/",
    methods=["GET"]
)
def home():

    return jsonify({

        "success": True,

        "message":
            "AI Student Performance System Backend is Running",

        "status":
            "online"

    })


# =========================================================
# HEALTH
# =========================================================

@app.route(
    "/api/health",
    methods=["GET"]
)
def health():

    return jsonify({

        "success": True,

        "message":
            "Backend is healthy."

    })


# =========================================================
# LOGIN
# =========================================================

@app.route(
    "/api/login",
    methods=["POST"]
)
def login():

    try:

        data = (
            request.get_json()
            or {}
        )

        username = str(
            data.get(
                "username",
                ""
            )
        ).strip()

        password = str(
            data.get(
                "password",
                ""
            )
        )

        if (
            not username
            or not password
        ):

            return jsonify({

                "success": False,

                "message":
                    "Username and password are required."

            }), 400

        result = authenticate_user(
            username,
            password
        )

        if not result["success"]:

            return jsonify(
                result
            ), 401

        return jsonify(
            result
        ), 200

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# REGISTER
# =========================================================

@app.route(
    "/api/register",
    methods=["POST"]
)
def register():

    try:

        data = (
            request.get_json()
            or {}
        )

        username = str(
            data.get(
                "username",
                ""
            )
        ).strip()

        password = str(
            data.get(
                "password",
                ""
            )
        )

        role = str(
            data.get(
                "role",
                "student"
            )
        ).strip().lower()

        if (
            not username
            or not password
        ):

            return jsonify({

                "success": False,

                "message":
                    "Username and password are required."

            }), 400

        if role not in [
            "admin",
            "student",
            "faculty"
        ]:

            role = "student"

        result = create_user(
            username,
            password,
            role
        )

        if not result["success"]:

            return jsonify(
                result
            ), 409

        return jsonify(
            result
        ), 201

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# CREATED DATASETS
# =========================================================

@app.route(
    "/api/created-datasets",
    methods=["GET"]
)
def list_created_datasets():

    try:

        datasets = (
            get_created_datasets()
        )

        return jsonify({

            "success": True,

            "datasets":
                datasets

        })

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e),

            "datasets":
                []

        }), 500


# =========================================================
# CREATE DATASET
# =========================================================

@app.route(
    "/api/created-datasets",
    methods=["POST"]
)
def create_dataset():

    try:

        data = (
            request.get_json()
            or {}
        )

        dataset_name = str(
            data.get(
                "dataset_name",
                ""
            )
        ).strip()

        if not dataset_name:

            return jsonify({

                "success": False,

                "message":
                    "Dataset name is required."

            }), 400

        dataset = (
            create_created_dataset(
                dataset_name
            )
        )

        return jsonify({

            "success": True,

            "message":
                "Dataset created successfully.",

            "dataset":
                dataset

        }), 201

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# OPEN CREATED DATASET
# =========================================================

@app.route(
    "/api/created-datasets/<int:dataset_id>",
    methods=["GET"]
)
def open_created_dataset(
    dataset_id
):

    try:

        dataset = (
            get_created_dataset(
                dataset_id
            )
        )

        if not dataset:

            return jsonify({

                "success": False,

                "message":
                    "Dataset not found."

            }), 404

        return jsonify({

            "success": True,

            "dataset":
                dataset

        })

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# PREVIOUS SUBJECTS
# =========================================================

@app.route(
    "/api/created-datasets/<int:dataset_id>/previous-subjects",
    methods=["GET"]
)
def previous_subjects(
    dataset_id
):

    try:

        dataset = (
            get_created_dataset(
                dataset_id
            )
        )

        if not dataset:

            return jsonify({

                "success": False,

                "message":
                    "Dataset not found."

            }), 404

        subjects = (
            get_previous_subjects(
                dataset_id
            )
        )

        return jsonify({

            "success": True,

            "subjects":
                subjects

        })

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e),

            "subjects":
                []

        }), 500


# =========================================================
# ADD STUDENT TO CREATED DATASET
# =========================================================

@app.route(
    "/api/created-datasets/<int:dataset_id>/students",
    methods=["POST"]
)
def add_student_to_dataset(
    dataset_id
):

    try:

        dataset = (
            get_created_dataset(
                dataset_id
            )
        )

        if not dataset:

            return jsonify({

                "success": False,

                "message":
                    "Dataset not found."

            }), 404

        data = (
            request.get_json()
            or {}
        )

        student_id = normalize_student_id(
            data.get(
                "student_id",
                ""
            )
        )

        name = str(
            data.get(
                "name",
                ""
            )
        ).strip()

        department = str(
            data.get(
                "department",
                ""
            )
        ).strip()

        semester = data.get(
            "semester"
        )

        academic_details = (
            data.get(
                "academic_details"
            )
            or {}
        )

        subjects = (
            data.get(
                "subjects"
            )
            or []
        )

        if not student_id:

            return jsonify({

                "success": False,

                "message":
                    "Student ID is required."

            }), 400

        if not name:

            return jsonify({

                "success": False,

                "message":
                    "Student name is required."

            }), 400

        if not department:

            return jsonify({

                "success": False,

                "message":
                    "Department is required."

            }), 400

        if semester in [
            None,
            "",
            0
        ]:

            return jsonify({

                "success": False,

                "message":
                    "Semester is required."

            }), 400

        if not subjects:

            return jsonify({

                "success": False,

                "message":
                    "At least one subject is required."

            }), 400

        try:

            semester = int(
                semester
            )

        except Exception:

            return jsonify({

                "success": False,

                "message":
                    "Semester must be a valid number."

            }), 400

        numeric_fields = [

            "attendance_percentage",
            "internal_1_marks",
            "internal_2_marks",
            "assignment_score",
            "previous_semester_percentage",
            "study_hours_per_day",
            "learning_activity_score",
            "backlog_count",
            "sleep_hours_per_day",
            "practice_tests_completed"

        ]

        clean_academic = {}

        for field in numeric_fields:

            value = (
                academic_details.get(
                    field
                )
            )

            if value in [
                "",
                None
            ]:

                clean_academic[field] = None

            else:

                try:

                    clean_academic[field] = float(
                        value
                    )

                except Exception:

                    clean_academic[field] = None

        clean_subjects = []

        for subject in subjects:

            subject_name = (

                subject.get(
                    "subject_name"
                )

                or subject.get(
                    "name"
                )

                or ""

            )

            subject_name = str(
                subject_name
            ).strip()

            marks = subject.get(
                "marks"
            )

            if not subject_name:
                continue

            try:

                marks = float(
                    marks
                )

            except Exception:

                return jsonify({

                    "success": False,

                    "message":
                        f"Invalid marks for {subject_name}."

                }), 400

            if (
                marks < 0
                or marks > 100
            ):

                return jsonify({

                    "success": False,

                    "message":
                        f"Marks for {subject_name} must be between 0 and 100."

                }), 400

            clean_subjects.append({

                "subject_name":
                    subject_name,

                "marks":
                    marks

            })

        if not clean_subjects:

            return jsonify({

                "success": False,

                "message":
                    "At least one valid subject is required."

            }), 400

        result = add_created_student(

            dataset_id,

            student_id,

            name,

            department,

            semester,

            clean_academic,

            clean_subjects

        )

        if not result["success"]:

            return jsonify(
                result
            ), 400

        return jsonify(
            result
        ), 201

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# UPDATE STUDENT
# =========================================================

@app.route(
    "/api/created-datasets/<int:dataset_id>/students/<int:record_id>",
    methods=["PUT"]
)
def update_student_in_dataset(
    dataset_id,
    record_id
):

    try:

        dataset = (
            get_created_dataset(
                dataset_id
            )
        )

        if not dataset:

            return jsonify({

                "success": False,

                "message":
                    "Dataset not found."

            }), 404

        data = (
            request.get_json()
            or {}
        )

        student_id = normalize_student_id(
            data.get(
                "student_id",
                ""
            )
        )

        name = str(
            data.get(
                "name",
                ""
            )
        ).strip()

        department = str(
            data.get(
                "department",
                ""
            )
        ).strip()

        semester = data.get(
            "semester"
        )

        academic_details = (
            data.get(
                "academic_details"
            )
            or {}
        )

        subjects = (
            data.get(
                "subjects"
            )
            or []
        )

        if not student_id:

            return jsonify({

                "success": False,

                "message":
                    "Student ID is required."

            }), 400

        if not name:

            return jsonify({

                "success": False,

                "message":
                    "Student name is required."

            }), 400

        if not department:

            return jsonify({

                "success": False,

                "message":
                    "Department is required."

            }), 400

        if semester in [
            None,
            ""
        ]:

            return jsonify({

                "success": False,

                "message":
                    "Semester is required."

            }), 400

        try:

            semester = int(
                semester
            )

        except Exception:

            return jsonify({

                "success": False,

                "message":
                    "Invalid semester."

            }), 400

        numeric_fields = [

            "attendance_percentage",
            "internal_1_marks",
            "internal_2_marks",
            "assignment_score",
            "previous_semester_percentage",
            "study_hours_per_day",
            "learning_activity_score",
            "backlog_count",
            "sleep_hours_per_day",
            "practice_tests_completed"

        ]

        clean_academic = {}

        for field in numeric_fields:

            value = (
                academic_details.get(
                    field
                )
            )

            if value in [
                "",
                None
            ]:

                clean_academic[field] = None

            else:

                try:

                    clean_academic[field] = float(
                        value
                    )

                except Exception:

                    clean_academic[field] = None

        clean_subjects = []

        for subject in subjects:

            subject_name = (

                subject.get(
                    "subject_name"
                )

                or subject.get(
                    "name"
                )

                or ""

            )

            subject_name = str(
                subject_name
            ).strip()

            marks = subject.get(
                "marks"
            )

            if not subject_name:
                continue

            try:

                marks = float(
                    marks
                )

            except Exception:

                return jsonify({

                    "success": False,

                    "message":
                        f"Invalid marks for {subject_name}."

                }), 400

            if (
                marks < 0
                or marks > 100
            ):

                return jsonify({

                    "success": False,

                    "message":
                        f"Marks for {subject_name} must be between 0 and 100."

                }), 400

            clean_subjects.append({

                "subject_name":
                    subject_name,

                "marks":
                    marks

            })

        if not clean_subjects:

            return jsonify({

                "success": False,

                "message":
                    "At least one valid subject is required."

            }), 400

        result = update_created_student(

            dataset_id,

            record_id,

            student_id,

            name,

            department,

            semester,

            clean_academic,

            clean_subjects

        )

        if not result["success"]:

            return jsonify(
                result
            ), 404

        return jsonify(
            result
        )

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# DELETE STUDENT
# =========================================================

@app.route(
    "/api/created-datasets/<int:dataset_id>/students/<int:record_id>",
    methods=["DELETE"]
)
def delete_student_from_dataset(
    dataset_id,
    record_id
):

    try:

        result = delete_created_student(

            dataset_id,

            record_id

        )

        if not result["success"]:

            return jsonify(
                result
            ), 404

        return jsonify(
            result
        )

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# DELETE DATASET
# =========================================================

@app.route(
    "/api/created-datasets/<int:dataset_id>",
    methods=["DELETE"]
)
def delete_dataset(
    dataset_id
):

    try:

        result = delete_created_dataset(
            dataset_id
        )

        if not result["success"]:

            return jsonify(
                result
            ), 404

        return jsonify(
            result
        )

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# EXPORT CREATED DATASET
# =========================================================

@app.route(
    "/api/created-datasets/<int:dataset_id>/export",
    methods=["GET"]
)
def export_created_dataset(
    dataset_id
):

    try:

        dataset = (
            get_created_dataset(
                dataset_id
            )
        )

        if not dataset:

            return jsonify({

                "success": False,

                "message":
                    "Dataset not found."

            }), 404

        rows = []

        for student in dataset["students"]:

            academic = (
                student.get(
                    "academic_details"
                )
                or {}
            )

            subjects = (
                student.get(
                    "subjects"
                )
                or []
            )

            subject_text = " | ".join(

                [

                    f"{s.get('name', s.get('subject_name', ''))}:{s.get('marks')}"

                    for s in subjects

                ]

            )

            rows.append({

                "student_id":
                    normalize_student_id(
                        student.get(
                            "student_id"
                        )
                    ),

                "name":
                    student.get(
                        "name"
                    ),

                "department":
                    student.get(
                        "department"
                    ),

                "semester":
                    student.get(
                        "semester"
                    ),

                "attendance_percentage":
                    academic.get(
                        "attendance_percentage"
                    ),

                "internal_1_marks":
                    academic.get(
                        "internal_1_marks"
                    ),

                "internal_2_marks":
                    academic.get(
                        "internal_2_marks"
                    ),

                "assignment_score":
                    academic.get(
                        "assignment_score"
                    ),

                "previous_semester_percentage":
                    academic.get(
                        "previous_semester_percentage"
                    ),

                "study_hours_per_day":
                    academic.get(
                        "study_hours_per_day"
                    ),

                "learning_activity_score":
                    academic.get(
                        "learning_activity_score"
                    ),

                "backlog_count":
                    academic.get(
                        "backlog_count"
                    ),

                "sleep_hours_per_day":
                    academic.get(
                        "sleep_hours_per_day"
                    ),

                "practice_tests_completed":
                    academic.get(
                        "practice_tests_completed"
                    ),

                "subjects":
                    subject_text

            })

        df = pd.DataFrame(
            rows
        )

        safe_name = "".join(

            char

            if char.isalnum()
            or char in "_-"

            else "_"

            for char in dataset[
                "dataset_name"
            ]

        )

        file_path = os.path.join(

            DATASET_DIR,

            f"{safe_name}.csv"

        )

        df.to_csv(
            file_path,
            index=False
        )

        return send_file(

            file_path,

            as_attachment=True,

            download_name=
                f"{safe_name}.csv",

            mimetype=
                "text/csv"

        )

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# DATASET UPLOAD
# =========================================================


@app.route(
    "/api/dataset/upload",
    methods=["POST"]
)
def upload_dataset():

    conn = None

    try:

        if "file" not in request.files:

            return jsonify({
                "success": False,
                "message": "No CSV file selected."
            }), 400

        file = request.files["file"]

        if not file or not file.filename:

            return jsonify({
                "success": False,
                "message": "No CSV file selected."
            }), 400

        if not file.filename.lower().endswith(".csv"):

            return jsonify({
                "success": False,
                "message": "Only CSV files are allowed."
            }), 400

        dataset_name = str(
            request.form.get("dataset_name")
            or request.form.get("name")
            or ""
        ).strip()

        if not dataset_name:

            return jsonify({
                "success": False,
                "message": "Dataset name is required."
            }), 400

        df = pd.read_csv(file)

        if df.empty:

            return jsonify({
                "success": False,
                "message": "Uploaded CSV is empty."
            }), 400

        row_count = len(df)
        column_count = len(df.columns)

        safe_filename = os.path.basename(
            file.filename
        )

        dataset_folder = os.path.join(
            BASE_DIR,
            "data",
            "datasets"
        )

        os.makedirs(
            dataset_folder,
            exist_ok=True
        )

        # -----------------------------------------------------
        # Prevent duplicate CSV filenames
        # -----------------------------------------------------

        filename_stem, filename_extension = os.path.splitext(
            safe_filename
        )

        candidate_path = os.path.join(
            dataset_folder,
            safe_filename
        )

        file_counter = 1

        while os.path.exists(candidate_path):

            candidate_filename = (
                f"{filename_stem}_{file_counter}"
                f"{filename_extension}"
            )

            candidate_path = os.path.join(
                dataset_folder,
                candidate_filename
            )

            file_counter += 1

        safe_filename = os.path.basename(
            candidate_path
        )

        file_path = candidate_path

        df.to_csv(
            file_path,
            index=False
        )

        # -----------------------------------------------------
        # Train a model for this uploaded dataset
        # -----------------------------------------------------
        # Upload should still succeed when a dataset is too small or has
        # no usable target/features. In that case, report the training
        # status and let the prediction endpoint explain the limitation.
        training_status = {
            "success": False,
            "message": "Model training was not completed."
        }

        try:
            training_result = train_dataset(file_path)

            # Some training implementations return None; verify the saved
            # feature artifact rather than assuming training succeeded.
            try:
                trained_features = load_feature_columns(
                    canonical_dataset_key(safe_filename)
                )
                if isinstance(trained_features, (list, tuple)) and trained_features:
                    training_status = {
                        "success": True,
                        "message": "Model trained successfully."
                    }
                else:
                    training_status = {
                        "success": False,
                        "message": "Training completed without usable feature columns."
                    }
            except Exception as verify_error:
                if isinstance(training_result, dict):
                    training_status = training_result
                else:
                    training_status = {
                        "success": False,
                        "message": str(verify_error)
                    }

            if isinstance(training_result, dict) and not training_result.get("success", True):
                training_status = training_result

        except Exception as training_error:
            print("DATASET MODEL TRAINING ERROR:", str(training_error))
            traceback.print_exc()
            training_status = {
                "success": False,
                "message": str(training_error)
            }

        # -----------------------------------------------------
        # Database connection
        # -----------------------------------------------------

        conn = get_connection()

        conn.execute(
            "PRAGMA busy_timeout = 30000"
        )

        cursor = conn.cursor()

        cursor.execute(
            "PRAGMA table_info(datasets)"
        )

        columns = [
            row["name"]
            for row in cursor.fetchall()
        ]

        if (
            "dataset_name" not in columns
            and "name" not in columns
        ):

            return jsonify({
                "success": False,
                "message": "Invalid datasets table structure."
            }), 500

        
        # -----------------------------------------------------
        # Generate unique dataset name
        # -----------------------------------------------------

        base_dataset_name = dataset_name
        unique_dataset_name = base_dataset_name
        name_counter = 1

        # Detect the actual dataset name column
        name_column = (
            "dataset_name"
            if "dataset_name" in columns
            else "name"
        )

        while True:

            duplicate = cursor.execute(
                f"""
                SELECT id
                FROM datasets
                WHERE "{name_column}" = ?
                LIMIT 1
                """,
                (unique_dataset_name,)
            ).fetchone()

            if not duplicate:
                break

            name_counter += 1

            unique_dataset_name = (
                f"{base_dataset_name}_{name_counter}"
            )


        # -----------------------------------------------------
        # Prepare database insert
        # -----------------------------------------------------

        uploaded_at = datetime.now().strftime(
            "%Y-%m-%d %H:%M:%S"
        )

        insert_columns = []

        insert_values = []

        if "dataset_name" in columns:

            insert_columns.append(
                "dataset_name"
            )

            insert_values.append(
                unique_dataset_name
            )

        if "name" in columns:

            insert_columns.append(
                "name"
            )

            insert_values.append(
                unique_dataset_name
            )

        if "file_name" in columns:

            insert_columns.append(
                "file_name"
            )

            insert_values.append(
                safe_filename
            )

        if "file_path" in columns:

            insert_columns.append(
                "file_path"
            )

            insert_values.append(
                file_path
            )

        if "row_count" in columns:

            insert_columns.append(
                "row_count"
            )

            insert_values.append(
                row_count
            )

        if "column_count" in columns:

            insert_columns.append(
                "column_count"
            )

            insert_values.append(
                column_count
            )

        if "uploaded_at" in columns:

            insert_columns.append(
                "uploaded_at"
            )

            insert_values.append(
                uploaded_at
            )

        placeholders = ", ".join(
            ["?"] * len(insert_columns)
        )

        column_sql = ", ".join(
            insert_columns
        )

        cursor.execute(
            f"""
            INSERT INTO datasets (
                {column_sql}
            )
            VALUES (
                {placeholders}
            )
            """,
            tuple(insert_values)
        )

        dataset_id = cursor.lastrowid

        conn.commit()

        return jsonify({

            "success": True,

            "message": "Dataset uploaded successfully.",

            "dataset_id": dataset_id,

            "dataset_name": unique_dataset_name,

            "name": unique_dataset_name,

            "file_name": safe_filename,

            "row_count": row_count,

            "column_count": column_count,

            "model_training": training_status

        }), 200

    except pd.errors.EmptyDataError:

        if conn:

            conn.rollback()

        return jsonify({

            "success": False,

            "message": "CSV file is empty."

        }), 400

    except pd.errors.ParserError:

        if conn:

            conn.rollback()

        return jsonify({

            "success": False,

            "message": "Invalid CSV format."

        }), 400

    except Exception as e:

        if conn:

            conn.rollback()

        print(
            "DATASET UPLOAD ERROR:",
            str(e)
        )

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message": f"Dataset upload failed: {str(e)}"

        }), 500

    finally:

        if conn:

            conn.close()


# =========================================================
# EXISTING STUDENTS - CRUD
# =========================================================

@app.route(
    "/api/students/<student_id>",
    methods=["GET"]
)
def student_details(
    student_id
):

    try:

        student_id = normalize_student_id(
            student_id
        )

        student = get_student(
            student_id
        )

        if not student:

            return jsonify({

                "success": False,

                "message":
                    "Student not found."

            }), 404

        return jsonify({

            "success": True,

            "student":
                student

        })

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500
# =========================================================
# GET ALL STUDENTS
# =========================================================

@app.route(
    "/api/students",
    methods=["GET"]
)
def get_all_normal_students():

    try:

        students = get_all_students()

        return jsonify({

            "success": True,

            "students":
                students

        })

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e),

            "students": []

        }), 500
# =========================================================
# CREATE NORMAL STUDENT
# =========================================================

@app.route(
    "/api/students",
    methods=["POST"]
)
def create_normal_student():

    try:

        data = (
            request.get_json()
            or {}
        )

        student_id = normalize_student_id(
            data.get(
                "student_id",
                ""
            )
        )

        name = str(
            data.get(
                "name",
                ""
            )
        ).strip()

        department = str(
            data.get(
                "department",
                ""
            )
        ).strip()

        semester = data.get(
            "semester"
        )

        email = data.get(
            "email"
        )

        phone = data.get(
            "phone"
        )

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------

        if not student_id:

            return jsonify({
                "success": False,
                "message": "Student ID is required."
            }), 400

        if not name:

            return jsonify({
                "success": False,
                "message": "Student name is required."
            }), 400

        if not department:

            return jsonify({
                "success": False,
                "message": "Department is required."
            }), 400

        # -------------------------------------------------
        # CREATE STUDENT
        # -------------------------------------------------

        result = create_student(
            student_id,
            name,
            department,
            semester,
            email,
            phone
        )

        # -------------------------------------------------
        # RESULT CHECK
        # -------------------------------------------------

        if not result["success"]:

            return jsonify(
                result
            ), 400

        return jsonify(
            result
        ), 201

    except Exception as e:

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500


# =========================================================
# UPDATE NORMAL STUDENT
# =========================================================

@app.route(
    "/api/students/<student_id>",
    methods=["PUT"]
)
def update_normal_student(
    student_id
):

    conn = None

    try:

        student_id = normalize_student_id(
            student_id
        )

        if not student_id:

            return jsonify({

                "success": False,

                "message":
                    "Student ID is required."

            }), 400

        data = (
            request.get_json()
            or {}
        )

        name = str(
            data.get(
                "name",
                ""
            )
        ).strip()

        department = str(
            data.get(
                "department",
                ""
            )
        ).strip()

        semester = data.get(
            "semester"
        )

        email = data.get(
            "email"
        )

        phone = data.get(
            "phone"
        )

        if not name:

            return jsonify({

                "success": False,

                "message":
                    "Student name is required."

            }), 400

        if not department:

            return jsonify({

                "success": False,

                "message":
                    "Department is required."

            }), 400

        conn = get_connection()

        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE students
            SET
                name = ?,
                department = ?,
                semester = ?,
                email = ?,
                phone = ?
            WHERE student_id = ?
            """,
            (
                name,
                department,
                semester,
                email,
                phone,
                student_id
            )
        )

        if cursor.rowcount == 0:

            conn.rollback()

            return jsonify({

                "success": False,

                "message":
                    "Student not found."

            }), 404

        conn.commit()

        return jsonify({

            "success": True,

            "message":
                "Student updated successfully.",

            "student":
                get_student(student_id)

        })

    except Exception as e:

        if conn:

            conn.rollback()

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500

    finally:

        if conn:

            conn.close()


# =========================================================
# DELETE NORMAL STUDENT
# =========================================================

@app.route(
    "/api/students/<student_id>",
    methods=["DELETE"]
)
def delete_normal_student(
    student_id
):

    conn = None

    try:

        student_id = normalize_student_id(
            student_id
        )

        if not student_id:

            return jsonify({

                "success": False,

                "message":
                    "Student ID is required."

            }), 400

        conn = get_connection()

        cursor = conn.cursor()

        cursor.execute(
            """
            DELETE FROM students
            WHERE student_id = ?
            """,
            (
                student_id,
            )
        )

        if cursor.rowcount == 0:

            conn.rollback()

            return jsonify({

                "success": False,

                "message":
                    "Student not found."

            }), 404

        conn.commit()

        return jsonify({

            "success": True,

            "message":
                "Student deleted successfully."

        })

    except Exception as e:

        if conn:

            conn.rollback()

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                str(e)

        }), 500

    finally:

        if conn:

            conn.close()

# =========================================================
# DOWNLOAD DATASET
# =========================================================

@app.route(
    "/api/datasets/<int:dataset_id>/download",
    methods=["GET"]
)
def download_uploaded_dataset(
    dataset_id
):

    try:

        conn = get_connection()

        row = conn.execute(

            """
            SELECT *
            FROM datasets
            WHERE id = ?
            LIMIT 1
            """,

            (
                dataset_id,
            )

        ).fetchone()

        conn.close()

        if not row:

            return jsonify({

                "success": False,

                "message":
                    "Dataset not found."

            }), 404

        dataset = dict(
            row
        )

        file_path = dataset.get(
            "file_path"
        )

        if not file_path:

            return jsonify({

                "success": False,

                "message":
                    "Dataset file path not found."

            }), 404

        if not os.path.exists(
            file_path
        ):

            return jsonify({

                "success": False,

                "message":
                    "Dataset file does not exist on the server."

            }), 404

        file_name = (

            dataset.get(
                "file_name"
            )

            or
            "student_dataset.csv"

        )

        return send_file(

            file_path,

            as_attachment=True,

            download_name=
                file_name,

            mimetype=
                "text/csv"

        )

    except Exception as e:

        print(
            "DATASET DOWNLOAD ERROR:",
            str(e)
        )

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                f"Dataset download failed: {str(e)}"

        }), 500


# =========================================================
# SEARCH STUDENT BY ID
# =========================================================

@app.route(
    "/api/dashboard/student/<student_id>",
    methods=["GET"]
)
def search_student_by_id(
    student_id
):

    try:

        # IMPORTANT:
        # Always treat Student ID as STRING.
        # This fixes values such as 101.0 vs 101.

        requested_student_id = normalize_student_id(
            student_id
        )

        if not requested_student_id:

            return jsonify({

                "success": False,

                "message":
                    "Student ID is required."

            }), 400

        # -------------------------------------------------
        # GET LATEST DATASET
        # -------------------------------------------------

        conn = get_connection()

        dataset_row = conn.execute(

            """
            SELECT *
            FROM datasets
            ORDER BY id DESC
            LIMIT 1
            """

        ).fetchone()

        conn.close()

        if not dataset_row:

            return jsonify({

                "success": False,

                "message":
                    "No dataset uploaded yet."

            }), 404

        dataset = dict(
            dataset_row
        )

        # -------------------------------------------------
        # FILE PATH
        # -------------------------------------------------

        file_path = dataset.get(
            "file_path"
        )

        if not file_path:

            return jsonify({

                "success": False,

                "message":
                    "Dataset file path not found."

            }), 404

        if not os.path.exists(
            file_path
        ):

            return jsonify({

                "success": False,

                "message":
                    "Dataset file does not exist."

            }), 404

        # -------------------------------------------------
        # READ CSV
        # -------------------------------------------------

        df = pd.read_csv(
            file_path
        )

        if df.empty:

            return jsonify({

                "success": False,

                "message":
                    "Dataset is empty."

            }), 404

        # -------------------------------------------------
        # FIND STUDENT ID COLUMN
        # -------------------------------------------------

        normalized_columns = {}

        for column in df.columns:

            normalized_name = (

                str(column)
                .strip()
                .lower()
                .replace(" ", "_")
                .replace("-", "_")

            )

            normalized_columns[
                normalized_name
            ] = column

        possible_id_columns = [

            "student_id",
            "studentid",
            "id",
            "roll_no",
            "roll_number",
            "register_number",
            "registration_number"

        ]

        student_id_col = None

        for name in possible_id_columns:

            if name in normalized_columns:

                student_id_col = (
                    normalized_columns[
                        name
                    ]
                )

                break

        if not student_id_col:

            return jsonify({

                "success": False,

                "message":
                    "Student ID column not found in the dataset."

            }), 400

        # -------------------------------------------------
        # NORMALIZED SEARCH
        # -------------------------------------------------

        matched_index = None

        for index, value in (
            df[student_id_col].items()
        ):

            dataset_student_id = (
                normalize_student_id(
                    value
                )
            )

            if (
                dataset_student_id.lower()
                ==
                requested_student_id.lower()
            ):

                matched_index = index

                break

        if matched_index is None:

            return jsonify({

                "success": False,

                "message":
                    f"Student ID '{requested_student_id}' not found."

            }), 404

        # -------------------------------------------------
        # GET STUDENT
        # -------------------------------------------------

        student = (
            df.loc[
                matched_index
            ]
            .to_dict()
        )

        # -------------------------------------------------
        # ENRICH
        # -------------------------------------------------

        student = enrich_student_data(
            student
        )
                # -------------------------------------------------
        # EXTRACT SUBJECT MARKS DYNAMICALLY
        # -------------------------------------------------

        subject_marks = {}

        excluded_subject_columns = {

            "student_id",
            "studentid",
            "id",
            "name",
            "student_name",
            "department",
            "branch",
            "semester",

            "attendance_percentage",
            "attendance",

            "study_hours_per_day",
            "study_hours",

            "assignment_score",
            "assignment_marks",

            "internal_1_marks",
            "internal_2_marks",
            "internal_1",
            "internal_2",

            "previous_semester_percentage",
            "previous_percentage",

            "backlog_count",
            "backlogs",

            "sleep_hours_per_day",
            "practice_tests_completed",
            "learning_activity_score",

            "final_exam_percentage",
            "final_exam_score",

            "overall_performance_percentage",
            "overall_percentage",
            "overall_performance",
            "overall_score",
            "average_subject_marks",

            "performance_category",
            "risk_status",
            "performance_trend",
            "lowest_subject"
        }

        excluded_words = [

            "overall",
            "attendance",
            "study",
            "assignment",
            "internal",
            "previous",
            "backlog",
            "risk",
            "performance",
            "percentage",
            "trend",
            "semester",
            "sleep",
            "practice",
            "learning_activity",
            "final_exam",
            "average_subject"
        ]

        for column in df.columns:

            normalized_column = (

                str(column)
                .strip()
                .lower()
                .replace(" ", "_")
                .replace("-", "_")

            )

            if normalized_column in excluded_subject_columns:
                continue

            if any(
                word in normalized_column
                for word in excluded_words
            ):
                continue

            # Only consider mark / score columns
            if not (
                "mark" in normalized_column
                or "score" in normalized_column
            ):
                continue

            value = student.get(column)

            try:

                numeric_value = float(value)

                if (
                    0 <= numeric_value <= 100
                ):

                    # Clean subject name
                    subject_name = (

                        str(column)
                        .replace("_marks", "")
                        .replace("_mark", "")
                        .replace("_score", "")
                        .replace("_", " ")
                        .strip()
                        .title()

                    )

                    subject_marks[
                        subject_name
                    ] = numeric_value

            except (
                ValueError,
                TypeError
            ):

                continue

        student[
            "subject_marks"
        ] = subject_marks

        # -------------------------------------------------
        # FORCE STUDENT ID TO STRING
        # -------------------------------------------------

        student[
            student_id_col
        ] = requested_student_id

        # -------------------------------------------------
        # DATASET NAME
        # -------------------------------------------------

        dataset_name = (

            dataset.get(
                "dataset_name"
            )

            or dataset.get(
                "name"
            )

            or "Uploaded Dataset"

        )

        return jsonify({

            "success": True,

            "message":
                "Student found successfully.",

            "student":
                student,

            "dataset": {

                "id":
                    dataset.get(
                        "id"
                    ),

                "name":
                    dataset_name,

                "file_name":
                    dataset.get(
                        "file_name"
                    )

            }

        }), 200

    except pd.errors.EmptyDataError:

        return jsonify({

            "success": False,

            "message":
                "Dataset file is empty."

        }), 400

    except pd.errors.ParserError:

        return jsonify({

            "success": False,

            "message":
                "Invalid dataset CSV format."

        }), 400

    except Exception as e:

        print(
            "STUDENT ID SEARCH ERROR:",
            str(e)
        )

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message":
                f"Student search failed: {str(e)}"

        }), 500

# =========================================================
# GET LATEST VALID DATASET
# =========================================================

def get_latest_usable_dataset():

    conn = get_connection()

    try:
        rows = conn.execute("""
            SELECT *
            FROM datasets
            ORDER BY id DESC
        """).fetchall()

    finally:
        conn.close()

    if not rows:
        return None, None, "No dataset uploaded yet."

    for row in rows:

        dataset = dict(row)
        file_path = dataset.get("file_path")

        if not file_path or not os.path.isfile(file_path):
            continue

        try:
            df = pd.read_csv(file_path)

            if df.empty or len(df.columns) == 0:
                continue

            return dataset, df, None

        except (
            pd.errors.EmptyDataError,
            pd.errors.ParserError,
            OSError,
            UnicodeDecodeError,
            ValueError
        ) as error:

            print(
                "Skipping invalid dataset:",
                dataset.get("id"),
                str(error)
            )

    return (
        None,
        None,
        "No readable, non-empty dataset was found."
    )


# =========================================================
# DASHBOARD ANALYTICS
# =========================================================

@app.route("/api/dashboard/analytics", methods=["GET"])
def dashboard_analytics():

    try:

        dataset, df, dataset_error = (
            get_latest_usable_dataset()
        )

        if dataset is None:
            return jsonify({
                "success": False,
                "message": dataset_error
            }), 404

        enriched_students = []

        for _, row in df.iterrows():

            student = row.to_dict()

            student = enrich_student_data(student)

            enriched_students.append(student)

        excellent = 0
        good = 0
        average = 0

        overall_values = []

        for student in enriched_students:

            overall = get_numeric_value(
                student,
                [
                    "overall_performance_percentage",
                    "overall_percentage",
                    "overall_performance",
                    "overall_score"
                ]
            )

            if overall is not None:
                overall_values.append(overall)

            category = get_student_value(
                student,
                ["performance_category"]
            )

            if category is not None:

                category_text = (
                    str(category).strip().lower()
                )

                if category_text == "excellent":
                    excellent += 1

                elif category_text == "good":
                    good += 1

                elif category_text in [
                    "average",
                    "needs improvement",
                    "needs_improvement"
                ]:
                    average += 1

        # -------------------------------------------------
        # RISK
        # -------------------------------------------------

        high_risk = 0
        medium_risk = 0
        low_risk = 0

        for student in enriched_students:

            risk_value = get_student_value(
                student,
                [
                    "risk_status",
                    "risk",
                    "risk_level"
                ]
            )

            if risk_value is None:
                continue

            risk_text = (
                str(risk_value).strip().lower()
            )

            if risk_text == "high":
                high_risk += 1

            elif risk_text == "medium":
                medium_risk += 1

            elif risk_text == "low":
                low_risk += 1

        # -------------------------------------------------
        # OVERALL AVERAGE
        # -------------------------------------------------

        overall_average = 0

        if overall_values:
            overall_average = round(
                sum(overall_values) / len(overall_values),
                2
            )

        # -------------------------------------------------
        # DATASET DETAILS
        # -------------------------------------------------

        dataset_name = (
            dataset.get("dataset_name")
            or dataset.get("name")
            or dataset.get("file_name")
            or "Uploaded Dataset"
        )

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return jsonify({

            "success": True,

            "dataset": {
                "id": dataset.get("id"),
                "name": dataset_name,
                "file_name": dataset.get("file_name"),
                "total_records": int(len(df)),
                "total_columns": int(len(df.columns))
            },

            "performance": {
                "excellent": excellent,
                "good": good,
                "average": average
            },

            "risk": {
                "high": high_risk,
                "medium": medium_risk,
                "low": low_risk
            },

            "overall_average": overall_average

        }), 200

    except pd.errors.EmptyDataError:

        return jsonify({
            "success": False,
            "message": "Dataset file is empty."
        }), 400

    except pd.errors.ParserError:

        return jsonify({
            "success": False,
            "message": "Invalid dataset CSV format."
        }), 400

    except Exception as e:

        print("DASHBOARD ANALYTICS ERROR:", str(e))
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": f"Dashboard analytics failed: {str(e)}"
        }), 500


# =========================================================
# TOP 3 PERFORMERS API
# Department + Year + Semester-wise Ranking
# =========================================================

@app.route("/api/dashboard/top-performers", methods=["GET"])
def dashboard_top_performers():

    try:
        import re
        import pandas as pd

        dataset, df, dataset_error = get_latest_usable_dataset()

        if dataset is None:
            return jsonify({
                "success": False,
                "message": dataset_error,
                "groups": []
            }), 404

        if df is None or df.empty:
            return jsonify({
                "success": True,
                "groups": [],
                "message": "The dataset has no student records."
            }), 200

        # Normalize different header formats
        def norm(value):
            return re.sub(
                r"[^a-z0-9]+", "_",
                str(value).strip().lower()
            ).strip("_")

        columns = {norm(c): c for c in df.columns}

        def find_col(aliases):
            for alias in aliases:
                if norm(alias) in columns:
                    return columns[norm(alias)]
            return None

        department_col = find_col([
            "department", "dept", "branch",
            "course", "department_name"
        ])

        year_col = find_col([
            "year", "study_year", "academic_year",
            "year_of_study", "student_year"
        ])

        semester_col = find_col([
            "semester", "sem", "semester_number",
            "current_semester"
        ])

        id_col = find_col([
            "student_id", "studentid", "id",
            "roll_no", "roll_number",
            "register_number", "registration_number",
            "admission_number"
        ])

        name_col = find_col([
            "student_name", "name", "full_name",
            "student"
        ])

        score_col = find_col([
            "overall_performance_percentage",
            "overall_percentage",
            "overall_performance",
            "overall_score",
            "average_subject_marks",
            "average_marks",
            "total_marks",
            "final_exam_percentage",
            "percentage",
            "marks",
            "score",
            "grade_point_average",
            "gpa",
            "cgpa"
        ])

        # If no direct overall score exists, look for
        # numeric subject-mark columns.
        excluded_words = [
            "id", "roll", "register", "phone",
            "attendance", "study_hours", "sleep",
            "backlog", "risk", "category", "year",
            "semester", "department", "percentage",
            "performance", "trend", "count"
        ]

        subject_cols = []

        for col in df.columns:
            key = norm(col)

            if col in [
                department_col, year_col, semester_col,
                id_col, name_col
            ]:
                continue

            if any(word in key for word in excluded_words):
                continue

            numeric = pd.to_numeric(df[col], errors="coerce")

            if numeric.notna().sum() > 0:
                subject_cols.append(col)

        # Use overall score first; otherwise calculate
        # the average of detected numeric subject columns.
        if score_col is None and not subject_cols:
            return jsonify({
                "success": False,
                "message": (
                    "No suitable marks or performance column "
                    "was found in this dataset."
                ),
                "groups": []
            }), 400

        group_columns = [
            col for col in [
                department_col, year_col, semester_col
            ] if col is not None
        ]

        work = df.copy()

        def display_value(value, fallback="Not specified"):
            if pd.isna(value) or str(value).strip() == "":
                return fallback
            return str(value).strip()

        work["_rank_score"] = (
            pd.to_numeric(work[score_col], errors="coerce")
            if score_col is not None
            else pd.Series(float("nan"), index=work.index)
        )

        if score_col is None:
            work["_rank_score"] = (
                work[subject_cols]
                .apply(pd.to_numeric, errors="coerce")
                .mean(axis=1)
            )

        # Use the overall score when present; fill missing
        # scores from available subject marks where possible.
        if score_col is not None and subject_cols:
            missing = work["_rank_score"].isna()
            subject_average = (
                work.loc[missing, subject_cols]
                .apply(pd.to_numeric, errors="coerce")
                .mean(axis=1)
            )
            work.loc[missing, "_rank_score"] = subject_average

        work = work.dropna(subset=["_rank_score"])

        if work.empty:
            return jsonify({
                "success": False,
                "message": "No valid numeric performance scores found.",
                "groups": []
            }), 400

        # Group by whichever academic columns are available.
        # If none exist, show one overall group.
        if group_columns:
            grouped = work.groupby(
                group_columns,
                dropna=False,
                sort=False
            )
        else:
            grouped = [("All Students", work)]

        groups = []

        for group_key, group_df in grouped:
            if not isinstance(group_key, tuple):
                group_key = (group_key,)

            group_info = {
                "department": "All Departments",
                "year": "All Years",
                "semester": "All Semesters"
            }

            for col, value in zip(group_columns, group_key):
                if col == department_col:
                    group_info["department"] = display_value(value)
                elif col == year_col:
                    group_info["year"] = display_value(value)
                elif col == semester_col:
                    group_info["semester"] = display_value(value)

            # Stable sorting keeps ties deterministic.
            ranked = group_df.sort_values(
                "_rank_score",
                ascending=False,
                kind="mergesort"
            ).head(3)

            students = []

            for rank, (index, row) in enumerate(
                ranked.iterrows(), start=1
            ):
                student_id = (
                    display_value(row[id_col], "N/A")
                    if id_col else f"Record {index + 1}"
                )

                student_name = (
                    display_value(row[name_col], student_id)
                    if name_col else student_id
                )

                students.append({
                    "rank": rank,
                    "student_id": student_id,
                    "name": student_name,
                    "score": round(float(row["_rank_score"]), 2)
                })

            groups.append({
                **group_info,
                "students": students
            })

        return jsonify({
            "success": True,
            "dataset": {
                "id": dataset.get("id"),
                "name": (
                    dataset.get("dataset_name")
                    or dataset.get("name")
                    or dataset.get("file_name")
                    or "Uploaded Dataset"
                )
            },
            "score_column": score_col or "Average subject marks",
            "grouping_columns": group_columns,
            "groups": groups
        }), 200

    except Exception as error:
        print("TOP PERFORMERS ERROR:", error)
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": "Unable to calculate Top 3 Performers.",
            "error": str(error),
            "groups": []
        }), 500

# =========================================================
# DETAILED ANALYTICS API
# =========================================================

@app.route("/api/analytics/detailed", methods=["GET"])
def detailed_analytics():

    try:

        # -------------------------------------------------
        # GET LATEST VALID DATASET
        # -------------------------------------------------

        dataset, df, dataset_error = (
            get_latest_usable_dataset()
        )

        if dataset is None:
            return jsonify({
                "success": False,
                "message": dataset_error
            }), 404

        dataset_id = dataset.get("id")

        dataset_name = (
            dataset.get("dataset_name")
            or dataset.get("name")
            or dataset.get("file_name")
            or "Uploaded Dataset"
        )

        dataset_file_name = dataset.get("file_name")

        # -------------------------------------------------
        # HELPER FUNCTIONS
        # -------------------------------------------------

        def normalize_column_name(column):

            return (
                str(column)
                .strip()
                .lower()
                .replace(" ", "_")
                .replace("-", "_")
            )

        def get_value_from_row(row, aliases):

            normalized_row = {
                normalize_column_name(key): value
                for key, value in row.items()
            }

            for alias in aliases:

                alias_name = normalize_column_name(alias)

                if alias_name in normalized_row:

                    value = normalized_row[alias_name]

                    try:
                        number = float(value)

                        if pd.notna(number):
                            return number

                    except (ValueError, TypeError):
                        pass

            return None

        def round_value(value):

            if value is None:
                return None

            return round(float(value), 2)

        def calculate_average(values):

            valid_values = [
                float(value)
                for value in values
                if value is not None and pd.notna(value)
            ]

            if not valid_values:
                return None

            return round_value(
                sum(valid_values) / len(valid_values)
            )

        def display_subject_name(column):

            name = (
                str(column)
                .replace("_", " ")
                .replace("-", " ")
                .strip()
            )

            return " ".join(
                word.capitalize()
                for word in name.split()
            )

        # -------------------------------------------------
        # COLUMN ALIASES
        # -------------------------------------------------

        overall_aliases = [
            "overall_performance_percentage",
            "overall_percentage",
            "overall_performance",
            "overall_score",
            "final_exam_percentage"
        ]

        attendance_aliases = [
            "attendance_percentage",
            "attendance_percent",
            "attendance",
            "attendance_rate"
        ]

        study_hours_aliases = [
            "study_hours_per_day",
            "study_hours",
            "daily_study_hours",
            "average_study_hours"
        ]

        # -------------------------------------------------
        # OVERALL PERFORMANCE DATA
        # -------------------------------------------------

        overall_values = []
        attendance_data = []
        study_hours_data = []

        for _, row in df.iterrows():

            student = row.to_dict()

            overall = get_value_from_row(
                student,
                overall_aliases
            )

            attendance = get_value_from_row(
                student,
                attendance_aliases
            )

            study_hours = get_value_from_row(
                student,
                study_hours_aliases
            )

            if overall is None:

                try:
                    overall = calculate_overall_performance(
                        student
                    )

                except Exception:
                    overall = None

            if overall is not None:
                overall_values.append(overall)

            if (
                attendance is not None
                and overall is not None
            ):
                attendance_data.append({
                    "attendance": attendance,
                    "performance": overall
                })

            if (
                study_hours is not None
                and overall is not None
            ):
                study_hours_data.append({
                    "study_hours": study_hours,
                    "performance": overall
                })

        # -------------------------------------------------
        # FLEXIBLE SUBJECT-WISE PERFORMANCE
        # -------------------------------------------------

        excluded_columns = {
            "student_id", "studentid", "id", "roll_no",
            "roll_number", "register_number", "registration_number",
            "name", "student_name", "department", "semester",
            "attendance_percentage", "attendance", "study_hours_per_day",
            "study_hours", "assignment_score", "internal_1_marks",
            "internal_2_marks", "previous_semester_percentage",
            "learning_activity_score", "backlog_count",
            "sleep_hours_per_day", "practice_tests_completed",
            "final_exam_percentage", "overall_performance_percentage",
            "overall_percentage", "overall_performance", "overall_score",
            "average_subject_marks", "performance_category", "risk_status",
            "risk", "risk_level", "performance_trend", "trend"
        }

        excluded_words = [
            "overall", "attendance", "study", "assignment", "internal",
            "previous", "backlog", "risk", "performance", "percentage",
            "percent", "trend", "semester", "sleep", "practice",
            "final_exam", "learning_activity", "average_subject"
        ]

        subject_values = {}

        def add_subject_value(subject_name, mark_value):

            try:

                clean_name = str(subject_name).strip()
                numeric_value = float(mark_value)

                if not clean_name:
                    return

                if not (0 <= numeric_value <= 100):
                    return

                normalized_subject = normalize_column_name(
                    clean_name
                )

                if normalized_subject in excluded_columns:
                    return

                subject_values.setdefault(
                    clean_name, []
                ).append(numeric_value)

            except (TypeError, ValueError):
                return

        for column in df.columns:

            normalized_column = normalize_column_name(column)

            # Combined subject text columns
            if normalized_column in {
                "subject",
                "subjects",
                "subject_marks",
                "subject_scores",
                "marks_details"
            }:

                for raw_value in df[column].dropna():

                    text_value = str(raw_value).strip()

                    for item in re.split(
                        r"\s*[|;,]\s*",
                        text_value
                    ):

                        if ":" not in item:
                            continue

                        subject_name, mark_value = item.split(
                            ":", 1
                        )

                        add_subject_value(
                            subject_name,
                            mark_value
                        )

                continue

            if normalized_column in excluded_columns:
                continue

            if any(
                word in normalized_column
                for word in excluded_words
            ):
                continue

            numeric_values = pd.to_numeric(
                df[column],
                errors="coerce"
            ).dropna()

            numeric_values = numeric_values[
                (numeric_values >= 0)
                & (numeric_values <= 100)
            ]

            if len(numeric_values) == 0:
                continue

            for numeric_value in numeric_values:

                add_subject_value(
                    column,
                    numeric_value
                )

        subject_analysis = []

        for subject_name, values in subject_values.items():

            if not values:
                continue

            subject_analysis.append({
                "subject": display_subject_name(subject_name),
                "average": round_value(
                    sum(values) / len(values)
                ),
                "highest": round_value(max(values)),
                "lowest": round_value(min(values)),
                "students": int(len(values))
            })

        subject_analysis.sort(
            key=lambda item: item["subject"].lower()
        )

        # -------------------------------------------------
        # ATTENDANCE VS PERFORMANCE
        # -------------------------------------------------

        attendance_groups = [
            {
                "range": "Below 60%",
                "minimum": 0,
                "maximum": 60
            },
            {
                "range": "60% - 74%",
                "minimum": 60,
                "maximum": 75
            },
            {
                "range": "75% - 89%",
                "minimum": 75,
                "maximum": 90
            },
            {
                "range": "90% and above",
                "minimum": 90,
                "maximum": 101
            }
        ]

        attendance_analysis = []

        for group in attendance_groups:

            matching_values = [
                item["performance"]
                for item in attendance_data
                if (
                    item["attendance"] >= group["minimum"]
                    and item["attendance"] < group["maximum"]
                )
            ]

            attendance_analysis.append({
                "range": group["range"],
                "students": len(matching_values),
                "average_performance": calculate_average(
                    matching_values
                )
            })

        # -------------------------------------------------
        # STUDY HOURS VS PERFORMANCE
        # -------------------------------------------------

        study_groups = [
            {
                "range": "Below 2 hours",
                "minimum": 0,
                "maximum": 2
            },
            {
                "range": "2 - 4 hours",
                "minimum": 2,
                "maximum": 4
            },
            {
                "range": "4 - 6 hours",
                "minimum": 4,
                "maximum": 6
            },
            {
                "range": "6 hours and above",
                "minimum": 6,
                "maximum": 1000
            }
        ]

        study_hours_analysis = []

        for group in study_groups:

            matching_values = [
                item["performance"]
                for item in study_hours_data
                if (
                    item["study_hours"] >= group["minimum"]
                    and item["study_hours"] < group["maximum"]
                )
            ]

            study_hours_analysis.append({
                "range": group["range"],
                "students": len(matching_values),
                "average_performance": calculate_average(
                    matching_values
                )
            })

        # -------------------------------------------------
        # DATA-DRIVEN INSIGHTS
        # -------------------------------------------------

        insights = []

        overall_average = calculate_average(
            overall_values
        )

        if overall_average is not None:

            insights.append(
                f"Overall average performance is "
                f"{overall_average}% based on the dataset."
            )

        if subject_analysis:

            lowest_subject = min(
                subject_analysis,
                key=lambda item: (
                    item["average"]
                    if item["average"] is not None
                    else 0
                )
            )

            insights.append(
                f"{lowest_subject['subject']} has the "
                f"lowest average subject performance."
            )

        if attendance_data:

            insights.append(
                "Attendance and performance data are "
                "available for comparison."
            )

        else:

            insights.append(
                "Attendance data is not available "
                "for enough records."
            )

        if study_hours_data:

            insights.append(
                "Study hours and performance data are "
                "available for comparison."
            )

        else:

            insights.append(
                "Study hours data is not available "
                "for enough records."
            )

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return jsonify({

            "success": True,

            "dataset": {
                "id": dataset_id,
                "name": dataset_name,
                "file_name": dataset_file_name,
                "total_students": int(len(df)),
                "total_columns": int(len(df.columns))
            },

            "summary": {
                "total_students": int(len(df)),
                "overall_average": overall_average
            },

            "subject_analysis": subject_analysis,

            "attendance_analysis": attendance_analysis,

            "study_hours_analysis": study_hours_analysis,

            "insights": insights,

            "available_features": {
                "subject_analysis": len(subject_analysis) > 0,
                "attendance_analysis": len(attendance_data) > 0,
                "study_hours_analysis": len(study_hours_data) > 0
            }

        }), 200

    except pd.errors.EmptyDataError:

        return jsonify({
            "success": False,
            "message": "Dataset file is empty."
        }), 400

    except pd.errors.ParserError:

        return jsonify({
            "success": False,
            "message": "Unable to read dataset format."
        }), 400

    except Exception as error:

        print("Detailed Analytics Error:", error)
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "An error occurred while generating detailed analytics."
            ),
            "error": str(error)
        }), 500

# =========================================================
# STRICT AT-RISK STUDENT DETECTION API
# =========================================================

@app.route(
    "/api/analytics/at-risk",
    methods=["GET"]
)
def at_risk_students():

    try:

        # -------------------------------------------------
        # 1. GET LATEST DATASET
        # -------------------------------------------------

        conn = get_connection()

        dataset = conn.execute("""
            SELECT *
            FROM datasets
            ORDER BY id DESC
            LIMIT 1
        """).fetchone()

        conn.close()

        if not dataset:

            return jsonify({
                "success": False,
                "message": "No dataset available."
            }), 404

        file_path = dataset["file_path"]

        if not file_path or not os.path.exists(file_path):

            return jsonify({
                "success": False,
                "message": "Dataset file not found."
            }), 404

        # -------------------------------------------------
        # 2. READ DATASET
        # -------------------------------------------------

        df = pd.read_csv(file_path)

        if df.empty:

            return jsonify({
                "success": False,
                "message": "Dataset is empty."
            }), 400

        at_risk_students = []

        # -------------------------------------------------
        # 3. PROCESS EACH STUDENT
        # -------------------------------------------------

        for _, row in df.iterrows():

            student = row.to_dict()

            student = enrich_student_data(student)

            # -------------------------------------------------
            # GET ACADEMIC VALUES
            # -------------------------------------------------

            overall = get_numeric_value(
                student,
                [
                    "overall_performance_percentage",
                    "overall_percentage",
                    "overall_performance",
                    "overall_score"
                ]
            )

            attendance = get_numeric_value(
                student,
                [
                    "attendance_percentage",
                    "attendance"
                ]
            )

            backlog = get_numeric_value(
                student,
                [
                    "backlog_count",
                    "backlogs"
                ]
            )

            study_hours = get_numeric_value(
                student,
                [
                    "study_hours_per_day",
                    "study_hours"
                ]
            )

            # -------------------------------------------------
            # STRICT RISK CONDITIONS
            # -------------------------------------------------

            high_risk = False
            medium_risk = False

            # Serious academic performance
            if overall is not None:

                if overall < 50:

                    high_risk = True

                elif overall < 60:

                    medium_risk = True

            # Serious attendance issue
            if attendance is not None:

                if attendance < 50:

                    high_risk = True

                elif attendance < 60:

                    medium_risk = True

            # Serious backlog issue
            if backlog is not None:

                if backlog >= 3:

                    high_risk = True

                elif backlog >= 2:

                    medium_risk = True

            # -------------------------------------------------
            # FINAL RISK STATUS
            # -------------------------------------------------

            if high_risk:

                risk_status = "High"

            elif medium_risk:

                risk_status = "Medium"

            else:

                risk_status = "Low"

            # -------------------------------------------------
            # RISK REASONS
            # -------------------------------------------------

            reasons = []

            if overall is not None:

                if overall < 50:

                    reasons.append(
                        "Very low overall performance"
                    )

                elif overall < 60:

                    reasons.append(
                        "Low overall performance"
                    )

            if attendance is not None:

                if attendance < 50:

                    reasons.append(
                        "Very low attendance"
                    )

                elif attendance < 60:

                    reasons.append(
                        "Low attendance"
                    )

            if backlog is not None:

                if backlog >= 3:

                    reasons.append(
                        "Multiple academic backlogs"
                    )

                elif backlog >= 2:

                    reasons.append(
                        "Two or more academic backlogs"
                    )

            if study_hours is not None:

                if study_hours < 2:

                    reasons.append(
                        "Very low daily study hours"
                    )

            # Default reason
            if not reasons and risk_status == "High":

                reasons.append(
                    "High academic risk detected"
                )

            elif not reasons and risk_status == "Medium":

                reasons.append(
                    "Academic performance needs attention"
                )

            # -------------------------------------------------
            # STUDENT DETAILS
            # -------------------------------------------------

            student_id = get_student_value(
                student,
                [
                    "student_id",
                    "studentid",
                    "id",
                    "roll_no",
                    "roll_number",
                    "register_number",
                    "registration_number"
                ]
            )

            name = get_student_value(
                student,
                [
                    "name",
                    "student_name",
                    "studentname"
                ]
            )

            department = get_student_value(
                student,
                [
                    "department",
                    "branch",
                    "course"
                ]
            )

            semester = get_student_value(
                student,
                [
                    "semester",
                    "sem"
                ]
            )

            trend = calculate_performance_trend(
                student,
                overall
            )

            # -------------------------------------------------
            # INCLUDE ONLY HIGH AND MEDIUM RISK
            # -------------------------------------------------

            if risk_status in [
                "High",
                "Medium"
            ]:

                at_risk_students.append({

                    "student_id": normalize_student_id(
                        student_id
                    ),

                    "name": (
                        str(name)
                        if name is not None
                        else "Unknown"
                    ),

                    "department": (
                        str(department)
                        if department is not None
                        else "Not available"
                    ),

                    "semester": semester,

                    "overall_performance": overall,

                    "attendance": attendance,

                    "backlog_count": backlog,

                    "study_hours": study_hours,

                    "risk_status": risk_status,

                    "performance_trend": trend,

                    "reasons": reasons

                })

        # -------------------------------------------------
        # 4. SORT RISK STUDENTS
        # -------------------------------------------------

        risk_order = {
            "High": 1,
            "Medium": 2
        }

        at_risk_students.sort(
            key=lambda student: (
                risk_order.get(
                    student["risk_status"],
                    3
                ),
                student["overall_performance"]
                if student["overall_performance"] is not None
                else 0
            )
        )

        # -------------------------------------------------
        # 5. RISK SUMMARY
        # -------------------------------------------------

        high_risk_count = len([

            student
            for student in at_risk_students
            if student["risk_status"] == "High"

        ])

        medium_risk_count = len([

            student
            for student in at_risk_students
            if student["risk_status"] == "Medium"

        ])

        # -------------------------------------------------
        # 6. RETURN RESPONSE
        # -------------------------------------------------

        return jsonify({

            "success": True,

            "summary": {

                "total_at_risk": len(
                    at_risk_students
                ),

                "high_risk": high_risk_count,

                "medium_risk": medium_risk_count

            },

            "students": at_risk_students

        }), 200

    # -----------------------------------------------------
    # ERROR HANDLING
    # -----------------------------------------------------

    except pd.errors.EmptyDataError:

        return jsonify({

            "success": False,

            "message": "Dataset file is empty."

        }), 400

    except pd.errors.ParserError:

        return jsonify({

            "success": False,

            "message": "Invalid dataset CSV format."

        }), 400

    except FileNotFoundError:

        return jsonify({

            "success": False,

            "message": "Dataset file not found."

        }), 404

    except Exception as e:

        print(
            "STRICT AT-RISK API ERROR:",
            str(e)
        )

        traceback.print_exc()

        return jsonify({

            "success": False,

            "message": (
                "Unable to generate strict "
                "at-risk student analysis."
            ),

            "error": str(e)

        }), 500


# =========================================================
# AI PERFORMANCE PREDICTION
# =========================================================

@app.route("/api/prediction/student/<student_id>", methods=["GET"])
def student_prediction(student_id):
    try:
        import re

        requested_student_id = normalize_student_id(student_id)

        if not requested_student_id:
            return jsonify({
                "success": False,
                "message": "Student ID is required."
            }), 400

        # Normalize column names consistently with preprocessing.py
        def normalize_prediction_column(column):
            name = str(column).strip().lower()
            name = re.sub(r"[^a-z0-9]+", "_", name)
            return name.strip("_")

        # -------------------------------------------------
        # 1. GET SELECTED DATASET
        # -------------------------------------------------
        requested_dataset_id = request.args.get(
            "dataset_id", type=int
        )

        conn = get_connection()

        try:
            if requested_dataset_id is not None:
                dataset = conn.execute(
                    "SELECT * FROM datasets WHERE id = ?",
                    (requested_dataset_id,)
                ).fetchone()
            else:
                dataset = conn.execute("""
                    SELECT *
                    FROM datasets
                    ORDER BY id DESC
                    LIMIT 1
                """).fetchone()
        finally:
            conn.close()

        if not dataset:
            return jsonify({
                "success": False,
                "message": "Dataset not found."
            }), 404

        file_path = dataset["file_path"]

        if not file_path or not os.path.isfile(file_path):
            return jsonify({
                "success": False,
                "message": "The selected dataset file was not found."
            }), 404

        dataset_model_name = os.path.basename(file_path)
        dataset_model_key = canonical_dataset_key(dataset_model_name)

        # -------------------------------------------------
        # 2. VERIFY THAT THIS DATASET HAS A TRAINED MODEL
        # -------------------------------------------------
        try:
            feature_columns = load_feature_columns(
                dataset_model_key
            )

        except FileNotFoundError:
            # Backward-compatible recovery for datasets uploaded before
            # automatic training was added. Do not retrain if artifacts exist.
            try:
                train_dataset(file_path)
                feature_columns = load_feature_columns(
                    dataset_model_key
                )
            except Exception as training_error:
                print(
                    "ON-DEMAND DATASET TRAINING ERROR:",
                    str(training_error)
                )
                traceback.print_exc()
                return jsonify({
                    "success": False,
                    "error_type": "model_not_available",
                    "message": (
                        f"AI prediction is not available for "
                        f"'{dataset_model_name}'. Automatic training "
                        "was attempted but no usable model was created. "
                        "Check the backend training log and ensure the CSV "
                        "has enough valid student records, usable features, "
                        "and a target/performance column that can be derived."
                    ),
                    "training_error": str(training_error),
                    "dataset_id": dataset["id"],
                    "dataset_name": dataset_model_name
                }), 409

        if not isinstance(feature_columns, (list, tuple)) \
                or not feature_columns:
            return jsonify({
                "success": False,
                "error_type": "invalid_model_features",
                "message": (
                    "The trained model has no usable feature columns. "
                    "Please retrain this dataset after validating "
                    "its columns and student records."
                )
            }), 409

        # -------------------------------------------------
        # 3. READ DATASET
        # -------------------------------------------------
        try:
            df = pd.read_csv(file_path)
        except pd.errors.EmptyDataError:
            return jsonify({
                "success": False,
                "message": "The selected dataset is empty."
            }), 400

        if df.empty:
            return jsonify({
                "success": False,
                "message": "The selected dataset contains no records."
            }), 400

        # Preserve original column names for the student response.
        # Build a normalized view for flexible column matching.
        original_columns = list(df.columns)
        normalized_columns = [
            normalize_prediction_column(column)
            for column in original_columns
        ]

        # Avoid collisions after normalization.
        seen = {}
        unique_normalized_columns = []

        for column in normalized_columns:
            count = seen.get(column, 0)
            unique_normalized_columns.append(
                column if count == 0 else f"{column}_{count}"
            )
            seen[column] = count + 1

        normalized_df = df.copy()
        normalized_df.columns = unique_normalized_columns

        # -------------------------------------------------
        # 4. FIND STUDENT ID COLUMN
        # -------------------------------------------------
        id_candidates = [
    "student_id",
    "studentid",
    "student_number",
    "student_no",
    "id",
    "roll_no",
    "roll_number",
    "rollno",
    "roll",
    "register_number",
    "registration_number",
    "registration_no",
    "reg_no",
    "reg_number",
    "admission_number",
    "admission_no",
    "enrollment_number",
    "enrolment_number",
    "enrollment_no",
    "enrolment_no",
]

        id_column = next(
            (
                column for column in id_candidates
                if column in normalized_df.columns
            ),
            None
        )

        if id_column is None:
            return jsonify({
                "success": False,
                "message": (
                    "Student ID column was not found in the "
                    "selected dataset. Please check the CSV headers."
                )
            }), 400

        # -------------------------------------------------
        # 5. FIND THE REQUESTED STUDENT
        # -------------------------------------------------
        matched_index = None

        for index, value in normalized_df[id_column].items():
            current_id = normalize_student_id(value)

            if (
                current_id
                and current_id.lower()
                == requested_student_id.lower()
            ):
                matched_index = index
                break

        if matched_index is None:
            return jsonify({
                "success": False,
                "message": (
                    f"Student '{requested_student_id}' was not "
                    "found in the selected dataset."
                )
            }), 404

        matched_row = df.loc[matched_index]

        if isinstance(matched_row, pd.DataFrame):
            matched_row = matched_row.iloc[0]

        student_data = matched_row.to_dict()

        # Use the original ID column name in the response.
        original_id_column = original_columns[
            unique_normalized_columns.index(id_column)
        ]
        student_data[original_id_column] = requested_student_id

        student_data = enrich_student_data(student_data)

        # -------------------------------------------------
        # 6. PREPARE FEATURES USING NORMALIZED COLUMN NAMES
        # -------------------------------------------------
        normalized_student_data = {}

        for column, value in student_data.items():
            normalized_name = normalize_prediction_column(column)

            # Do not overwrite a valid value with a missing alias.
            if normalized_name not in normalized_student_data:
                normalized_student_data[normalized_name] = value
            elif (
                normalized_student_data[normalized_name] is None
                or pd.isna(normalized_student_data[normalized_name])
            ) and not pd.isna(value):
                normalized_student_data[normalized_name] = value

        prediction_input = {}

        for feature in feature_columns:
            normalized_feature = normalize_prediction_column(feature)

            value = normalized_student_data.get(
                normalized_feature
            )

            # Let the fitted pipeline handle missing values.
            try:
                if value is None or pd.isna(value):
                    value = None
            except (TypeError, ValueError):
                pass

            prediction_input[feature] = value

        # -------------------------------------------------
        # 7. PREDICT USING THE MATCHING DATASET MODEL
        # -------------------------------------------------
        try:
            result = predict_performance(
                prediction_input,
                dataset_model_key
            )

        except FileNotFoundError:
            return jsonify({
                "success": False,
                "error_type": "model_artifacts_missing",
                "message": (
                    f"Required trained model files are missing for "
                    f"'{dataset_model_name}'. Please retrain this "
                    "dataset before requesting predictions."
                ),
                "dataset_id": dataset["id"],
                "dataset_name": dataset_model_name
            }), 409

        if not result.get("success"):
            return jsonify({
                "success": False,
                "message": "The model could not generate a prediction."
            }), 422

        # -------------------------------------------------
        # 8. RETURN PREDICTION
        # -------------------------------------------------
        dataset_keys = dataset.keys()

        dataset_display_name = (
            dataset["dataset_name"]
            if "dataset_name" in dataset_keys
            and dataset["dataset_name"]
            else (
                dataset["name"]
                if "name" in dataset_keys and dataset["name"]
                else dataset_model_name
            )
        )

        return jsonify({
            "success": True,
            "student": student_data,
            "dataset_id": dataset["id"],
            "dataset_name": dataset_display_name,
            "prediction": result.get("prediction"),
            "confidence": result.get("confidence"),
            "feature_importance": result.get(
                "feature_importance", []
            ),
            "current_overall": student_data.get(
                "overall_performance_percentage"
            ),
            "risk_status": student_data.get("risk_status"),
            "performance_trend": student_data.get(
                "performance_trend"
            ),
            "insight": (
                "The trained machine learning model predicts "
                "this student's academic performance as "
                f"{result.get('prediction')}."
            ),
            "suggestions": []
        })

    except Exception as e:
        print("Prediction API Error:", str(e))
        traceback.print_exc()

        return jsonify({
            "success": False,
            "message": (
                "An unexpected error occurred while generating "
                "the student performance prediction."
            )
        }), 500


# =========================================================
# ERROR HANDLER
# =========================================================

@app.errorhandler(404)
def not_found(error):

    return jsonify({

        "success": False,

        "message":
            "API endpoint not found."

    }), 404


@app.errorhandler(500)
def internal_error(error):

    return jsonify({

        "success": False,

        "message":
            "Internal server error."

    }), 500




# =========================================================
# AI ACADEMIC ASSISTANT - GEMINI API
# =========================================================

@app.route(
    "/api/assistant",
    methods=["POST"]
)
def academic_assistant():

    try:

        # -------------------------------------------------
        # GET REQUEST DATA
        # -------------------------------------------------

        data = request.get_json(silent=True) or {}

        if not isinstance(data, dict):

            return jsonify({
                "success": False,
                "message": "Invalid request data."
            }), 400

        student_id = str(
            data.get("student_id") or ""
        ).strip()

        student_name = str(
            data.get("student_name") or ""
        ).strip()

        question = str(
            data.get("question") or ""
        ).strip()

        history = data.get("history", [])

        response_language = str(
            data.get("response_language") or "English"
        ).strip()

        # -------------------------------------------------
        # REQUEST LOG
        # -------------------------------------------------

        print("\n========================================")
        print("AI ACADEMIC ASSISTANT REQUEST")
        print("========================================")

        print("Student ID:", student_id or "Not provided")
        print("Student Name:", student_name or "Not provided")
        print("Question:", question)
        print("Response Language:", response_language)

        # -------------------------------------------------
        # VALIDATION
        # -------------------------------------------------

        if not question:

            return jsonify({
                "success": False,
                "error": "empty_question",
                "message": "Please enter your question."
            }), 400

        if len(question) > 5000:

            return jsonify({
                "success": False,
                "error": "question_too_long",
                "message": "Please enter a shorter question."
            }), 400

        if not isinstance(history, list):
            history = []

        if len(history) > 20:
            history = history[-20:]

        if not response_language:
            response_language = "English"

        # -------------------------------------------------
        # GEMINI ASSISTANT
        # -------------------------------------------------

        result = ask_academic_assistant(

            student_id=student_id or None,

            student_name=student_name or None,

            question=question,

            history=history,

            response_language=response_language

        )

        # -------------------------------------------------
        # CHECK RESULT
        # -------------------------------------------------

        if not isinstance(result, dict):

            raise RuntimeError(
                "Invalid response received from academic assistant."
            )

        if not result.get("success", False):

            error_type = result.get("error")

            # ---------------------------------------------
            # AMBIGUOUS STUDENT
            # ---------------------------------------------

            if error_type == "ambiguous_student":

                return jsonify({

                    "success": False,

                    "error": "ambiguous_student",

                    "message": result.get(
                        "message",
                        "Multiple student records matched. Please provide the correct Student ID and Student Name."
                    ),

                    "candidates": result.get(
                        "candidates",
                        []
                    )

                }), 409

            # ---------------------------------------------
            # STUDENT NOT FOUND
            # ---------------------------------------------

            if error_type == "student_not_found":

                return jsonify({

                    "success": False,

                    "error": "student_not_found",

                    "message": result.get(
                        "message",
                        "Student record not found. Please check the Student ID or Student Name."
                    )

                }), 404

            # ---------------------------------------------
            # OTHER ERRORS
            # ---------------------------------------------

            return jsonify({

                "success": False,

                "error": error_type or "assistant_error",

                "message": result.get(
                    "message",
                    "Unable to process your question."
                )

            }), 400

        # -------------------------------------------------
        # SUCCESS RESPONSE
        # -------------------------------------------------

        answer = str(
            result.get("answer") or ""
        ).strip()

        if not answer:

            return jsonify({

                "success": False,

                "error": "empty_ai_response",

                "message": "The AI could not generate an answer. Please try again."

            }), 502

        response_data = {

            "success": True,

            "student_id": result.get("student_id"),

            "student_name": result.get("student_name"),

            "source_type": result.get("source_type"),

            "dataset_name": result.get("dataset_name"),

            "dataset_id": result.get("dataset_id"),

            "answer": answer

        }

        print("\nAI ASSISTANT RESPONSE SUCCESS")
        print("Student:", result.get("student_name") or "General conversation")
        print("Source:", result.get("source_type") or "General")
        print("========================================\n")

        return jsonify(response_data), 200

    # -----------------------------------------------------
    # VALIDATION ERROR
    # -----------------------------------------------------

    except ValueError as error:

        print(
            "AI Assistant Validation Error:",
            str(error)
        )

        return jsonify({

            "success": False,

            "error": "validation_error",

            "message": str(error)

        }), 400

    # -----------------------------------------------------
    # GEMINI / SERVER ERROR
    # -----------------------------------------------------

    except Exception as error:

        print(
            "\nGemini Assistant Error:",
            str(error)
        )

        traceback.print_exc()

        return jsonify({

            "success": False,

            "error": "assistant_server_error",

            "message": (
                "Unable to process your question right now. "
                "Please try again."
            )

        }), 500

# =========================================================
# AI PERSONAL STUDY PLANNER
# =========================================================

@app.route("/api/study-planner/<student_id>", methods=["GET"])
def study_planner(student_id):

    try:

        # =================================================
        # REQUESTED STUDENT ID
        # =================================================

        requested_student_id = normalize_student_id(student_id)

        if not requested_student_id:

            return jsonify({
                "success": False,
                "message": "Student ID is required."
            }), 400


        # =================================================
        # NORMALIZE COLUMN NAME
        # =================================================

        def normalize_column(column):

            return (
                str(column)
                .strip()
                .lower()
                .replace(" ", "_")
                .replace("-", "_")
                .replace(".", "_")
                .replace("/", "_")
            )


        # =================================================
        # GET ALL UPLOADED DATASETS
        # =================================================

        conn = get_connection()

        datasets = conn.execute("""
            SELECT *
            FROM datasets
            ORDER BY id DESC
        """).fetchall()

        conn.close()


        if not datasets:

            return jsonify({
                "success": False,
                "message": "No dataset available."
            }), 404


        # =================================================
        # STUDENT ID COLUMN CANDIDATES
        # =================================================

        id_candidates = [

            "student_id",
            "studentid",

            "student_number",
            "student_no",
            "student_num",

            "id",

            "roll_no",
            "roll_number",
            "rollno",

            "register_no",
            "register_number",
            "reg_no",
            "reg_number",

            "registration_no",
            "registration_number",

            "admission_no",
            "admission_number",

            "enrollment_no",
            "enrollment_number"

        ]


        # =================================================
        # SEARCH STUDENT IN ALL DATASETS
        # =================================================

        matched_row = None
        matched_id_column = None
        matched_dataset = None
        matched_df = None


        for dataset_row in datasets:

            dataset = dict(dataset_row)

            file_path = dataset.get("file_path")


            # ---------------------------------------------
            # FILE CHECK
            # ---------------------------------------------

            if not file_path:
                continue


            if not os.path.exists(file_path):
                continue


            # ---------------------------------------------
            # READ DATASET
            # ---------------------------------------------

            try:

                df = pd.read_csv(file_path)

            except Exception as dataset_error:

                print(
                    "Dataset read error:",
                    dataset_error
                )

                continue


            if df.empty:
                continue


            # ---------------------------------------------
            # NORMALIZED COLUMNS
            # ---------------------------------------------

            normalized_columns = {

                normalize_column(column): column

                for column in df.columns

            }


            # ---------------------------------------------
            # FIND STUDENT ID COLUMN
            # ---------------------------------------------

            id_column = None


            # First: exact known names

            for candidate in id_candidates:

                if candidate in normalized_columns:

                    id_column = normalized_columns[
                        candidate
                    ]

                    break


            # ---------------------------------------------
            # Flexible Student ID detection
            # ---------------------------------------------

            if id_column is None:

                for (
                    normalized_name,
                    original_name
                ) in normalized_columns.items():

                    if (
                        "student" in normalized_name
                        and (
                            "id" in normalized_name
                            or "no" in normalized_name
                            or "number" in normalized_name
                        )
                    ):

                        id_column = original_name

                        break


            # ---------------------------------------------
            # Roll / Register / Enrollment detection
            # ---------------------------------------------

            if id_column is None:

                for (
                    normalized_name,
                    original_name
                ) in normalized_columns.items():

                    if (
                        "roll" in normalized_name
                        or
                        "register" in normalized_name
                        or
                        "registration" in normalized_name
                        or
                        "enrollment" in normalized_name
                        or
                        "admission" in normalized_name
                    ):

                        id_column = original_name

                        break


            # No ID column in this dataset

            if id_column is None:

                continue


            # ---------------------------------------------
            # SEARCH STUDENT ID
            # ---------------------------------------------

            for index, value in df[id_column].items():

                current_id = normalize_student_id(value)


                if (
                    current_id
                    and
                    current_id.lower()
                    ==
                    requested_student_id.lower()
                ):

                    matched_row = df.loc[index]

                    matched_id_column = id_column

                    matched_dataset = dataset

                    matched_df = df

                    break


            # Stop searching once found

            if matched_row is not None:

                break


        # =================================================
        # STUDENT NOT FOUND
        # =================================================

        if matched_row is None:

            return jsonify({

                "success": False,

                "message": (
                    f"Student ID "
                    f"'{requested_student_id}' "
                    "was not found in any "
                    "uploaded dataset."
                )

            }), 404


        # =================================================
        # STUDENT DATA
        # =================================================

        student = matched_row.to_dict()


        student[matched_id_column] = (
            requested_student_id
        )


        # =================================================
        # SAFE VALUE HELPER
        # =================================================

        def get_value(candidates):

            for candidate in candidates:

                candidate_normalized = (
                    normalize_column(candidate)
                )


                for column, value in student.items():

                    if (
                        normalize_column(column)
                        ==
                        candidate_normalized
                    ):

                        if (
                            pd.notna(value)
                            and
                            str(value).strip() != ""
                        ):

                            return value


            return None


        # =================================================
        # NUMBER HELPER
        # =================================================

        def get_number(candidates):

            value = get_value(candidates)


            try:

                if value is None:

                    return None


                number = float(value)


                if pd.isna(number):

                    return None


                return number


            except (
                ValueError,
                TypeError
            ):

                return None


        # =================================================
        # STUDENT NAME
        # =================================================

        name = get_value([

            "name",
            "student_name",
            "studentname",
            "full_name",
            "fullname",
            "student"

        ])


        if not name:

            name = "Student"


        # =================================================
        # ATTENDANCE
        # =================================================

        attendance = get_number([

            "attendance_percentage",
            "attendance_percent",
            "attendance",
            "attendance_pct",
            "attendance_score"

        ])


        # =================================================
        # STUDY HOURS
        # =================================================

        study_hours = get_number([

            "study_hours_per_day",
            "study_hours",
            "daily_study_hours",
            "hours_per_day",
            "study_time",
            "daily_study_time"

        ])


        # =================================================
        # BACKLOG
        # =================================================

        backlog = get_number([

            "backlog_count",
            "backlogs",
            "backlog",
            "backlog_subjects",
            "arrears",
            "arrear_count"

        ])


        # =================================================
        # SUBJECT MARKS
        # =================================================

        subject_marks = []


        # =================================================
        # SUBJECT STRING COLUMNS
        # =================================================

        subject_string_columns = [

            "subjects",
            "subject_marks",
            "subject_scores",
            "marks_by_subject",
            "scores_by_subject",
            "subject_wise_marks",
            "subject_wise_scores"

        ]


        subject_string_value = None


        for column, value in student.items():

            normalized_name = (
                normalize_column(column)
            )


            if (
                normalized_name
                in subject_string_columns
            ):

                if pd.notna(value):

                    subject_string_value = (
                        str(value)
                    )

                    break


        # =================================================
        # PARSE SUBJECT STRING
        #
        # Example:
        #
        # Python:57 | Java:45 | ML:32
        #
        # =================================================

        if subject_string_value:

            subject_items = (
                subject_string_value
                .replace(";", "|")
                .split("|")
            )


            for item in subject_items:

                item = item.strip()


                if not item:

                    continue


                subject_name = None
                marks_value = None


                # subject:mark

                if ":" in item:

                    parts = item.rsplit(
                        ":",
                        1
                    )

                    subject_name = (
                        parts[0].strip()
                    )

                    marks_value = (
                        parts[1].strip()
                    )


                # subject=mark

                elif "=" in item:

                    parts = item.rsplit(
                        "=",
                        1
                    )

                    subject_name = (
                        parts[0].strip()
                    )

                    marks_value = (
                        parts[1].strip()
                    )


                if (
                    subject_name
                    and
                    marks_value
                ):

                    try:

                        marks = float(
                            marks_value
                        )


                        if (
                            0
                            <= marks
                            <= 100
                        ):

                            subject_marks.append({

                                "subject":
                                    subject_name.title(),

                                "marks":
                                    marks

                            })


                    except (
                        ValueError,
                        TypeError
                    ):

                        continue


        # =================================================
        # SUBJECT MARK COLUMNS
        # =================================================

        excluded_terms = [

            "internal",
            "assignment",
            "attendance",
            "activity",
            "learning",
            "practice",
            "study",
            "sleep",
            "backlog",
            "overall",
            "final_exam",
            "previous_semester",
            "average_subject",
            "total",
            "percentage",
            "performance",
            "risk"

        ]


        for column, value in student.items():

            normalized_name = (
                normalize_column(column)
            )


            # Ignore non-subject fields

            if any(
                term in normalized_name
                for term in excluded_terms
            ):

                continue


            # Marks / score columns only

            if (
                "marks" not in normalized_name
                and
                "score" not in normalized_name
            ):

                continue


            try:

                marks = float(value)


                if not (
                    0
                    <= marks
                    <= 100
                ):

                    continue


            except (
                ValueError,
                TypeError
            ):

                continue


            # ---------------------------------------------
            # SUBJECT NAME
            # ---------------------------------------------

            subject_name = (

                normalized_name

                .replace(
                    "_marks",
                    ""
                )

                .replace(
                    "_score",
                    ""
                )

                .replace(
                    "_percentage",
                    ""
                )

                .replace(
                    "_percent",
                    ""
                )

                .replace(
                    "_",
                    " "
                )

                .strip()

                .title()

            )


            if not subject_name:

                continue


            # Avoid duplicate subjects

            already_exists = any(

                item["subject"].lower()
                ==
                subject_name.lower()

                for item
                in subject_marks

            )


            if not already_exists:

                subject_marks.append({

                    "subject":
                        subject_name,

                    "marks":
                        marks

                })


        # =================================================
        # SORT SUBJECTS
        # =================================================

        subject_marks.sort(

            key=lambda item:
                item["marks"]

        )


        # =================================================
        # WEAK SUBJECT
        # =================================================

        weak_subject = (

            subject_marks[0]

            if subject_marks

            else None

        )


        # =================================================
        # OVERALL PERFORMANCE
        # =================================================

        overall = None


        strong_overall_candidates = [

            "overall_performance_percentage",
            "overall_performance",
            "overall_percentage",
            "overall_percent",
            "overall_average",
            "overall_score",
            "total_percentage",
            "performance_percentage"

        ]


        # ---------------------------------------------
        # Direct overall value
        # ---------------------------------------------

        for candidate in (
            strong_overall_candidates
        ):

            value = get_number([
                candidate
            ])


            if (
                value is not None
                and
                0 <= value <= 100
            ):

                overall = value

                break


        # ---------------------------------------------
        # Calculate from subjects
        # ---------------------------------------------

        if (
            overall is None
            and
            subject_marks
        ):

            total_marks = sum(

                item["marks"]

                for item
                in subject_marks

            )


            overall = round(

                total_marks
                /
                len(subject_marks),

                2

            )


        # ---------------------------------------------
        # Final exam fallback
        # ---------------------------------------------

        if overall is None:

            overall = get_number([

                "final_exam_percentage",
                "final_percentage",
                "final_exam_score",
                "exam_percentage"

            ])


        # =================================================
        # ATTENDANCE FALLBACK
        # =================================================

        if (
            attendance is not None
            and
            attendance > 100
        ):

            attendance = 100


        # =================================================
        # BACKLOG FALLBACK
        # =================================================

        if backlog is not None:

            backlog = max(
                0,
                int(backlog)
            )


        # =================================================
        # RISK STATUS
        # =================================================

        risk_status = get_value([

            "risk_status",
            "risk",
            "risk_level"

        ])


        if not risk_status:

            if overall is not None:

                if overall < 50:

                    risk_status = "High"

                elif overall < 70:

                    risk_status = "Medium"

                else:

                    risk_status = "Low"


            elif (
                attendance is not None
                and
                attendance < 60
            ):

                risk_status = "High"


            else:

                risk_status = "Medium"


        # =================================================
        # DAILY STUDY HOURS
        # =================================================

        daily_hours = study_hours


        if (
            daily_hours is None
            or
            daily_hours < 1
        ):

            daily_hours = 2


        if daily_hours > 6:

            daily_hours = 6


        daily_hours = round(
            daily_hours,
            1
        )


        # =================================================
        # WEAK SUBJECT NAME
        # =================================================

        weak_subject_name = (

            weak_subject["subject"]

            if weak_subject

            else "Subject-wise marks"

        )


        # =================================================
        # RECOMMENDATIONS
        # =================================================

        recommendations = []


        # Attendance

        if (
            attendance is not None
            and
            attendance < 75
        ):

            recommendations.append(

                "Improve attendance and "
                "attend classes regularly."

            )


        # Backlog

        if (
            backlog is not None
            and
            backlog > 0
        ):

            recommendations.append(

                "Focus on clearing "
                "pending backlogs."

            )


        # Weak subject

        if weak_subject:

            recommendations.append(

                f"Give extra practice to "
                f"{weak_subject_name}, "
                f"which has the lowest mark "
                f"of {weak_subject['marks']:.1f}."

            )


        # Overall performance

        if (
            overall is not None
            and
            overall < 60
        ):

            recommendations.append(

                "Revise important concepts "
                "daily and practice questions."

            )


        # Study hours

        if (
            study_hours is None
            or
            study_hours < 2
        ):

            recommendations.append(

                "Increase focused study time "
                "gradually with short regular sessions."

            )


        # Default

        if not recommendations:

            recommendations.append(

                "Maintain consistent study habits "
                "and revise regularly."

            )


        # =================================================
        # PERSONALIZED TIMETABLE
        # =================================================

        timetable = [

            {
                "time": "Morning",
                "activity": "Concept revision",
                "duration": "30 minutes"
            },

            {
                "time": "Afternoon",
                "activity": "Practice questions",
                "duration": "45 minutes"
            },

            {
                "time": "Evening",
                "activity": weak_subject_name,
                "duration": f"{daily_hours} hours"
            },

            {
                "time": "Night",
                "activity": "Quick revision",
                "duration": "30 minutes"
            }

        ]


        # =================================================
        # RESPONSE
        # =================================================

        return jsonify({

            "success": True,

            "student_id":
                requested_student_id,

            "student_name":
                str(name),

            "overall_performance": (

                round(
                    overall,
                    2
                )

                if overall is not None

                else None

            ),

            "attendance":
                attendance,

            "study_hours_per_day":
                daily_hours,

            "backlog_count":
                backlog,

            "risk_status":
                str(risk_status),

            "weak_subject":
                weak_subject,

            "subject_marks":
                subject_marks,

            "daily_study_hours":
                daily_hours,

            "recommendations":
                recommendations,

            "timetable":
                timetable

        }), 200


    # =====================================================
    # ERROR HANDLING
    # =====================================================

    except Exception as error:

        print(
            "Study Planner Error:",
            str(error)
        )


        return jsonify({

            "success": False,

            "message":
                "Unable to generate study planner.",

            "error":
                str(error)

        }), 500
# =========================================================
# RUN SERVER
# =========================================================

if __name__ == "__main__":

    print("")

    print("=" * 60)

    print(
        " AI STUDENT PERFORMANCE SYSTEM"
    )

    print(
        " Flask Backend Server"
    )

    print("=" * 60)

    print("")

    print("Backend URL:")

    print(
        "http://127.0.0.1:5000"
    )

    print("")

    print("Health:")

    print(
        "http://127.0.0.1:5000/api/health"
    )

    print("")

    print("Created Dataset API:")

    print(
        "http://127.0.0.1:5000/api/created-datasets"
    )

    print("")

    print("Dashboard Analytics:")

    print(
        "http://127.0.0.1:5000/api/dashboard/analytics"
    )

    print("")

    print("Student ID Search:")

    print(
        "http://127.0.0.1:5000/api/dashboard/student/<student_id>"
    )

    print("")

    print("AI Prediction:")

    print(
        "http://127.0.0.1:5000/api/prediction/student/<student_id>"
    )

    print("")

    print("Dataset Download:")

    print(
        "http://127.0.0.1:5000/api/datasets/<dataset_id>/download"
    )

    print("")

    print("=" * 60)

    print("")

    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True

    )