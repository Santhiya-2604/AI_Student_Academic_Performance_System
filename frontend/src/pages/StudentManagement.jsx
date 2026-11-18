import {
  ArrowLeft,
  Plus,
  Search,
  RefreshCw,
  Users,
  UserPlus,
  X,
  Save,
  Mail,
  Phone,
  GraduationCap,
  Building2,
  CalendarDays,
  Eye,
  MoreVertical,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import "./StudentManagement.css";

const API_BASE_URL = "http://127.0.0.1:5000";

const initialForm = {
  student_id: "",
  name: "",
  department: "",
  semester: "",
  email: "",
  phone: "",
};

function StudentManagement() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [showProfile, setShowProfile] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [form, setForm] = useState(initialForm);

  // =====================================================
  // SAFE API RESPONSE
  // =====================================================

  const readApiResponse = async (response) => {
    const contentType =
      response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();

      console.error(
        "Backend returned non-JSON response:",
        text
      );

      throw new Error(
        `Backend returned an invalid response (${response.status}). Please check Flask backend.`
      );
    }

    return await response.json();
  };

  // =====================================================
  // FETCH STUDENTS
  // =====================================================

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/students`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        }
      );

      const data = await readApiResponse(response);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load students."
        );
      }

      setStudents(
        Array.isArray(data.students)
          ? data.students
          : []
      );
    } catch (err) {
      console.error(
        "Fetch students error:",
        err
      );

      setStudents([]);

      setError(
        err.message ||
          "Unable to connect to Flask backend."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    fetchStudents();
  }, []);

  // =====================================================
  // FORM INPUT
  // =====================================================

  const handleInputChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // =====================================================
  // OPEN FORM
  // =====================================================

  const openForm = () => {
    setError("");
    setSuccess("");
    setForm(initialForm);
    setShowForm(true);
  };

  // =====================================================
  // CLOSE FORM
  // =====================================================

  const closeForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setForm(initialForm);
    setError("");
  };

  // =====================================================
  // SAVE STUDENT
  // =====================================================

  const handleAddStudent = async (event) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    setError("");
    setSuccess("");

    const studentId =
      form.student_id.trim();

    const studentName =
      form.name.trim();

    const department =
      form.department.trim();

    const semester =
      form.semester;

    const email =
      form.email.trim();

    const phone =
      form.phone.trim();

    // ---------------------------------------------------
    // VALIDATION
    // ---------------------------------------------------

    if (!studentId) {
      setError("Student ID is required.");
      return;
    }

    if (!studentName) {
      setError("Student name is required.");
      return;
    }

    if (!department) {
      setError("Department is required.");
      return;
    }

    if (!semester) {
      setError("Please select a semester.");
      return;
    }

    // ---------------------------------------------------
    // SAVE
    // ---------------------------------------------------

    try {
      setSaving(true);

      const payload = {
        student_id: studentId,
        name: studentName,
        department: department,
        semester: Number(semester),
        email: email || null,
        phone: phone || null,
      };

      console.log(
        "Saving student:",
        payload
      );

      const response = await fetch(
        `${API_BASE_URL}/api/students`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body: JSON.stringify(payload),
        }
      );

      const data =
        await readApiResponse(response);

      console.log(
        "Save student response:",
        data
      );

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Unable to add student."
        );
      }

      // -------------------------------------------------
      // SUCCESS
      // -------------------------------------------------

      setSuccess(
        data.message ||
          "Student added successfully."
      );

      setForm(initialForm);

      setShowForm(false);

      // Refresh student list
      await fetchStudents();

    } catch (err) {
      console.error(
        "Add student error:",
        err
      );

      setError(
        err.message ||
          "Unable to add student."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredStudents = useMemo(() => {
    const search =
      searchTerm
        .trim()
        .toLowerCase();

    if (!search) {
      return students;
    }

    return students.filter(
      (student) => {
        const studentId =
          String(
            student.student_id ??
              student.id ??
              ""
          ).toLowerCase();

        const name =
          String(
            student.name ?? ""
          ).toLowerCase();

        const department =
          String(
            student.department ?? ""
          ).toLowerCase();

        const email =
          String(
            student.email ?? ""
          ).toLowerCase();

        return (
          studentId.includes(search) ||
          name.includes(search) ||
          department.includes(search) ||
          email.includes(search)
        );
      }
    );
  }, [
    students,
    searchTerm,
  ]);

  // =====================================================
  // VIEW PROFILE
  // =====================================================

  const handleViewProfile = (
    student
  ) => {
    setSelectedStudent(student);
    setShowProfile(true);
  };

  // =====================================================
  // CLOSE PROFILE
  // =====================================================

  const closeProfile = () => {
    setShowProfile(false);
    setSelectedStudent(null);
  };

  // =====================================================
  // CLEAR SEARCH
  // =====================================================

  const clearSearch = () => {
    setSearchTerm("");
  };

  // =====================================================
  // DEPARTMENT SUMMARY
  // =====================================================

  const departmentCount = useMemo(() => {
    const counts = {};

    students.forEach(
      (student) => {
        const department =
          student.department ||
          "Other";

        counts[department] =
          (counts[department] || 0) + 1;
      }
    );

    return Object.entries(
      counts
    );
  }, [students]);

  // =====================================================
  // INITIAL
  // =====================================================

  return (
    <div className="student-management-page">
      <div className="student-management-container">

        {/* =================================================
            HEADER
        ================================================= */}

        <div className="student-page-header">
          <div>

            <button
              type="button"
              className="back-dashboard-btn"
              onClick={() =>
                navigate("/admin")
              }
            >
              <ArrowLeft size={17} />

              Back to Dashboard
            </button>

            <p className="page-label">
              ADMIN WORKSPACE
            </p>

            <h1>
              Student Management
            </h1>

            <p className="page-description">
              Manage student profiles,
              contact details and
              academic identity.
            </p>

          </div>

          <div className="student-header-icon">
            <Users size={32} />
          </div>
        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <div className="alert-message error-message">

            <span>
              {error}
            </span>

            <button
              type="button"
              className="close-alert-btn"
              onClick={() =>
                setError("")
              }
            >
              <X size={16} />
            </button>

          </div>
        )}

        {success && (
          <div className="alert-message success-message">

            <span>
              {success}
            </span>

            <button
              type="button"
              className="close-alert-btn"
              onClick={() =>
                setSuccess("")
              }
            >
              <X size={16} />
            </button>

          </div>
        )}

        {/* =================================================
            SUMMARY
        ================================================= */}

        <div className="student-overview-strip">

          <div>
            <span>
              Total Students
            </span>

            <strong>
              {students.length}
            </strong>
          </div>

          <div className="overview-divider" />

          <div>
            <span>
              Displayed Students
            </span>

            <strong>
              {filteredStudents.length}
            </strong>
          </div>

          <div className="overview-divider" />

          <div>
            <span>
              Departments
            </span>

            <strong>
              {departmentCount.length}
            </strong>
          </div>

          <div className="overview-divider" />

          <div>
            <span>
              Management Status
            </span>

            <strong>
              Active
            </strong>
          </div>

        </div>

        {/* =================================================
            DEPARTMENT CHIPS
        ================================================= */}

        {departmentCount.length > 0 && (
          <div className="department-chips">

            {departmentCount.map(
              ([department, count]) => (
                <button
                  type="button"
                  key={department}
                  className="department-chip"
                  onClick={() =>
                    setSearchTerm(
                      department
                    )
                  }
                >
                  {department}

                  <span>
                    {count}
                  </span>
                </button>
              )
            )}

          </div>
        )}

        {/* =================================================
            ACTION BAR
        ================================================= */}

        <div className="student-control-panel">

          <div className="student-search-wrapper">

            <Search size={18} />

            <input
              type="text"
              placeholder="Search by ID, name or department"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
            />

            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={
                  clearSearch
                }
              >
                <X size={16} />
              </button>
            )}

          </div>

          <button
            type="button"
            className="refresh-students-btn"
            onClick={fetchStudents}
            disabled={loading}
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            className="add-student-btn"
            onClick={openForm}
            disabled={saving}
          >
            <Plus size={17} />

            Add Student
          </button>

        </div>

        {/* =================================================
            ADD STUDENT FORM
        ================================================= */}

        {showForm && (
          <form
            className="student-form-card"
            onSubmit={
              handleAddStudent
            }
          >

            <div className="form-header">

              <div>
                <p className="form-kicker">
                  STUDENT DIRECTORY
                </p>

                <h2>
                  Add New Student
                </h2>

                <p>
                  Enter the student's
                  basic details.
                </p>
              </div>

              <button
                type="button"
                className="close-form-btn"
                onClick={
                  closeForm
                }
                disabled={saving}
              >
                <X size={19} />
              </button>

            </div>

            <div className="student-form-grid">

              {/* STUDENT ID */}

              <div className="form-field">

                <label htmlFor="student_id">
                  Student ID *
                </label>

                <input
                  id="student_id"
                  name="student_id"
                  type="text"
                  value={
                    form.student_id
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Example: 9223"
                  autoComplete="off"
                  required
                />

              </div>

              {/* NAME */}

              <div className="form-field">

                <label htmlFor="name">
                  Student Name *
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={
                    handleInputChange
                  }
                  placeholder="Enter student name"
                  autoComplete="name"
                  required
                />

              </div>

              {/* DEPARTMENT */}

              <div className="form-field">

                <label htmlFor="department">
                  Department *
                </label>

                <input
                  id="department"
                  name="department"
                  type="text"
                  value={
                    form.department
                  }
                  onChange={
                    handleInputChange
                  }
                  placeholder="Example: AI&DS"
                  required
                />

              </div>

              {/* SEMESTER */}

              <div className="form-field">

                <label htmlFor="semester">
                  Semester *
                </label>

                <select
                  id="semester"
                  name="semester"
                  value={
                    form.semester
                  }
                  onChange={
                    handleInputChange
                  }
                  required
                >
                  <option value="">
                    Select semester
                  </option>

                  {Array.from(
                    {
                      length: 8,
                    },
                    (_, index) =>
                      index + 1
                  ).map(
                    (semester) => (
                      <option
                        key={semester}
                        value={
                          semester
                        }
                      >
                        Semester{" "}
                        {semester}
                      </option>
                    )
                  )}
                </select>

              </div>

              {/* EMAIL */}

              <div className="form-field">

                <label htmlFor="email">
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={
                    handleInputChange
                  }
                  placeholder="student@example.com"
                  autoComplete="email"
                />

              </div>

              {/* PHONE */}

              <div className="form-field">

                <label htmlFor="phone">
                  Phone
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={
                    handleInputChange
                  }
                  placeholder="Enter phone number"
                  autoComplete="tel"
                />

              </div>

            </div>

            <div className="form-actions">

              <button
                type="button"
                className="cancel-form-btn"
                onClick={
                  closeForm
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="save-student-btn"
                disabled={saving}
              >

                <Save size={17} />

                {saving
                  ? "Saving..."
                  : "Save Student"}

              </button>

            </div>

          </form>
        )}

        {/* =================================================
            STUDENT DIRECTORY
        ================================================= */}

        <section className="student-directory-section">

          <div className="directory-heading">

            <div>

              <p className="section-kicker">
                STUDENT DIRECTORY
              </p>

              <h2>
                Registered Students
              </h2>

              <p>
                Student profiles
                currently available
                in the system.
              </p>

            </div>

            <span className="record-count">
              {filteredStudents.length}{" "}
              Records
            </span>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading ? (
            <div className="empty-student-state">

              <RefreshCw
                size={30}
                className="spin"
              />

              <h3>
                Loading students...
              </h3>

              <p>
                Getting student
                records from Flask.
              </p>

            </div>
          ) : filteredStudents.length === 0 ? (

            <div className="empty-student-state">

              <Users size={38} />

              <h3>
                No students found
              </h3>

              <p>
                Add a student or
                change your search.
              </p>

            </div>

          ) : (

            <div className="student-profile-grid">

              {filteredStudents.map(
                (student, index) => {

                  const studentId =
                    student.student_id ??
                    student.id ??
                    `student-${index}`;

                  const studentName =
                    student.name ||
                    "Unnamed Student";

                  const department =
                    student.department ||
                    "Department not available";

                  const semester =
                    student.semester ??
                    "-";

                  const email =
                    student.email ||
                    "-";

                  const phone =
                    student.phone ||
                    "-";

                  const avatarLetter =
                    studentName
                      .charAt(0)
                      .toUpperCase();

                  return (
                    <div
                      className="student-profile-card"
                      key={studentId}
                    >

                      <div className="profile-card-top">

                        <div className="student-avatar">
                          {avatarLetter}
                        </div>

                        <div className="profile-identity">

                          <span className="student-id-label">
                            ID{" "}
                            {studentId}
                          </span>

                          <h3>
                            {studentName}
                          </h3>

                          <p>
                            {department}
                          </p>

                        </div>

                        <button
                          type="button"
                          className="profile-more-btn"
                          onClick={() =>
                            handleViewProfile(
                              student
                            )
                          }
                          title="View student"
                        >
                          <MoreVertical
                            size={18}
                          />
                        </button>

                      </div>

                      <div className="profile-meta">

                        <div>
                          <GraduationCap
                            size={15}
                          />

                          <span>
                            Semester{" "}
                            {semester}
                          </span>
                        </div>

                        <div>
                          <Building2
                            size={15}
                          />

                          <span>
                            {department}
                          </span>
                        </div>

                      </div>

                      <div className="profile-contact">

                        <div>
                          <Mail
                            size={15}
                          />

                          <span>
                            {email}
                          </span>
                        </div>

                        <div>
                          <Phone
                            size={15}
                          />

                          <span>
                            {phone}
                          </span>
                        </div>

                      </div>

                      <button
                        type="button"
                        className="view-profile-btn"
                        onClick={() =>
                          handleViewProfile(
                            student
                          )
                        }
                      >
                        <Eye size={16} />

                        View Profile
                      </button>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </section>

        {/* =================================================
            PAGE NOTE
        ================================================= */}

        <div className="student-page-note">

          <strong>
            Student Directory:
          </strong>{" "}

          Student profiles are
          connected directly to
          the Flask backend and
          database.

        </div>

      </div>

      {/* =================================================
          PROFILE MODAL
      ================================================= */}

      {showProfile &&
        selectedStudent && (
          <div
            className="profile-modal-overlay"
            onMouseDown={(event) => {

              if (
                event.target ===
                event.currentTarget
              ) {
                closeProfile();
              }

            }}
          >

            <div className="profile-modal">

              <div className="profile-modal-header">

                <div>

                  <p className="section-kicker">
                    STUDENT PROFILE
                  </p>

                  <h2>
                    Student Details
                  </h2>

                </div>

                <button
                  type="button"
                  className="close-form-btn"
                  onClick={
                    closeProfile
                  }
                >
                  <X size={20} />
                </button>

              </div>

              <div className="profile-modal-hero">

                <div className="student-avatar large">
                  {(
                    selectedStudent.name ||
                    "S"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div>

                  <span>
                    STUDENT ID
                  </span>

                  <h3>
                    {
                      selectedStudent.student_id ??
                      selectedStudent.id ??
                      "-"
                    }
                  </h3>

                  <p>
                    {
                      selectedStudent.name ??
                      "Unnamed Student"
                    }
                  </p>

                </div>

              </div>

              <div className="profile-detail-grid">

                <div>
                  <Building2
                    size={17}
                  />

                  <span>
                    Department
                  </span>

                  <strong>
                    {
                      selectedStudent.department ??
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <GraduationCap
                    size={17}
                  />

                  <span>
                    Semester
                  </span>

                  <strong>
                    {
                      selectedStudent.semester ??
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <Mail size={17} />

                  <span>
                    Email
                  </span>

                  <strong>
                    {
                      selectedStudent.email ||
                      "-"
                    }
                  </strong>
                </div>

                <div>
                  <Phone size={17} />

                  <span>
                    Phone
                  </span>

                  <strong>
                    {
                      selectedStudent.phone ||
                      "-"
                    }
                  </strong>
                </div>

              </div>

              <div className="profile-modal-note">

                <CalendarDays
                  size={17}
                />

                <div>

                  <strong>
                    Academic Records
                  </strong>

                  <p>
                    Academic performance
                    can be viewed from
                    the relevant dataset
                    and analytics modules.
                  </p>

                </div>

              </div>

              <div className="profile-modal-actions">

                <button
                  type="button"
                  onClick={
                    closeProfile
                  }
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}

export default StudentManagement;