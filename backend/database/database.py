import sqlite3

import os

from datetime import datetime





# =========================================================

# PATHS

# =========================================================



BASE_DIR = os.path.dirname(

    os.path.dirname(

        os.path.abspath(__file__)

    )

)



DATABASE_DIR = os.path.join(

    BASE_DIR,

    "database"

)



DATABASE_PATH = os.path.join(

    DATABASE_DIR,

    "student_system.db"

)



os.makedirs(

    DATABASE_DIR,

    exist_ok=True

)





# =========================================================

# DATABASE CONNECTION

# =========================================================



def get_connection():



    conn = sqlite3.connect(

        DATABASE_PATH

    )



    conn.row_factory = sqlite3.Row



    conn.execute(

        "PRAGMA foreign_keys = ON"

    )



    conn.execute(

        "PRAGMA busy_timeout = 30000"

    )



    return conn





# =========================================================

# DATABASE INITIALIZATION

# =========================================================



def init_database():



    conn = get_connection()



    cursor = conn.cursor()



    # -----------------------------------------------------

    # USERS

    # -----------------------------------------------------



    cursor.execute(

        """

        CREATE TABLE IF NOT EXISTS users (



            id INTEGER PRIMARY KEY AUTOINCREMENT,



            username TEXT UNIQUE NOT NULL,



            password TEXT NOT NULL,



            role TEXT NOT NULL DEFAULT 'admin',



            created_at TEXT DEFAULT CURRENT_TIMESTAMP



        )

        """

    )



    # -----------------------------------------------------

    # STUDENTS

    # -----------------------------------------------------



    cursor.execute(

        """

        CREATE TABLE IF NOT EXISTS students (



            id INTEGER PRIMARY KEY AUTOINCREMENT,



            student_id TEXT UNIQUE NOT NULL,



            name TEXT NOT NULL,



            department TEXT,



            semester INTEGER,



            email TEXT,



            phone TEXT,



            created_at TEXT DEFAULT CURRENT_TIMESTAMP



        )

        """

    )



    # -----------------------------------------------------

    # ACADEMIC RECORDS

    # -----------------------------------------------------



    cursor.execute(

        """

        CREATE TABLE IF NOT EXISTS academic_records (



            id INTEGER PRIMARY KEY AUTOINCREMENT,



            student_id TEXT NOT NULL,



            semester INTEGER,



            attendance_percentage REAL,



            internal_1_marks REAL,



            internal_2_marks REAL,



            assignment_score REAL,



            previous_semester_percentage REAL,



            study_hours_per_day REAL,



            learning_activity_score REAL,



            backlog_count INTEGER,



            sleep_hours_per_day REAL,



            practice_tests_completed INTEGER,



            final_exam_percentage REAL,



            overall_performance_percentage REAL,



            performance_category TEXT,



            risk_status TEXT,



            performance_trend TEXT,



            lowest_subject TEXT,



            average_subject_marks REAL,



            dataset_id INTEGER,



            created_at TEXT DEFAULT CURRENT_TIMESTAMP,



            FOREIGN KEY(student_id)

                REFERENCES students(student_id)

                ON DELETE CASCADE



        )

        """

    )



    # -----------------------------------------------------

    # STUDENT SUBJECTS

    # -----------------------------------------------------



    cursor.execute(

        """

        CREATE TABLE IF NOT EXISTS student_subjects (



            id INTEGER PRIMARY KEY AUTOINCREMENT,



            student_id TEXT NOT NULL,



            academic_record_id INTEGER,



            subject_name TEXT NOT NULL,



            marks REAL,



            created_at TEXT DEFAULT CURRENT_TIMESTAMP,



            FOREIGN KEY(student_id)

                REFERENCES students(student_id)

                ON DELETE CASCADE,



            FOREIGN KEY(academic_record_id)

                REFERENCES academic_records(id)

                ON DELETE CASCADE



        )

        """

    )



    # -----------------------------------------------------

    # UPLOADED DATASETS

    # -----------------------------------------------------



    cursor.execute(

        """

        CREATE TABLE IF NOT EXISTS datasets (



            id INTEGER PRIMARY KEY AUTOINCREMENT,



            dataset_name TEXT,



            name TEXT,



            file_name TEXT,



            file_path TEXT,



            row_count INTEGER,



            column_count INTEGER,



            uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP



        )

        """

    )



    # -----------------------------------------------------

    # CREATED DATASETS

    # -----------------------------------------------------



    cursor.execute(

        """

        CREATE TABLE IF NOT EXISTS created_datasets (



            id INTEGER PRIMARY KEY AUTOINCREMENT,



            dataset_name TEXT UNIQUE NOT NULL,



            created_at TEXT DEFAULT CURRENT_TIMESTAMP



        )

        """

    )



    # -----------------------------------------------------
    # CREATED DATASETS SCHEMA COMPATIBILITY
    # -----------------------------------------------------

    created_dataset_columns = [
        row[1]
        for row in cursor.execute(
            "PRAGMA table_info(created_datasets)"
        ).fetchall()
    ]

    if "dataset_id" not in created_dataset_columns:
        cursor.execute(
            "ALTER TABLE created_datasets ADD COLUMN dataset_id INTEGER"
        )

    cursor.execute(
        """
        UPDATE created_datasets
        SET dataset_id = id
        WHERE dataset_id IS NULL
        """
    )



    # -----------------------------------------------------

    # CREATED STUDENTS

    # -----------------------------------------------------



    cursor.execute(

        """

        CREATE TABLE IF NOT EXISTS created_students (



            id INTEGER PRIMARY KEY AUTOINCREMENT,



            dataset_id INTEGER NOT NULL,



            student_id TEXT NOT NULL,



            name TEXT NOT NULL,



            department TEXT,



            semester INTEGER,



            attendance_percentage REAL,



            internal_1_marks REAL,



            internal_2_marks REAL,



            assignment_score REAL,



            previous_semester_percentage REAL,



            study_hours_per_day REAL,



            learning_activity_score REAL,



            backlog_count INTEGER,



            sleep_hours_per_day REAL,



            practice_tests_completed INTEGER,



            final_exam_percentage REAL,



            overall_performance_percentage REAL,



            performance_category TEXT,



            risk_status TEXT,



            performance_trend TEXT,



            lowest_subject TEXT,



            average_subject_marks REAL,



            created_at TEXT DEFAULT CURRENT_TIMESTAMP,



            FOREIGN KEY(dataset_id)

                REFERENCES created_datasets(id)

                ON DELETE CASCADE



        )

        """

    )



    # -----------------------------------------------------
    # CREATED STUDENTS SCHEMA COMPATIBILITY
    # -----------------------------------------------------
    # Older SQLite databases were created with fewer columns.
    # CREATE TABLE IF NOT EXISTS does NOT add new columns to an
    # existing table, so we explicitly add every column required by
    # the current application. Existing rows are preserved.
    created_student_required_columns = {
        "dataset_id": "INTEGER",
        "student_id": "TEXT",
        "name": "TEXT",
        "department": "TEXT",
        "semester": "INTEGER",
        "attendance_percentage": "REAL",
        "internal_1_marks": "REAL",
        "internal_2_marks": "REAL",
        "assignment_score": "REAL",
        "previous_semester_percentage": "REAL",
        "study_hours_per_day": "REAL",
        "learning_activity_score": "REAL",
        "backlog_count": "INTEGER",
        "sleep_hours_per_day": "REAL",
        "practice_tests_completed": "INTEGER",
        "final_exam_percentage": "REAL",
        "overall_performance_percentage": "REAL",
        "performance_category": "TEXT",
        "risk_status": "TEXT",
        "performance_trend": "TEXT",
        "lowest_subject": "TEXT",
        "average_subject_marks": "REAL",
    }

    created_student_columns = {
        row[1]
        for row in cursor.execute(
            "PRAGMA table_info(created_students)"
        ).fetchall()
    }

    for column_name, column_type in created_student_required_columns.items():
        if column_name not in created_student_columns:
            cursor.execute(
                f"ALTER TABLE created_students ADD COLUMN {column_name} {column_type}"
            )

    created_dataset_ids = [
        row[0]
        for row in cursor.execute(
            "SELECT id FROM created_datasets ORDER BY id ASC"
        ).fetchall()
    ]

    # Preserve legacy rows when there is only one created dataset.
    # If multiple datasets exist, never guess which dataset an old row
    # belongs to. New rows are always stored with the correct dataset_id.
    if len(created_dataset_ids) == 1:
        cursor.execute(
            """
            UPDATE created_students
            SET dataset_id = ?
            WHERE dataset_id IS NULL
            """,
            (created_dataset_ids[0],)
        )


    # -----------------------------------------------------
    # CREATED STUDENT SUBJECTS SCHEMA COMPATIBILITY
    # -----------------------------------------------------
    created_subject_columns = {
        row[1]
        for row in cursor.execute(
            "PRAGMA table_info(created_student_subjects)"
        ).fetchall()
    }

    created_subject_required_columns = {
        "dataset_id": "INTEGER",
        "student_id": "TEXT",
        "created_student_id": "INTEGER",
        "student_record_id": "INTEGER",
        "subject_name": "TEXT",
        "marks": "REAL",
    }

    for column_name, column_type in created_subject_required_columns.items():
        if created_subject_columns and column_name not in created_subject_columns:
            cursor.execute(
                f"ALTER TABLE created_student_subjects ADD COLUMN {column_name} {column_type}"
            )


    # -----------------------------------------------------

    # CREATED STUDENT SUBJECTS

    # -----------------------------------------------------



    cursor.execute(

        """

        CREATE TABLE IF NOT EXISTS created_student_subjects (



            id INTEGER PRIMARY KEY AUTOINCREMENT,



            dataset_id INTEGER NOT NULL,



            student_id TEXT NOT NULL,



            student_record_id INTEGER,



            subject_name TEXT NOT NULL,



            marks REAL,



            created_at TEXT DEFAULT CURRENT_TIMESTAMP,



            FOREIGN KEY(dataset_id)

                REFERENCES created_datasets(id)

                ON DELETE CASCADE,



            FOREIGN KEY(student_record_id)

                REFERENCES created_students(id)

                ON DELETE CASCADE



        )

        """

    )



    # -----------------------------------------------------

    # DEFAULT ADMIN

    # -----------------------------------------------------



    existing_admin = cursor.execute(

        """

        SELECT id

        FROM users

        WHERE username = ?

        LIMIT 1

        """,

        ("admin",)

    ).fetchone()



    if not existing_admin:



        cursor.execute(

            """

            INSERT INTO users

            (

                username,

                password,

                role

            )

            VALUES

            (?, ?, ?)

            """,

            (

                "admin",

                "admin123",

                "admin"

            )

        )



    conn.commit()



    conn.close()





