
import {
  LayoutDashboard,
  Database,
  Users,
  BookOpen,
  Brain,
  Bot,
  BarChart3,
  ShieldAlert,
  FileText,
  Upload,
  Plus,
  Download,
  Search,
  LogOut,
  TrendingUp,
  UserCheck,
  RefreshCw,
  Target,
  Activity,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  // =====================================================
  // STATE
  // =====================================================

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Top 3 Performers
  const [topPerformerGroups, setTopPerformerGroups] = useState([]);
  const [topPerformersLoading, setTopPerformersLoading] =
    useState(true);
  const [topPerformersError, setTopPerformersError] =
    useState("");
  const [topPerformerScoreColumn, setTopPerformerScoreColumn] =
    useState("");

  // Student ID Search
  const [studentId, setStudentId] = useState("");
  const [studentSearchLoading, setStudentSearchLoading] =
    useState(false);
  const [studentSearchError, setStudentSearchError] =
    useState("");
  const [searchedStudent, setSearchedStudent] = useState(null);
  const [searchedDataset, setSearchedDataset] = useState(null);

  // =====================================================
  // FETCH DASHBOARD ANALYTICS
  // =====================================================

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://127.0.0.1:5000/api/dashboard/analytics"
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load dashboard analytics."
        );
      }

      setAnalytics(data);
    } catch (err) {
      console.error("Dashboard analytics error:", err);

      setError(
        err.message || "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // FETCH TOP 3 PERFORMERS
  // =====================================================

  const fetchTopPerformers = async () => {
    try {
      setTopPerformersLoading(true);
      setTopPerformersError("");

      const response = await fetch(
        "http://127.0.0.1:5000/api/dashboard/top-performers"
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load Top 3 Performers."
        );
      }

      setTopPerformerGroups(data.groups || []);
      setTopPerformerScoreColumn(data.score_column || "");
    } catch (err) {
      console.error("Top performers error:", err);

      setTopPerformersError(
        err.message || "Unable to load Top 3 Performers."
      );

      setTopPerformerGroups([]);
      setTopPerformerScoreColumn("");
    } finally {
      setTopPerformersLoading(false);
    }
  };

  // =====================================================
  // REFRESH BOTH DASHBOARD AND TOP PERFORMERS
  // =====================================================

  const handleDashboardRefresh = () => {
    fetchAnalytics();
    fetchTopPerformers();
  };

  // =====================================================
  // LOAD DASHBOARD
  // =====================================================

  useEffect(() => {
    fetchAnalytics();
    fetchTopPerformers();
  }, []);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  // =====================================================
  // DOWNLOAD CURRENT DATASET
  // =====================================================

  const handleDownload = () => {
    if (!analytics?.dataset?.id) {
      alert("No dataset available.");
      return;
    }

    const fileName = analytics.dataset.file_name;

    if (!fileName) {
      alert("Dataset file not available.");
      return;
    }

    const downloadUrl =
      `http://127.0.0.1:5000/api/datasets/${analytics.dataset.id}/download`;

    window.open(downloadUrl, "_blank");
  };

  // =====================================================
  // SEARCH STUDENT BY ID
  // =====================================================

  const handleStudentSearch = async () => {
    const trimmedStudentId = studentId.trim();

    setStudentSearchError("");
    setSearchedStudent(null);
    setSearchedDataset(null);

    if (!trimmedStudentId) {
      setStudentSearchError("Please enter a Student ID.");
      return;
    }

    try {
      setStudentSearchLoading(true);

      const response = await fetch(
        `http://127.0.0.1:5000/api/dashboard/student/${encodeURIComponent(
          trimmedStudentId
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Student ID not found."
        );
      }

      setSearchedStudent(data.student);
      setSearchedDataset(data.dataset || null);
    } catch (err) {
      console.error("Student search error:", err);

      setStudentSearchError(
        err.message || "Unable to find student."
      );
    } finally {
      setStudentSearchLoading(false);
    }
  };

  // =====================================================
  // ENTER KEY SEARCH
  // =====================================================

  const handleSearchKeyDown = (event) => {
    if (event.key === "Enter") {
      handleStudentSearch();
    }
  };

  // =====================================================
  // CLEAR SEARCH
  // =====================================================

  const clearStudentSearch = () => {
    setStudentId("");
    setStudentSearchError("");
    setSearchedStudent(null);
    setSearchedDataset(null);
  };

  // =====================================================
  // SAFE VALUES
  // =====================================================

  const dataset = analytics?.dataset || {};
  const performance = analytics?.performance || {};
  const risk = analytics?.risk || {};

  const totalRecords = dataset.total_records ?? 0;
  const totalColumns = dataset.total_columns ?? 0;

  const excellent = performance.excellent ?? 0;
  const good = performance.good ?? 0;
  const average = performance.average ?? 0;

  const highRisk = risk.high ?? 0;
  const mediumRisk = risk.medium ?? 0;
  const lowRisk = risk.low ?? 0;

  const overallAverage = analytics?.overall_average ?? 0;

  // Display percentage only when the score column is a percentage.
  const scoreColumnText = topPerformerScoreColumn.toLowerCase();

  const isPercentageScore =
    scoreColumnText.includes("percentage") ||
    scoreColumnText.includes("percent");

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Brain size={24} />
            </div>

            <div>
              <h2>Academic AI</h2>
              <span>Performance System</span>
            </div>
          </div>
        </aside>

        <main className="admin-main">
          <div
            style={{
              minHeight: "70vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <RefreshCw size={30} className="spin" />

            <strong>Loading dashboard...</strong>

            <span>
              Fetching latest academic insights
            </span>
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}

      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <Brain size={24} />
          </div>

          <div>
            <h2>Academic AI</h2>
            <span>Performance System</span>
          </div>
        </div>

        <div className="sidebar-menu">
          <p className="menu-title">MAIN</p>

          <button
            className="menu-item active"
            onClick={() => navigate("/admin")}
          >
            <LayoutDashboard size={19} />
            Dashboard
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/admin/dataset")}
          >
            <Database size={19} />
            Dataset Management
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/admin/students")}
          >
            <Users size={19} />
            Student Management
          </button>

          <p className="menu-title">ANALYTICS</p>

          <button
            className="menu-item"
            onClick={() => navigate("/prediction")}
          >
            <Brain size={19} />
            AI Prediction
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/admin/analytics")}
          >
            <BarChart3 size={19} />
            Performance Analytics
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/admin/at-risk")}
          >
            <ShieldAlert size={19} />
            At-Risk Students
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/admin/study-planner")}
          >
            <BookOpen size={19} />
            Study Planner
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/admin/assistant")}
          >
            <Bot size={19} />
            AI Academic Assistant
          </button>

          <button
            className="menu-item"
            onClick={() => navigate("/admin/performance-trends")}
          >
            <TrendingUp size={19} />
            Performance Trends
          </button>

          <p className="menu-title">SYSTEM</p>

          <button
            className="menu-item"
            onClick={() => navigate("/admin/reports")}
          >
            <FileText size={19} />
            Reports
          </button>
        </div>

        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={19} />
          Logout
        </button>
      </aside>

      {/* MAIN CONTENT */}

      <main className="admin-main">
        {/* HEADER */}

        <header className="admin-header">
          <div>
            <p className="page-label">ADMIN WORKSPACE</p>

            <h1>Academic Intelligence Dashboard</h1>

            <p className="header-subtitle">
              Monitor student performance, datasets and AI
              insights from one place.
            </p>
          </div>

          <div className="admin-profile">
            <div className="profile-avatar">
              <UserCheck size={20} />
            </div>

            <div>
              <strong>{user.username || "Admin"}</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        {/* DASHBOARD ERROR */}

        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 18px",
              borderRadius: "12px",
              background: "#fff1f1",
              border: "1px solid #ffd0d0",
              color: "#b42318",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "15px",
            }}
          >
            <span>⚠️ {error}</span>

            <button
              onClick={handleDashboardRefresh}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* STATS GRID */}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Database size={22} />
            </div>

            <div>
              <span>Total Dataset Records</span>
              <h2>{totalRecords.toLocaleString()}</h2>
              <small>Current uploaded dataset</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Activity size={22} />
            </div>

            <div>
              <span>Dataset Columns</span>
              <h2>{totalColumns}</h2>
              <small>Available academic features</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Target size={22} />
            </div>

            <div>
              <span>Overall Average</span>
              <h2>{overallAverage}%</h2>
              <small>Academic performance</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon warning">
              <ShieldAlert size={22} />
            </div>

            <div>
              <span>High Risk Students</span>
              <h2>{highRisk}</h2>
              <small>AI risk detection</small>
            </div>
          </div>
        </section>

        {/* DATASET MANAGEMENT */}

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Dataset Management</h2>

              <p>
                Manage academic datasets used for analytics and
                AI prediction.
              </p>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
            >
              <button
                className="download-btn"
                onClick={handleDownload}
              >
                <Download size={17} />
                Download Dataset
              </button>

              <button
                className="download-btn"
                onClick={handleDashboardRefresh}
                title="Refresh dashboard and rankings"
              >
                <RefreshCw size={17} />
                Refresh
              </button>
            </div>
          </div>

          {/* CURRENT DATASET */}

          <div
            style={{
              marginBottom: "18px",
              padding: "18px 20px",
              borderRadius: "14px",
              background: "#f5f9fa",
              border: "1px solid #e2eeee",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    letterSpacing: "0.08em",
                    color: "#104b4d",
                  }}
                >
                  CURRENT DATASET
                </span>

                <h3 style={{ margin: "6px 0 4px" }}>
                  {dataset.name || "No dataset available"}
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#667085",
                    fontSize: "14px",
                  }}
                >
                  {dataset.file_name || "Dataset file"}
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "28px",
                }}
              >
                <div>
                  <small>Records</small>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "20px",
                      marginTop: "3px",
                    }}
                  >
                    {totalRecords}
                  </strong>
                </div>

                <div>
                  <small>Columns</small>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "20px",
                      marginTop: "3px",
                    }}
                  >
                    {totalColumns}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* DATASET OPTIONS */}

          <div className="dataset-options">
            <div className="dataset-card">
              <div className="dataset-icon">
                <Upload size={24} />
              </div>

              <div>
                <h3>Upload Existing Dataset</h3>

                <p>
                  Upload a CSV dataset and validate it before
                  using it for analysis and machine learning.
                </p>

                <button
                  className="primary-action"
                  onClick={() => navigate("/admin/dataset")}
                >
                  <Upload size={17} />
                  Upload CSV
                </button>
              </div>
            </div>

            <div className="dataset-card">
              <div className="dataset-icon">
                <Plus size={24} />
              </div>

              <div>
                <h3>Create New Dataset</h3>

                <p>
                  Add academic records inside the application
                  and save them for future analysis and prediction.
                </p>

                <button
                  className="secondary-action"
                  onClick={() => navigate("/admin/dataset")}
                >
                  <Plus size={17} />
                  Create Dataset
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            TOP 3 PERFORMERS
        ================================================= */}

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Top 3 Performers</h2>

              <p>
                Highest-performing students grouped by
                department, year and semester.
              </p>
            </div>

            <button
              className="download-btn"
              onClick={fetchTopPerformers}
              disabled={topPerformersLoading}
            >
              <RefreshCw
                size={17}
                className={topPerformersLoading ? "spin" : ""}
              />

              {topPerformersLoading
                ? "Loading..."
                : "Refresh Rankings"}
            </button>
          </div>

          {/* LOADING */}

          {topPerformersLoading && (
            <div
              style={{
                padding: "24px",
                textAlign: "center",
                color: "#667085",
              }}
            >
              <RefreshCw
                size={22}
                className="spin"
                style={{ marginBottom: "8px" }}
              />

              <p style={{ margin: 0 }}>
                Calculating student rankings...
              </p>
            </div>
          )}

          {/* ERROR */}

          {!topPerformersLoading && topPerformersError && (
            <div
              style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: "12px",
                background: "#fff1f1",
                border: "1px solid #ffd0d0",
                color: "#b42318",
              }}
            >
              <p style={{ margin: "0 0 10px" }}>
                ⚠️ {topPerformersError}
              </p>

              <button
                className="download-btn"
                onClick={fetchTopPerformers}
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          )}

          {/* NO RESULTS */}

          {!topPerformersLoading &&
            !topPerformersError &&
            topPerformerGroups.length === 0 && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "24px",
                  border: "1px dashed #d0dede",
                  borderRadius: "12px",
                  textAlign: "center",
                  color: "#667085",
                }}
              >
                No ranked students are available in the current
                dataset.
              </div>
            )}

          {/* RANKING GROUPS */}

          {!topPerformersLoading &&
            !topPerformersError &&
            topPerformerGroups.map((group, groupIndex) => (
              <div
                key={`${group.department}-${group.year}-${group.semester}-${groupIndex}`}
                style={{
                  marginTop: "18px",
                  padding: "20px",
                  border: "1px solid #e2eeee",
                  borderRadius: "14px",
                  background: "#ffffff",
                  boxShadow:
                    "0 4px 14px rgba(16, 75, 77, 0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                    flexWrap: "wrap",
                    marginBottom: "10px",
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      color: "#104b4d",
                      fontSize: "17px",
                    }}
                  >
                    {group.department}
                    {" · Year "}
                    {group.year}
                    {" · Semester "}
                    {group.semester}
                  </h3>

                  <span
                    style={{
                      fontSize: "12px",
                      color: "#667085",
                    }}
                  >
                    Top {group.students?.length || 0} students
                  </span>
                </div>

                {(group.students || []).map((student) => (
                  <div
                    key={`${student.rank}-${student.student_id}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "48px minmax(0, 1fr) auto",
                      alignItems: "center",
                      gap: "14px",
                      padding: "14px 8px",
                      borderTop: "1px solid #edf2f2",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background:
                          student.rank === 1
                            ? "#fff1c2"
                            : student.rank === 2
                            ? "#edf0f3"
                            : "#f9e6d8",
                        color: "#104b4d",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "700",
                      }}
                    >
                      #{student.rank}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong
                        style={{
                          display: "block",
                          color: "#172b2c",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {student.name || student.student_id}
                      </strong>

                      <p
                        style={{
                          margin: "4px 0 0",
                          color: "#667085",
                          fontSize: "13px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        Student ID: {student.student_id}
                      </p>
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <strong
                        style={{
                          color: "#104b4d",
                          fontSize: "17px",
                        }}
                      >
                        {student.score}
                        {isPercentageScore ? "%" : ""}
                      </strong>

                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "11px",
                          color: "#667085",
                        }}
                      >
                        {isPercentageScore
                          ? "Performance"
                          : "Score"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
        </section>

        {/* QUICK ANALYTICS */}

        <section className="dashboard-section">
          <div className="section-heading">
            <div>
              <h2>Quick Analytics</h2>

              <p>
                Current overview of academic performance from
                the uploaded dataset.
              </p>
            </div>

            {/* STUDENT SEARCH */}

            <div
              className="search-box"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Search size={17} />

              <input
                type="text"
                placeholder="Search by Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                disabled={studentSearchLoading}
              />

              {studentId && (
                <button
                  type="button"
                  onClick={clearStudentSearch}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    padding: "2px",
                  }}
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}

              <button
                type="button"
                onClick={handleStudentSearch}
                disabled={studentSearchLoading}
                style={{
                  border: "none",
                  background: "#104b4d",
                  color: "#ffffff",
                  padding: "8px 13px",
                  borderRadius: "8px",
                  cursor: studentSearchLoading
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                  opacity: studentSearchLoading ? 0.7 : 1,
                }}
              >
                {studentSearchLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>

          {/* SEARCH ERROR */}

          {studentSearchError && (
            <div
              style={{
                marginTop: "16px",
                padding: "13px 16px",
                borderRadius: "11px",
                background: "#fff1f1",
                border: "1px solid #ffd0d0",
                color: "#b42318",
                fontSize: "14px",
                fontWeight: "500",
              }}
            >
              ⚠️ {studentSearchError}
            </div>
          )}

          {/* SEARCH RESULT */}

          {searchedStudent && (
            <div
              style={{
                marginTop: "18px",
                padding: "22px",
                borderRadius: "15px",
                background: "#ffffff",
                border: "1px solid #dceaea",
                boxShadow:
                  "0 6px 20px rgba(16, 75, 77, 0.07)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "15px",
                  flexWrap: "wrap",
                  marginBottom: "18px",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      letterSpacing: "0.08em",
                      color: "#104b4d",
                    }}
                  >
                    STUDENT FOUND
                  </span>

                  <h3
                    style={{
                      margin: "5px 0 3px",
                      fontSize: "21px",
                    }}
                  >
                    {searchedStudent.name || "Student"}
                  </h3>

                  <p
                    style={{
                      margin: 0,
                      color: "#667085",
                      fontSize: "13px",
                    }}
                  >
                    Academic details from current uploaded dataset
                  </p>
                </div>

                {searchedDataset && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: "8px",
                      background: "#f0fafa",
                      color: "#104b4d",
                      fontSize: "12px",
                      fontWeight: "600",
                    }}
                  >
                    {searchedDataset.name}
                  </div>
                )}
              </div>

              {/* BASIC DETAILS */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "12px",
                  marginBottom: "18px",
                }}
              >
                <div
                  style={{
                    padding: "15px",
                    borderRadius: "11px",
                    background: "#f5f9fa",
                  }}
                >
                  <small>Student ID</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                      color: "#104b4d",
                    }}
                  >
                    {searchedStudent.student_id ??
                      searchedStudent.Student_ID ??
                      searchedStudent.id ??
                      "-"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "11px",
                    background: "#f5f9fa",
                  }}
                >
                  <small>Name</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    {searchedStudent.name ??
                      searchedStudent.Name ??
                      "-"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "11px",
                    background: "#f5f9fa",
                  }}
                >
                  <small>Department</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    {searchedStudent.department ??
                      searchedStudent.Department ??
                      "-"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "11px",
                    background: "#f5f9fa",
                  }}
                >
                  <small>Semester</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    {searchedStudent.semester ??
                      searchedStudent.Semester ??
                      "-"}
                  </strong>
                </div>
              </div>

              {/* ACADEMIC DETAILS */}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "15px",
                    borderRadius: "11px",
                    background: "#f8fbfb",
                    border: "1px solid #e5eeee",
                  }}
                >
                  <small>Overall Performance</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                      fontSize: "19px",
                      color: "#104b4d",
                    }}
                  >
                    {searchedStudent.overall_performance_percentage ??
                      searchedStudent.overall_percentage ??
                      searchedStudent.overall_performance ??
                      "-"}

                    {(
                      searchedStudent.overall_performance_percentage ??
                      searchedStudent.overall_percentage ??
                      searchedStudent.overall_performance
                    ) !== undefined &&
                    (
                      searchedStudent.overall_performance_percentage ??
                      searchedStudent.overall_percentage ??
                      searchedStudent.overall_performance
                    ) !== null
                      ? "%"
                      : ""}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "11px",
                    background: "#f8fbfb",
                    border: "1px solid #e5eeee",
                  }}
                >
                  <small>Attendance</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                      fontSize: "19px",
                    }}
                  >
                    {searchedStudent.attendance_percentage ?? "-"}

                    {searchedStudent.attendance_percentage !== undefined &&
                    searchedStudent.attendance_percentage !== null
                      ? "%"
                      : ""}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "11px",
                    background: "#f8fbfb",
                    border: "1px solid #e5eeee",
                  }}
                >
                  <small>Performance Category</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                      fontSize: "16px",
                    }}
                  >
                    {searchedStudent.performance_category ?? "-"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "15px",
                    borderRadius: "11px",
                    background: "#f8fbfb",
                    border: "1px solid #e5eeee",
                  }}
                >
                  <small>Risk Status</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                      fontSize: "16px",
                    }}
                  >
                    {searchedStudent.risk_status ?? "-"}
                  </strong>
                </div>
              </div>

              {/* EXTRA ACADEMIC DETAILS */}

              <div
                style={{
                  marginTop: "14px",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "12px",
                }}
              >
                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "#f8fbfb",
                  }}
                >
                  <small>Study Hours / Day</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                    }}
                  >
                    {searchedStudent.study_hours_per_day ?? "-"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "#f8fbfb",
                  }}
                >
                  <small>Backlog Count</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                    }}
                  >
                    {searchedStudent.backlog_count ?? "-"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "#f8fbfb",
                  }}
                >
                  <small>Learning Activity</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                    }}
                  >
                    {searchedStudent.learning_activity_score ?? "-"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "#f8fbfb",
                  }}
                >
                  <small>Performance Trend</small>

                  <strong
                    style={{
                      display: "block",
                      marginTop: "4px",
                    }}
                  >
                    {searchedStudent.performance_trend ?? "-"}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ANALYTICS CARDS */}

          <div
            className="analytics-grid"
            style={{
              marginTop:
                searchedStudent || studentSearchError
                  ? "22px"
                  : undefined,
            }}
          >
            <div className="analytics-card">
              <span>Excellent Performance</span>
              <strong>{excellent}</strong>
              <small>Students</small>
            </div>

            <div className="analytics-card">
              <span>Good Performance</span>
              <strong>{good}</strong>
              <small>Students</small>
            </div>

            <div className="analytics-card">
              <span>Average Performance</span>
              <strong>{average}</strong>
              <small>Students</small>
            </div>

            <div className="analytics-card">
              <span>Students at Risk</span>
              <strong>{highRisk}</strong>
              <small>Requires attention</small>
            </div>
          </div>

          {/* RISK OVERVIEW */}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "15px",
              marginTop: "18px",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                background: "#f5f9fa",
              }}
            >
              <span>High Risk</span>

              <strong
                style={{
                  display: "block",
                  fontSize: "24px",
                  marginTop: "5px",
                }}
              >
                {highRisk}
              </strong>

              <small>Students requiring intervention</small>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                background: "#f5f9fa",
              }}
            >
              <span>Medium Risk</span>

              <strong
                style={{
                  display: "block",
                  fontSize: "24px",
                  marginTop: "5px",
                }}
              >
                {mediumRisk}
              </strong>

              <small>Students needing monitoring</small>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius: "12px",
                background: "#f5f9fa",
              }}
            >
              <span>Low Risk</span>

              <strong
                style={{
                  display: "block",
                  fontSize: "24px",
                  marginTop: "5px",
                }}
              >
                {lowRisk}
              </strong>

              <small>Students performing safely</small>
            </div>
          </div>
        </section>

        {/* AI STATUS */}

        <section className="ai-status">
          <div className="ai-status-icon">
            <Brain size={25} />
          </div>

          <div>
            <h3>AI Performance Engine</h3>

            <p>
              Decision Tree model is currently configured as the
              best performing model for student performance prediction.
            </p>
          </div>

          <div className="ai-badge">MODEL READY</div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
