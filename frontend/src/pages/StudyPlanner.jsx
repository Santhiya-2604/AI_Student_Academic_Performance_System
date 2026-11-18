import { useState } from "react";

import {
  BookOpen,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  TrendingUp,
  Search,
} from "lucide-react";

import "./StudyPlanner.css";

function StudyPlanner() {
  // =====================================================
  // STATE
  // =====================================================

  const [studentId, setStudentId] = useState("");
  const [planner, setPlanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // =====================================================
  // FETCH STUDY PLANNER
  // =====================================================

  const fetchPlanner = async () => {
    const trimmedStudentId = studentId.trim();

    setError("");
    setPlanner(null);

    if (!trimmedStudentId) {
      setError("Please enter a Student ID.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `http://127.0.0.1:5000/api/study-planner/${encodeURIComponent(
          trimmedStudentId
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to generate study planner."
        );
      }

      setPlanner(data);
    } catch (err) {
      console.error("Study Planner Error:", err);

      setError(
        err.message || "Unable to load study planner."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // ENTER KEY
  // =====================================================

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      fetchPlanner();
    }
  };

  // =====================================================
  // CLEAR
  // =====================================================

  const handleClear = () => {
    setStudentId("");
    setPlanner(null);
    setError("");
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="planner-page">
        <div className="planner-loading">
          <RefreshCw className="planner-spin" size={34} />

          <h3>Generating Study Planner</h3>

          <p>
            Preparing a personalized academic study plan...
          </p>
        </div>
      </div>
    );
  }

  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="planner-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="planner-header">

        <div className="planner-header-left">

          <div className="planner-header-icon">
            <BookOpen size={28} />
          </div>

          <div>
            <p className="planner-label">
              ADMIN • PERSONALIZED LEARNING
            </p>

            <h1>Study Planner</h1>

            <p className="planner-subtitle">
              Generate an AI-powered personalized study
              plan based on student academic performance.
            </p>
          </div>

        </div>

      </div>

      {/* =================================================
          SEARCH PANEL
      ================================================= */}

      <div className="planner-search-card">

        <div className="planner-search-heading">

          <div className="search-heading-icon">
            <Search size={20} />
          </div>

          <div>
            <h3>Generate Study Planner</h3>

            <p>
              Enter a Student ID to generate a
              personalized academic study plan.
            </p>
          </div>

        </div>

        <div className="planner-search-row">

          <div className="planner-input-wrapper">

            <Search size={18} />

            <input
              type="text"
              placeholder="Enter Student ID"
              value={studentId}
              onChange={(event) =>
                setStudentId(event.target.value)
              }
              onKeyDown={handleKeyDown}
            />

            {studentId && (
              <button
                type="button"
                className="planner-clear-btn"
                onClick={handleClear}
                title="Clear"
              >
                ×
              </button>
            )}

          </div>

          <button
            type="button"
            className="planner-generate-btn"
            onClick={fetchPlanner}
          >
            <BookOpen size={18} />
            Generate Planner
          </button>

        </div>

        {error && (
          <div className="planner-error">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}

      </div>

      {/* =================================================
          PLANNER RESULT
      ================================================= */}

      {planner && (
        <div className="planner-result">

          {/* =================================================
              STUDENT PROFILE
          ================================================= */}

          <div className="planner-student-card">

            <div className="student-info">

              <span className="student-label">
                STUDENT
              </span>

              <h2>
                {planner.student_name}
              </h2>

              <p>
                Student ID:{" "}
                <strong>{planner.student_id}</strong>
              </p>

            </div>

            <div
              className={`risk-badge ${
                planner.risk_status?.toLowerCase() || ""
              }`}
            >
              <AlertTriangle size={17} />

              {planner.risk_status} Risk
            </div>

          </div>

          {/* =================================================
              SUMMARY CARDS
          ================================================= */}

          <div className="planner-summary-grid">

            <div className="planner-summary-card">

              <div className="summary-icon performance-icon">
                <TrendingUp size={21} />
              </div>

              <div className="summary-content">
                <span>Overall Performance</span>

                <strong>
                  {planner.overall_performance}%
                </strong>
              </div>

            </div>

            <div className="planner-summary-card">

              <div className="summary-icon study-icon">
                <Clock size={21} />
              </div>

              <div className="summary-content">
                <span>Daily Study Hours</span>

                <strong>
                  {planner.study_hours_per_day} hrs
                </strong>
              </div>

            </div>

            <div className="planner-summary-card">

              <div className="summary-icon attendance-icon">
                <Target size={21} />
              </div>

              <div className="summary-content">
                <span>Attendance</span>

                <strong>
                  {planner.attendance}%
                </strong>
              </div>

            </div>

            <div className="planner-summary-card">

              <div className="summary-icon backlog-icon">
                <AlertTriangle size={21} />
              </div>

              <div className="summary-content">
                <span>Backlogs</span>

                <strong>
                  {planner.backlog_count}
                </strong>
              </div>

            </div>

          </div>

          {/* =================================================
              SUBJECT FOCUS
          ================================================= */}

          <div className="planner-section">

            <div className="section-title">

              <div className="section-title-icon">
                <Target size={20} />
              </div>

              <div>
                <h2>Subject Focus</h2>

                <p>
                  Subjects that require additional attention
                </p>
              </div>

            </div>

            {/* WEAK SUBJECT */}

            {planner.weak_subject && (
              <div className="weak-subject-card">

                <div className="weak-subject-left">

                  <span>
                    NEEDS MORE ATTENTION
                  </span>

                  <h3>
                    {planner.weak_subject.subject}
                  </h3>

                </div>

                <div className="weak-subject-score">

                  <strong>
                    {planner.weak_subject.marks}
                  </strong>

                  <span>/100</span>

                </div>

              </div>
            )}

            {/* SUBJECT TABLE */}

            <div className="subject-table-wrapper">

              <table className="subject-table">

                <thead>
                  <tr>
                    <th>#</th>
                    <th>Subject</th>
                    <th>Marks</th>
                    <th>Performance</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>

                  {planner.subject_marks?.map(
                    (subject, index) => {

                      const marks = Math.min(
                        Math.max(
                          Number(subject.marks) || 0,
                          0
                        ),
                        100
                      );

                      let status = "Good";

                      if (marks < 40) {
                        status = "Needs Attention";
                      } else if (marks < 60) {
                        status = "Average";
                      }

                      return (
                        <tr key={index}>

                          <td className="subject-number">
                            {index + 1}
                          </td>

                          <td className="subject-name">
                            {subject.subject}
                          </td>

                          <td className="subject-mark">
                            {subject.marks}/100
                          </td>

                          <td className="subject-progress-cell">

                            <div className="table-progress">

                              <div className="table-progress-track">

                                <div
                                  className="table-progress-fill"
                                  style={{
                                    width: `${marks}%`,
                                  }}
                                />

                              </div>

                              <span>
                                {marks}%
                              </span>

                            </div>

                          </td>

                          <td>

                            <span
                              className={`subject-status ${
                                status
                                  .toLowerCase()
                                  .replace(
                                    /\s+/g,
                                    "-"
                                  )
                              }`}
                            >
                              {status}
                            </span>

                          </td>

                        </tr>
                      );
                    }
                  )}

                </tbody>

              </table>

            </div>

          </div>

          {/* =================================================
              AI RECOMMENDATIONS
          ================================================= */}

          <div className="planner-section">

            <div className="section-title">

              <div className="section-title-icon recommendation-icon">
                <CheckCircle size={20} />
              </div>

              <div>
                <h2>AI Recommendations</h2>

                <p>
                  Personalized actions based on academic
                  performance
                </p>
              </div>

            </div>

            <div className="recommendation-grid">

              {planner.recommendations?.map(
                (recommendation, index) => (

                  <div
                    className="recommendation-card"
                    key={index}
                  >

                    <div className="recommendation-number">
                      {index + 1}
                    </div>

                    <p>
                      {recommendation}
                    </p>

                  </div>

                )
              )}

            </div>

          </div>

          {/* =================================================
              DAILY TIMETABLE
          ================================================= */}

          <div className="planner-section timetable-section">

            <div className="section-title">

              <div className="section-title-icon timetable-icon">
                <Clock size={20} />
              </div>

              <div>
                <h2>
                  Personalized Daily Timetable
                </h2>

                <p>
                  Recommended daily study activities
                </p>
              </div>

            </div>

            <div className="timetable-wrapper">

              <table className="timetable-table">

                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Activity</th>
                    <th>Duration</th>
                    <th>Focus</th>
                  </tr>
                </thead>

                <tbody>

                  {planner.timetable?.map(
                    (item, index) => (

                      <tr key={index}>

                        <td className="timetable-time">
                          <span>
                            {item.time}
                          </span>
                        </td>

                        <td className="timetable-activity">
                          <strong>
                            {item.activity}
                          </strong>
                        </td>

                        <td className="timetable-duration">
                          {item.duration}
                        </td>

                        <td className="timetable-check">
                          <CheckCircle
                            size={20}
                          />
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default StudyPlanner;