# =========================================================

# USER FUNCTIONS

# =========================================================



def create_user(

    username,

    password,

    role="admin"

):



    conn = get_connection()



    try:



        username = str(

            username

        ).strip()



        password = str(

            password

        )



        role = str(

            role

        ).strip().lower()



        existing = conn.execute(

            """

            SELECT id

            FROM users

            WHERE username = ?

            LIMIT 1

            """,

            (username,)

        ).fetchone()



        if existing:



            return {

                "success": False,

                "message": "Username already exists."

            }



        conn.execute(

            """

            INSERT INTO users

            (

                username,

                password,

                role

            )

            VALUES

            (?, ?, ?)

            """,

            (

                username,

                password,

                role

            )

        )



        conn.commit()



        return {

            "success": True,

            "message": "User created successfully."

        }



    except Exception as e:



        conn.rollback()



        return {

            "success": False,

            "message": str(e)

        }



    finally:



        conn.close()





def authenticate_user(

    username,

    password

):



    conn = get_connection()



    try:



        row = conn.execute(

            """

            SELECT

                id,

                username,

                role

            FROM users

            WHERE username = ?

              AND password = ?

            LIMIT 1

            """,

            (

                username,

                password

            )

        ).fetchone()



        if not row:



            return {

                "success": False,

                "message": "Invalid username or password."

            }



        return {

            "success": True,

            "message": "Login successful.",

            "user": dict(row)

        }



    finally:



        conn.close()





