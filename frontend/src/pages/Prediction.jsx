import {
  ArrowLeft,
  Brain,
  Search,
  LoaderCircle,
  Sparkles,
  ShieldAlert,
  TrendingUp,
  Target,
  Lightbulb,
  RotateCcw,
} from "lucide-react";

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Prediction.css";

function Prediction() {
  const navigate = useNavigate();

  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState(null);
  const [prediction, setPrediction] = useState(null);

  const [loadingStudent, setLoadingStudent] = useState(false);
  const [predicting, setPredicting] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // ============================================================
  // SAFE VALUE
  // ============================================================

  const getValue = (names, fallback = "—") => {
    if (!student) {
      return fallback;
    }

    for (const name of names) {
      const value = student[name];

      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
        return value;
      }
    }

    return fallback;
  };

  // ============================================================
  // SEARCH STUDENT
  // ============================================================

  const handleSearch = async () => {
    const id = studentId.trim();

    if (!id) {
      setMessage("Please enter a Student ID.");
      setMessageType("error");
      return;
    }

    setLoadingStudent(true);
    setMessage("");
    setPrediction(null);
    setStudent(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/api/dashboard/student/${encodeURIComponent(
          id
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Student not found.");
      }

      setStudent(data.student);

      setMessage("Student academic data loaded successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Student search error:", error);

      setStudent(null);
      setPrediction(null);

      setMessage(
        error.message || "Unable to find student."
      );

      setMessageType("error");
    } finally {
      setLoadingStudent(false);
    }
  };

  // ============================================================
  // ML PREDICTION
  // ============================================================

  const handlePredict = async () => {
    if (!student) {
      setMessage("Search for a student first.");
      setMessageType("error");
      return;
    }

    const id = studentId.trim();

    if (!id) {
      setMessage("Student ID is required.");
      setMessageType("error");
      return;
    }

    setPredicting(true);
    setMessage("");
    setPrediction(null);

    try {
      /*
       * IMPORTANT:
       * This is the actual Flask ML prediction endpoint.
       *
       * /api/predict is NOT used.
       */

      const response = await fetch(
        `http://127.0.0.1:5000/api/prediction/student/${encodeURIComponent(
          id
        )}`
      );

      const data = await response.json();

      console.log("Prediction API response:", data);

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Prediction failed."
        );
      }

      /*
       * Backend prediction response
       *
       * prediction:
       * "Excellent" / "Good" / "Average"
       */

      const predictionResult = {
        category:
          data.prediction ??
          data.category ??
          "Not available",

        confidence:
          data.confidence !== undefined &&
          data.confidence !== null
            ? Number(data.confidence)
            : null,

        current_overall:
          data.current_overall ??
          data.overall_performance_percentage ??
          student.overall_performance_percentage ??
          null,

        risk_status:
          data.risk_status ??
          student.risk_status ??
          "Not available",

        performance_trend:
          data.performance_trend ??
          student.performance_trend ??
          "Stable",

        important_factors:
          data.feature_importance ??
          data.important_factors ??
          [],

        suggestions:
          data.suggestions ??
          [],

        insight:
          data.insight ??
          `The trained machine learning model predicts this student's academic performance as ${
            data.prediction ?? data.category ?? "Not available"
          }.`,
      };

      setPrediction(predictionResult);

      setMessage(
        "AI prediction completed successfully."
      );

      setMessageType("success");
    } catch (error) {
      console.error("Prediction error:", error);

      setPrediction(null);

      setMessage(
        error.message ||
          "Unable to generate prediction."
      );

      setMessageType("error");
    } finally {
      setPredicting(false);
    }
  };

  // ============================================================
  // RESET
  // ============================================================

  const handleReset = () => {
    setStudentId("");
    setStudent(null);
    setPrediction(null);
    setMessage("");
    setMessageType("");
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="prediction-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="prediction-header">

        <button
          className="back-button"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft size={18} />
          Dashboard
        </button>

        <div className="prediction-title">

          <div className="prediction-title-icon">
            <Brain size={24} />
          </div>

          <div>
            <span>
              AI ANALYTICS
            </span>

            <h1>
              AI Performance Prediction
            </h1>

            <p>
              Predict academic performance using
              the trained machine learning model.
            </p>
          </div>

        </div>
      </header>


      {/* ======================================================
          MAIN
      ====================================================== */}

      <main className="prediction-content">

        {/* ====================================================
            SEARCH STUDENT
        ==================================================== */}

        <section className="prediction-search-card">

          <div className="card-heading">

            <div>
              <span className="section-label">
                STUDENT ANALYSIS
              </span>

              <h2>
                Find a Student
              </h2>

              <p>
                Enter the Student ID to load
                academic information for prediction.
              </p>
            </div>

          </div>


          <div className="student-search-row">

            <div className="student-id-input">

              <Search size={19} />

              <input
                type="text"
                placeholder="Enter Student ID"
                value={studentId}
                onChange={(e) =>
                  setStudentId(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch();
                  }
                }}
              />

            </div>


            <button
              className="search-student-button"
              onClick={handleSearch}
              disabled={loadingStudent}
            >

              {loadingStudent ? (
                <LoaderCircle
                  size={18}
                  className="spin"
                />
              ) : (
                <Search size={18} />
              )}

              {loadingStudent
                ? "Loading..."
                : "Find Student"}

            </button>


            <button
              className="reset-button"
              onClick={handleReset}
            >
              <RotateCcw size={17} />
              Reset
            </button>

          </div>

        </section>


        {/* ====================================================
            MESSAGE
        ==================================================== */}

        {message && (
          <div
            className={`prediction-message ${messageType}`}
          >
            {message}
          </div>
        )}


        {/* ====================================================
            STUDENT DATA
        ==================================================== */}

        {student && (

          <section className="student-data-card">

            <div className="student-card-header">

              <div>

                <span className="section-label">
                  ACADEMIC PROFILE
                </span>

                <h2>
                  {getValue(
                    [
                      "name",
                      "student_name",
                    ],
                    "Student"
                  )}
                </h2>

                <p>
                  Student ID:{" "}
                  <strong>
                    {studentId}
                  </strong>
                </p>

              </div>


              <div className="student-meta">

                <span>
                  Department
                </span>

                <strong>
                  {getValue([
                    "department",
                  ])}
                </strong>

              </div>


              <div className="student-meta">

                <span>
                  Semester
                </span>

                <strong>
                  {getValue([
                    "semester",
                  ])}
                </strong>

              </div>

            </div>


            {/* ==================================================
                ACADEMIC INFORMATION
            ================================================== */}

            <div className="academic-grid">

              <div className="academic-item">
                <span>Attendance</span>

                <strong>
                  {getValue([
                    "attendance_percentage",
                    "attendance",
                  ])}

                  {getValue(
                    [
                      "attendance_percentage",
                      "attendance",
                    ],
                    ""
                  ) !== "—"
                    ? "%"
                    : ""}
                </strong>
              </div>


              <div className="academic-item">
                <span>Internal 1</span>

                <strong>
                  {getValue([
                    "internal_1_marks",
                  ])}
                </strong>
              </div>


              <div className="academic-item">
                <span>Internal 2</span>

                <strong>
                  {getValue([
                    "internal_2_marks",
                  ])}
                </strong>
              </div>


              <div className="academic-item">
                <span>Assignment</span>

                <strong>
                  {getValue([
                    "assignment_score",
                  ])}
                </strong>
              </div>


              <div className="academic-item">
                <span>
                  Previous Semester
                </span>

                <strong>
                  {getValue([
                    "previous_semester_percentage",
                  ])}

                  {getValue(
                    [
                      "previous_semester_percentage",
                    ],
                    ""
                  ) !== "—"
                    ? "%"
                    : ""}
                </strong>
              </div>


              <div className="academic-item">
                <span>
                  Study Hours / Day
                </span>

                <strong>
                  {getValue([
                    "study_hours_per_day",
                  ])}
                </strong>
              </div>


              <div className="academic-item">
                <span>
                  Backlogs
                </span>

                <strong>
                  {getValue([
                    "backlog_count",
                  ])}
                </strong>
              </div>


              <div className="academic-item">
                <span>
                  Practice Tests
                </span>

                <strong>
                  {getValue([
                    "practice_tests_completed",
                  ])}
                </strong>
              </div>

            </div>


            {/* ==================================================
                PREDICT BUTTON
            ================================================== */}

            <button
              className="predict-button"
              onClick={handlePredict}
              disabled={predicting}
            >

              {predicting ? (
                <>
                  <LoaderCircle
                    size={20}
                    className="spin"
                  />

                  AI is analyzing...
                </>
              ) : (
                <>
                  <Sparkles size={20} />

                  Predict Performance
                </>
              )}

            </button>

          </section>
        )}


        {/* ====================================================
            PREDICTION RESULT
        ==================================================== */}

        {prediction && (

          <section className="prediction-result">

            <div className="result-header">

              <div>

                <span className="section-label">
                  AI PREDICTION RESULT
                </span>

                <h2>
                  Academic Performance Insight
                </h2>

              </div>


              <div className="model-ready">
                <Brain size={16} />
                MODEL READY
              </div>

            </div>


            {/* ==================================================
                RESULT CARDS
            ================================================== */}

            <div className="result-main-grid">

              {/* CATEGORY */}

              <div className="result-category-card">

                <span>
                  Predicted Performance
                </span>

                <strong>
                  {prediction.category}
                </strong>


                {prediction.confidence !== null && (
                  <div className="confidence">

                    <span>
                      Confidence
                    </span>

                    <strong>
                      {prediction.confidence}%
                    </strong>

                  </div>
                )}

              </div>


              {/* CURRENT OVERALL */}

              <div className="result-info-card">

                <div className="result-info-icon">
                  <Target size={21} />
                </div>

                <span>
                  Current Overall
                </span>

                <strong>
                  {prediction.current_overall !== null
                    ? `${prediction.current_overall}%`
                    : "Not available"}
                </strong>

              </div>


              {/* RISK */}

              <div className="result-info-card">

                <div className="result-info-icon">
                  <ShieldAlert size={21} />
                </div>

                <span>
                  Risk Status
                </span>

                <strong>
                  {prediction.risk_status}
                </strong>

              </div>


              {/* TREND */}

              <div className="result-info-card">

                <div className="result-info-icon">
                  <TrendingUp size={21} />
                </div>

                <span>
                  Performance Trend
                </span>

                <strong>
                  {prediction.performance_trend}
                </strong>

              </div>

            </div>


            {/* ==================================================
                AI INSIGHT
            ================================================== */}

            <div className="insight-card">

              <div className="insight-icon">
                <Lightbulb size={21} />
              </div>

              <div>

                <h3>
                  AI Insight
                </h3>

                <p>
                  {prediction.insight}
                </p>

              </div>

            </div>


            {/* ==================================================
                FACTORS + SUGGESTIONS
            ================================================== */}

            <div className="result-lower-grid">

              {/* FACTORS */}

              <div className="result-panel">

                <div className="panel-title">

                  <Target size={18} />

                  <h3>
                    Key Contributing Factors
                  </h3>

                </div>


                {prediction.important_factors?.length ? (

                  <div className="factor-list">

                    {prediction.important_factors.map(
                      (factor, index) => (

                        <div
                          className="factor-item"
                          key={`${factor.feature}-${index}`}
                        >

                          <span>
                            {String(
                              factor.feature
                            )
                              .replaceAll(
                                "_",
                                " "
                              )
                              .replace(
                                /\b\w/g,
                                (letter) =>
                                  letter.toUpperCase()
                              )}
                          </span>

                          <strong>
                            {factor.importance}%
                          </strong>

                        </div>

                      )
                    )}

                  </div>

                ) : (

                  <p className="empty-result">
                    Feature importance is not
                    available for this model.
                  </p>

                )}

              </div>


              {/* SUGGESTIONS */}

              <div className="result-panel">

                <div className="panel-title">

                  <Lightbulb size={18} />

                  <h3>
                    Improvement Suggestions
                  </h3>

                </div>


                <div className="suggestion-list">

                  {prediction.suggestions?.length ? (

                    prediction.suggestions.map(
                      (suggestion, index) => (

                        <div
                          className="suggestion-item"
                          key={index}
                        >

                          <span>
                            {index + 1}
                          </span>

                          <p>
                            {suggestion}
                          </p>

                        </div>

                      )
                    )

                  ) : (

                    <p className="empty-result">
                      Personalized suggestions will
                      be available in the recommendation
                      module.
                    </p>

                  )}

                </div>

              </div>

            </div>

          </section>
        )}

      </main>
    </div>
  );
}

export default Prediction;