# =========================================================

# CREATED DATASET FUNCTIONS

# =========================================================



def create_created_dataset(

    dataset_name

):



    conn = get_connection()



    try:



        dataset_name = str(

            dataset_name

        ).strip()



        existing = conn.execute(

            """

            SELECT id

            FROM created_datasets

            WHERE dataset_name = ?

            LIMIT 1

            """,

            (dataset_name,)

        ).fetchone()



        if existing:



            counter = 2



            base_name = dataset_name



            while True:



                new_name = (

                    f"{base_name}_{counter}"

                )



                duplicate = conn.execute(

                    """

                    SELECT id

                    FROM created_datasets

                    WHERE dataset_name = ?

                    LIMIT 1

                    """,

                    (new_name,)

                ).fetchone()



                if not duplicate:



                    dataset_name = new_name



                    break



                counter += 1



        cursor = conn.execute(

            """

            INSERT INTO created_datasets

            (

                dataset_name,
                dataset_id

            )

            VALUES

            (?, NULL)

            """,

            (dataset_name,)

        )



        dataset_id = cursor.lastrowid

        conn.execute(
            """
            UPDATE created_datasets
            SET dataset_id = id
            WHERE id = ?
            """,
            (dataset_id,)
        )



        conn.commit()



        return {

            "id": dataset_id,
            "dataset_id": dataset_id,
            "dataset_name": dataset_name

        }



    finally:



        conn.close()





def get_created_datasets():



    conn = get_connection()



    try:



        rows = conn.execute(

            """

            SELECT

                id,
                dataset_id,

                dataset_name,

                created_at

            FROM created_datasets

            ORDER BY id DESC

            """

        ).fetchall()



        return [

            dict(row)

            for row in rows

        ]



    finally:



        conn.close()





def get_created_dataset(
    dataset_id
):
    conn = get_connection()

    try:
        dataset_row = conn.execute(
            """
            SELECT
                id,
                dataset_name,
                created_at
            FROM created_datasets
            WHERE id = ?
            LIMIT 1
            """,
            (dataset_id,)
        ).fetchone()

        if not dataset_row:
            return None

        dataset = dict(dataset_row)

        student_rows = conn.execute(
            """
            SELECT *
            FROM created_students
            WHERE dataset_id = ?
            ORDER BY id ASC
            """,
            (dataset_id,)
        ).fetchall()

        subject_columns = {
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(created_student_subjects)"
            ).fetchall()
        }

        students = []

        for student_row in student_rows:
            student = dict(student_row)

            subject_rows = []

            # New schema uses student_record_id.
            # Legacy schema may require created_student_id.
            subject_student_conditions = []
            subject_params = [dataset_id]

            if "student_record_id" in subject_columns:
                subject_student_conditions.append("student_record_id = ?")
                subject_params.append(student["id"])

            if "created_student_id" in subject_columns:
                subject_student_conditions.append("created_student_id = ?")
                subject_params.append(student["id"])

            if subject_student_conditions:
                subject_rows = conn.execute(
                    f"""
                    SELECT
                        id,
                        subject_name,
                        marks
                    FROM created_student_subjects
                    WHERE dataset_id = ?
                      AND ({" OR ".join(subject_student_conditions)})
                    ORDER BY id ASC
                    """,
                    subject_params
                ).fetchall()

            subjects = []

            for subject_row in subject_rows:
                subject = dict(subject_row)
                subject["name"] = subject.get("subject_name")
                subject["mark"] = subject.get("marks")
                subjects.append(subject)

            student["subjects"] = subjects

            student["academic_details"] = {
                "attendance_percentage": student.get("attendance_percentage"),
                "internal_1_marks": student.get("internal_1_marks"),
                "internal_2_marks": student.get("internal_2_marks"),
                "assignment_score": student.get("assignment_score"),
                "previous_semester_percentage": student.get("previous_semester_percentage"),
                "study_hours_per_day": student.get("study_hours_per_day"),
                "learning_activity_score": student.get("learning_activity_score"),
                "backlog_count": student.get("backlog_count"),
                "sleep_hours_per_day": student.get("sleep_hours_per_day"),
                "practice_tests_completed": student.get("practice_tests_completed"),
                "final_exam_percentage": student.get("final_exam_percentage"),
                "overall_performance_percentage": student.get("overall_performance_percentage"),
                "performance_category": student.get("performance_category"),
                "risk_status": student.get("risk_status"),
                "performance_trend": student.get("performance_trend"),
                "lowest_subject": student.get("lowest_subject"),
                "average_subject_marks": student.get("average_subject_marks")
            }

            students.append(student)

        dataset["students"] = students

        return dataset

    finally:
        conn.close()

def get_previous_subjects(

    dataset_id

):



    conn = get_connection()



    try:



        rows = conn.execute(

            """

            SELECT DISTINCT

                subject_name

            FROM created_student_subjects

            WHERE dataset_id = ?

            ORDER BY subject_name

            """,

            (dataset_id,)

        ).fetchall()



        return [

            row["subject_name"]

            for row in rows

        ]



    finally:



        conn.close()





# =========================================================

# CREATED STUDENT FUNCTIONS

# =========================================================



def add_created_student(
    dataset_id,
    student_id,
    name,
    department,
    semester,
    academic_details,
    subjects
):
    """Add a student to a created dataset while supporting legacy/current schemas."""
    conn = get_connection()

    try:
        academic = academic_details or {}

        # -----------------------------------------------------
        # CREATED STUDENTS SCHEMA
        # -----------------------------------------------------
        student_columns = {
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(created_students)"
            ).fetchall()
        }

        dataset_columns = []
        if "created_dataset_id" in student_columns:
            dataset_columns.append("created_dataset_id")
        if "dataset_id" in student_columns:
            dataset_columns.append("dataset_id")

        if not dataset_columns:
            raise RuntimeError(
                "created_students table has no dataset reference column."
            )

        duplicate_parts = [f"{column} = ?" for column in dataset_columns]
        duplicate_sql = " OR ".join(duplicate_parts)
        duplicate_params = [dataset_id] * len(dataset_columns)
        duplicate_params.append(student_id)

        existing = conn.execute(
            f"""
            SELECT id
            FROM created_students
            WHERE ({duplicate_sql})
              AND student_id = ?
            LIMIT 1
            """,
            duplicate_params
        ).fetchone()

        if existing:
            return {
                "success": False,
                "message": "Student already exists in this dataset."
            }

        insert_columns = [
            *dataset_columns,
            "student_id",
            "name",
            "department",
            "semester",
            "attendance_percentage",
            "internal_1_marks",
            "internal_2_marks",
            "assignment_score",
            "previous_semester_percentage",
            "study_hours_per_day",
            "learning_activity_score",
            "backlog_count",
            "sleep_hours_per_day",
            "practice_tests_completed",
            "final_exam_percentage",
            "overall_performance_percentage",
            "performance_category",
            "risk_status",
            "performance_trend",
            "lowest_subject",
            "average_subject_marks"
        ]

        values = [
            *([dataset_id] * len(dataset_columns)),
            student_id,
            name,
            department,
            semester,
            academic.get("attendance_percentage"),
            academic.get("internal_1_marks"),
            academic.get("internal_2_marks"),
            academic.get("assignment_score"),
            academic.get("previous_semester_percentage"),
            academic.get("study_hours_per_day"),
            academic.get("learning_activity_score"),
            academic.get("backlog_count"),
            academic.get("sleep_hours_per_day"),
            academic.get("practice_tests_completed"),
            academic.get("final_exam_percentage"),
            academic.get("overall_performance_percentage"),
            academic.get("performance_category"),
            academic.get("risk_status"),
            academic.get("performance_trend"),
            academic.get("lowest_subject"),
            academic.get("average_subject_marks")
        ]

        conn.execute(
            f"""
            INSERT INTO created_students
            ({", ".join(insert_columns)})
            VALUES ({", ".join(["?"] * len(values))})
            """,
            values
        )

        student_record_id = conn.execute(
            "SELECT last_insert_rowid()"
        ).fetchone()[0]

        # -----------------------------------------------------
        # CREATED STUDENT SUBJECTS SCHEMA
        # -----------------------------------------------------
        subject_columns = {
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(created_student_subjects)"
            ).fetchall()
        }

        subject_dataset_columns = []
        if "created_dataset_id" in subject_columns:
            subject_dataset_columns.append("created_dataset_id")
        if "dataset_id" in subject_columns:
            subject_dataset_columns.append("dataset_id")

        # IMPORTANT:
        # Some old databases require created_student_id NOT NULL,
        # while the newer schema uses student_record_id.
        subject_student_columns = []
        if "created_student_id" in subject_columns:
            subject_student_columns.append("created_student_id")
        if "student_record_id" in subject_columns:
            subject_student_columns.append("student_record_id")

        if "subject_name" not in subject_columns:
            raise RuntimeError(
                "created_student_subjects table is missing subject_name."
            )

        subject_insert_columns = [
            *subject_dataset_columns,
        ]

        if "student_id" in subject_columns:
            subject_insert_columns.append("student_id")

        subject_insert_columns.extend(subject_student_columns)
        subject_insert_columns.append("subject_name")

        if "marks" in subject_columns:
            subject_insert_columns.append("marks")

        for subject in subjects or []:
            subject_name = str(
                subject.get(
                    "subject_name",
                    subject.get("name", "")
                )
            ).strip()

            marks = subject.get(
                "marks",
                subject.get("mark")
            )

            if not subject_name:
                continue

            subject_values = []

            # Populate every dataset reference column that exists.
            subject_values.extend(
                [dataset_id] * len(subject_dataset_columns)
            )

            if "student_id" in subject_columns:
                subject_values.append(student_id)

            # Populate BOTH IDs when both legacy/current columns exist.
            if "created_student_id" in subject_columns:
                subject_values.append(student_record_id)

            if "student_record_id" in subject_columns:
                subject_values.append(student_record_id)

            subject_values.append(subject_name)

            if "marks" in subject_columns:
                subject_values.append(marks)

            conn.execute(
                f"""
                INSERT INTO created_student_subjects
                ({", ".join(subject_insert_columns)})
                VALUES ({", ".join(["?"] * len(subject_values))})
                """,
                subject_values
            )

        conn.commit()

        return {
            "success": True,
            "message": "Student added successfully.",
            "student_id": student_id,
            "record_id": student_record_id
        }

    except Exception as e:
        conn.rollback()
        return {
            "success": False,
            "message": str(e)
        }

    finally:
        conn.close()

def update_created_student(
    dataset_id,
    record_id,
    student_id,
    name,
    department,
    semester,
    academic_details,
    subjects
):
    """Update a created-dataset student and replace subject records."""
    conn = get_connection()

    try:
        academic = academic_details or {}

        student_columns = {
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(created_students)"
            ).fetchall()
        }

        dataset_columns = []
        if "created_dataset_id" in student_columns:
            dataset_columns.append("created_dataset_id")
        if "dataset_id" in student_columns:
            dataset_columns.append("dataset_id")

        if not dataset_columns:
            raise RuntimeError(
                "created_students table has no dataset reference column."
            )

        dataset_filter = " OR ".join(
            f"{column} = ?" for column in dataset_columns
        )
        lookup_params = [dataset_id] * len(dataset_columns)
        lookup_params.append(record_id)

        existing = conn.execute(
            f"""
            SELECT id
            FROM created_students
            WHERE ({dataset_filter})
              AND id = ?
            LIMIT 1
            """,
            lookup_params
        ).fetchone()

        if not existing:
            return {
                "success": False,
                "message": "Student not found."
            }

        set_parts = []
        update_values = []

        for column in dataset_columns:
            set_parts.append(f"{column} = ?")
            update_values.append(dataset_id)

        fields = [
            ("student_id", student_id),
            ("name", name),
            ("department", department),
            ("semester", semester),
            ("attendance_percentage", academic.get("attendance_percentage")),
            ("internal_1_marks", academic.get("internal_1_marks")),
            ("internal_2_marks", academic.get("internal_2_marks")),
            ("assignment_score", academic.get("assignment_score")),
            ("previous_semester_percentage", academic.get("previous_semester_percentage")),
            ("study_hours_per_day", academic.get("study_hours_per_day")),
            ("learning_activity_score", academic.get("learning_activity_score")),
            ("backlog_count", academic.get("backlog_count")),
            ("sleep_hours_per_day", academic.get("sleep_hours_per_day")),
            ("practice_tests_completed", academic.get("practice_tests_completed")),
            ("final_exam_percentage", academic.get("final_exam_percentage")),
            ("overall_performance_percentage", academic.get("overall_performance_percentage")),
            ("performance_category", academic.get("performance_category")),
            ("risk_status", academic.get("risk_status")),
            ("performance_trend", academic.get("performance_trend")),
            ("lowest_subject", academic.get("lowest_subject")),
            ("average_subject_marks", academic.get("average_subject_marks"))
        ]

        for column, value in fields:
            if column in student_columns:
                set_parts.append(f"{column} = ?")
                update_values.append(value)

        update_values.append(record_id)

        conn.execute(
            f"""
            UPDATE created_students
            SET {", ".join(set_parts)}
            WHERE id = ?
            """,
            update_values
        )

        # -----------------------------------------------------
        # SUBJECTS
        # -----------------------------------------------------
        subject_columns = {
            row[1]
            for row in conn.execute(
                "PRAGMA table_info(created_student_subjects)"
            ).fetchall()
        }

        subject_dataset_columns = []
        if "created_dataset_id" in subject_columns:
            subject_dataset_columns.append("created_dataset_id")
        if "dataset_id" in subject_columns:
            subject_dataset_columns.append("dataset_id")

        # Delete by whichever student-reference columns exist.
        delete_conditions = []
        delete_params = []

        if "created_student_id" in subject_columns:
            delete_conditions.append("created_student_id = ?")
            delete_params.append(record_id)

        if "student_record_id" in subject_columns:
            delete_conditions.append("student_record_id = ?")
            delete_params.append(record_id)

        if delete_conditions:
            conn.execute(
                f"""
                DELETE FROM created_student_subjects
                WHERE {" OR ".join(delete_conditions)}
                """,
                delete_params
            )
        elif "student_id" in subject_columns:
            filters = [
                f"{column} = ?" for column in subject_dataset_columns
            ]
            params = [dataset_id] * len(subject_dataset_columns)
            filters.append("student_id = ?")
            params.append(student_id)

            conn.execute(
                f"""
                DELETE FROM created_student_subjects
                WHERE {" AND ".join(filters)}
                """,
                params
            )

        subject_student_columns = []
        if "created_student_id" in subject_columns:
            subject_student_columns.append("created_student_id")
        if "student_record_id" in subject_columns:
            subject_student_columns.append("student_record_id")

        subject_insert_columns = list(subject_dataset_columns)

        if "student_id" in subject_columns:
            subject_insert_columns.append("student_id")

        subject_insert_columns.extend(subject_student_columns)

        if "subject_name" not in subject_columns:
            raise RuntimeError(
                "created_student_subjects table is missing subject_name."
            )

        subject_insert_columns.append("subject_name")

        if "marks" in subject_columns:
            subject_insert_columns.append("marks")

        for subject in subjects or []:
            subject_name = str(
                subject.get(
                    "subject_name",
                    subject.get("name", "")
                )
            ).strip()

            if not subject_name:
                continue

            marks = subject.get(
                "marks",
                subject.get("mark")
            )

            subject_values = [
                *([dataset_id] * len(subject_dataset_columns))
            ]

            if "student_id" in subject_columns:
                subject_values.append(student_id)

            if "created_student_id" in subject_columns:
                subject_values.append(record_id)

            if "student_record_id" in subject_columns:
                subject_values.append(record_id)

            subject_values.append(subject_name)

            if "marks" in subject_columns:
                subject_values.append(marks)

            conn.execute(
                f"""
                INSERT INTO created_student_subjects
                ({", ".join(subject_insert_columns)})
                VALUES ({", ".join(["?"] * len(subject_values))})
                """,
                subject_values
            )

        conn.commit()

        return {
            "success": True,
            "message": "Student updated successfully."
        }

    except Exception as e:
        conn.rollback()
        return {
            "success": False,
            "message": str(e)
        }

    finally:
        conn.close()

def delete_created_student(

    dataset_id,

    record_id

):



    conn = get_connection()



    try:



        cursor = conn.execute(

            """

            DELETE FROM created_students

            WHERE id = ?

              AND dataset_id = ?

            """,

            (

                record_id,

                dataset_id

            )

        )



        if cursor.rowcount == 0:



            conn.rollback()



            return {

                "success": False,

                "message": "Student not found."

            }



        conn.commit()



        return {

            "success": True,

            "message": "Student deleted successfully."

        }



    except Exception as e:



        conn.rollback()



        return {

            "success": False,

            "message": str(e)

        }



    finally:



        conn.close()





def delete_created_dataset(

    dataset_id

):



    conn = get_connection()



    try:



        cursor = conn.execute(

            """

            DELETE FROM created_datasets

            WHERE id = ?

            """,

            (dataset_id,)

        )



        if cursor.rowcount == 0:



            conn.rollback()



            return {

                "success": False,

                "message": "Dataset not found."

            }



        conn.commit()



        return {

            "success": True,

            "message": "Dataset deleted successfully."

        }



    except Exception as e:



        conn.rollback()



        return {

            "success": False,

            "message": str(e)

        }



    finally:



        conn.close()





# =========================================================

# ADMIN REGISTERED STUDENT

# =========================================================



def create_student(

    student_id,

    name,

    department,

    semester,

    email=None,

    phone=None,

    academic_details=None,

    subjects=None

):

    """

    Creates an admin-registered student.



    academic_details and subjects are optional so that

    existing code will continue to work.



    IMPORTANT:

    This function is only for admin-registered students.

    Dataset student logic is separate.

    """



    conn = get_connection()



    try:



        student_id = str(

            student_id

        ).strip()



        name = str(

            name

        ).strip()



        department = str(

            department

            or ""

        ).strip()



        existing = conn.execute(

            """

            SELECT id

            FROM students

            WHERE student_id = ?

            LIMIT 1

            """,

            (student_id,)

        ).fetchone()



        if existing:



            return {

                "success": False,

                "message": "Student ID already exists."

            }



        # -------------------------------------------------

        # INSERT BASIC STUDENT

        # -------------------------------------------------



        cursor = conn.execute(

            """

            INSERT INTO students

            (

                student_id,

                name,

                department,

                semester,

                email,

                phone

            )

            VALUES

            (?, ?, ?, ?, ?, ?)

            """,

            (

                student_id,

                name,

                department,

                semester,

                email,

                phone

            )

        )



        student_db_id = (

            cursor.lastrowid

        )



        # -------------------------------------------------

        # OPTIONAL ACADEMIC RECORD

        # -------------------------------------------------



        academic_record_id = None



        if academic_details:



            academic = (

                academic_details

                or {}

            )



            cursor = conn.execute(

                """

                INSERT INTO academic_records

                (

                    student_id,

                    semester,

                    attendance_percentage,

                    internal_1_marks,

                    internal_2_marks,

                    assignment_score,

                    previous_semester_percentage,

                    study_hours_per_day,

                    learning_activity_score,

                    backlog_count,

                    sleep_hours_per_day,

                    practice_tests_completed,

                    final_exam_percentage,

                    overall_performance_percentage,

                    performance_category,

                    risk_status,

                    performance_trend,

                    lowest_subject,

                    average_subject_marks

                )

                VALUES

                (

                    ?, ?, ?, ?, ?,

                    ?, ?, ?, ?, ?,

                    ?, ?, ?, ?, ?,

                    ?, ?, ?, ?

                )

                """,

                (

                    student_id,



                    academic.get(

                        "semester",

                        semester

                    ),



                    academic.get(

                        "attendance_percentage"

                    ),



                    academic.get(

                        "internal_1_marks"

                    ),



                    academic.get(

                        "internal_2_marks"

                    ),



                    academic.get(

                        "assignment_score"

                    ),



                    academic.get(

                        "previous_semester_percentage"

                    ),



                    academic.get(

                        "study_hours_per_day"

                    ),



                    academic.get(

                        "learning_activity_score"

                    ),



                    academic.get(

                        "backlog_count"

                    ),



                    academic.get(

                        "sleep_hours_per_day"

                    ),



                    academic.get(

                        "practice_tests_completed"

                    ),



                    academic.get(

                        "final_exam_percentage"

                    ),



                    academic.get(

                        "overall_performance_percentage"

                    ),



                    academic.get(

                        "performance_category"

                    ),



                    academic.get(

                        "risk_status"

                    ),



                    academic.get(

                        "performance_trend"

                    ),



                    academic.get(

                        "lowest_subject"

                    ),



                    academic.get(

                        "average_subject_marks"

                    )

                )

            )



            academic_record_id = (

                cursor.lastrowid

            )



            # -------------------------------------------------

            # SUBJECT MARKS

            # -------------------------------------------------



            for subject in (

                subjects or []

            ):



                subject_name = str(

                    subject.get(

                        "subject_name",

                        subject.get(

                            "name",

                            ""

                        )

                    )

                ).strip()



                marks = subject.get(

                    "marks",

                    subject.get(

                        "mark"

                    )

                )



                if not subject_name:



                    continue



                conn.execute(

                    """

                    INSERT INTO student_subjects

                    (

                        student_id,

                        academic_record_id,

                        subject_name,

                        marks

                    )

                    VALUES

                    (?, ?, ?, ?)

                    """,

                    (

                        student_id,

                        academic_record_id,

                        subject_name,

                        marks

                    )

                )



        conn.commit()



        # Return complete student

        student = get_student(

            student_id

        )



        return {

            "success": True,

            "message": "Student created successfully.",

            "student": student,

            "student_db_id": student_db_id

        }



    except Exception as e:



        conn.rollback()



        return {

            "success": False,

            "message": str(e)

        }



    finally:



        conn.close()





# =========================================================

# GET ALL ADMIN REGISTERED STUDENTS

# =========================================================



def get_all_students():



    conn = get_connection()



    try:



        rows = conn.execute(

            """

            SELECT *

            FROM students

            ORDER BY id DESC

            """

        ).fetchall()



        students = []



        for row in rows:



            student = dict(

                row

            )



            # -------------------------------------------------

            # GET LATEST ACADEMIC RECORD

            # -------------------------------------------------



            academic_row = conn.execute(

                """

                SELECT *

                FROM academic_records

                WHERE student_id = ?

                ORDER BY id DESC

                LIMIT 1

                """,

                (

                    student["student_id"],

                )

            ).fetchone()



            if academic_row:



                academic = dict(

                    academic_row

                )



                student[

                    "academic_record"

                ] = academic



                student[

                    "academic_details"

                ] = academic



                student[

                    "attendance_percentage"

                ] = academic.get(

                    "attendance_percentage"

                )



                student[

                    "overall_performance_percentage"

                ] = academic.get(

                    "overall_performance_percentage"

                )



                student[

                    "performance_category"

                ] = academic.get(

                    "performance_category"

                )



                student[

                    "previous_semester_percentage"

                ] = academic.get(

                    "previous_semester_percentage"

                )



                student[

                    "study_hours_per_day"

                ] = academic.get(

                    "study_hours_per_day"

                )



                student[

                    "backlog_count"

                ] = academic.get(

                    "backlog_count"

                )



                student[

                    "performance_trend"

                ] = academic.get(

                    "performance_trend"

                )



                student[

                    "risk_status"

                ] = academic.get(

                    "risk_status"

                )



            else:



                student[

                    "academic_record"

                ] = None



                student[

                    "academic_details"

                ] = None



            # -------------------------------------------------

            # SUBJECTS

            # -------------------------------------------------



            if academic_row:



                subject_rows = conn.execute(

                    """

                    SELECT

                        id,

                        student_id,

                        academic_record_id,

                        subject_name,

                        marks,

                        created_at

                    FROM student_subjects

                    WHERE student_id = ?

                      AND academic_record_id = ?

                    ORDER BY id ASC

                    """,

                    (

                        student["student_id"],

                        academic[

                            "id"

                        ]

                    )

                ).fetchall()



            else:



                subject_rows = []



            subjects = []



            for subject_row in subject_rows:



                subject = dict(

                    subject_row

                )



                subject[

                    "name"

                ] = subject.get(

                    "subject_name"

                )



                subject[

                    "mark"

                ] = subject.get(

                    "marks"

                )



                subjects.append(

                    subject

                )



            student[

                "subjects"

            ] = subjects



            student[

                "subject_marks"

            ] = subjects



            students.append(

                student

            )



        return students



    finally:



        conn.close()





# =========================================================

# GET ONE ADMIN REGISTERED STUDENT

# =========================================================



def get_student(

    student_id

):

    """

    Returns complete admin-registered student information.



    Includes:

        Basic student details

        Latest academic record

        Subject-wise marks



    Dataset students are NOT handled here.

    """



    conn = get_connection()



    try:



        # -------------------------------------------------

        # BASIC STUDENT

        # -------------------------------------------------



        student_row = conn.execute(

            """

            SELECT *

            FROM students

            WHERE student_id = ?

            LIMIT 1

            """,

            (student_id,)

        ).fetchone()



        if not student_row:



            return None



        student = dict(

            student_row

        )



        # -------------------------------------------------

        # LATEST ACADEMIC RECORD

        # -------------------------------------------------



        academic_row = conn.execute(

            """

            SELECT *

            FROM academic_records

            WHERE student_id = ?

            ORDER BY id DESC

            LIMIT 1

            """,

            (student_id,)

        ).fetchone()



        if academic_row:



            academic = dict(

                academic_row

            )



            student[

                "academic_record"

            ] = academic



            student[

                "academic_details"

            ] = academic



            # -------------------------------------------------

            # FLATTEN ACADEMIC FIELDS

            # -------------------------------------------------



            student[

                "attendance_percentage"

            ] = academic.get(

                "attendance_percentage"

            )



            student[

                "internal_1_marks"

            ] = academic.get(

                "internal_1_marks"

            )



            student[

                "internal_2_marks"

            ] = academic.get(

                "internal_2_marks"

            )



            student[

                "assignment_score"

            ] = academic.get(

                "assignment_score"

            )



            student[

                "previous_semester_percentage"

            ] = academic.get(

                "previous_semester_percentage"

            )



            student[

                "study_hours_per_day"

            ] = academic.get(

                "study_hours_per_day"

            )



            student[

                "learning_activity_score"

            ] = academic.get(

                "learning_activity_score"

            )



            student[

                "backlog_count"

            ] = academic.get(

                "backlog_count"

            )



            student[

                "sleep_hours_per_day"

            ] = academic.get(

                "sleep_hours_per_day"

            )



            student[

                "practice_tests_completed"

            ] = academic.get(

                "practice_tests_completed"

            )



            student[

                "final_exam_percentage"

            ] = academic.get(

                "final_exam_percentage"

            )



            student[

                "overall_performance_percentage"

            ] = academic.get(

                "overall_performance_percentage"

            )



            student[

                "performance_category"

            ] = academic.get(

                "performance_category"

            )



            student[

                "risk_status"

            ] = academic.get(

                "risk_status"

            )



            student[

                "performance_trend"

            ] = academic.get(

                "performance_trend"

            )



            student[

                "lowest_subject"

            ] = academic.get(

                "lowest_subject"

            )



            student[

                "average_subject_marks"

            ] = academic.get(

                "average_subject_marks"

            )



        else:



            student[

                "academic_record"

            ] = None



            student[

                "academic_details"

            ] = None



            # Keep all expected fields available

            student[

                "attendance_percentage"

            ] = None



            student[

                "internal_1_marks"

            ] = None



            student[

                "internal_2_marks"

            ] = None



            student[

                "assignment_score"

            ] = None



            student[

                "previous_semester_percentage"

            ] = None



            student[

                "study_hours_per_day"

            ] = None



            student[

                "learning_activity_score"

            ] = None



            student[

                "backlog_count"

            ] = None



            student[

                "sleep_hours_per_day"

            ] = None



            student[

                "practice_tests_completed"

            ] = None



            student[

                "final_exam_percentage"

            ] = None



            student[

                "overall_performance_percentage"

            ] = None



            student[

                "performance_category"

            ] = None



            student[

                "risk_status"

            ] = None



            student[

                "performance_trend"

            ] = None



            student[

                "lowest_subject"

            ] = None



            student[

                "average_subject_marks"

            ] = None



        # -------------------------------------------------

        # SUBJECT-WISE MARKS

        # -------------------------------------------------



        if academic_row:



            subject_rows = conn.execute(

                """

                SELECT

                    id,

                    student_id,

                    academic_record_id,

                    subject_name,

                    marks,

                    created_at

                FROM student_subjects

                WHERE student_id = ?

                  AND academic_record_id = ?

                ORDER BY id ASC

                """,

                (

                    student_id,

                    academic[

                        "id"

                    ]

                )

            ).fetchall()



        else:



            subject_rows = []



        subjects = []



        for row in subject_rows:



            subject = dict(

                row

            )



            # Frontend-friendly aliases

            subject[

                "name"

            ] = subject.get(

                "subject_name"

            )



            subject[

                "mark"

            ] = subject.get(

                "marks"

            )



            subjects.append(

                subject

            )



        # -------------------------------------------------

        # SUBJECT ALIASES

        # -------------------------------------------------



        student[

            "subjects"

        ] = subjects



        student[

            "subject_marks"

        ] = subjects



        # -------------------------------------------------

        # ACADEMIC RECORD LIST

        # -------------------------------------------------



        if academic_row:



            student[

                "academic_records"

            ] = [

                academic

            ]



        else:



            student[

                "academic_records"

            ] = []



        return student



    finally:



        conn.close()





# =========================================================

# MAIN

# =========================================================



if __name__ == "__main__":



    init_database()



    print(

        "Database initialized successfully."

    )



    print(

        "Database path:",

        DATABASE_PATH

    )