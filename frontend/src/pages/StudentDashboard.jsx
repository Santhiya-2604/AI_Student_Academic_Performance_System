import { useEffect, useMemo, useState } from "react";

import {
  BookOpen,
  CalendarDays,
  CheckCircle,
  Clock,
  GraduationCap,
  LogOut,
  RefreshCw,
  Target,
  TrendingDown,
  UserRound,
  AlertTriangle,
  Circle,
  Trophy,
  ClipboardCheck,
} from "lucide-react";

import "./StudentDashboard.css";

function StudentDashboard() {
  const [planner, setPlanner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completedTasks, setCompletedTasks] = useState({});

  // --------------------------------------------------
  // GET STUDENT ID FROM LOGGED-IN USER
  // --------------------------------------------------

  const getStudentId = () => {
    try {
      const savedUser = localStorage.getItem("user");

      if (!savedUser) {
        console.error("No user found in localStorage.");
        return null;
      }

      const user = JSON.parse(savedUser);

      console.log("Logged-in user details:", user);

      const studentId =
        user.student_id ??
        user.studentId ??
        user.roll_number ??
        user.register_number ??
        user.username ??
        user.user?.student_id ??
        user.user?.studentId ??
        user.user?.id;

      if (
        studentId === null ||
        studentId === undefined ||
        String(studentId).trim() === ""
      ) {
        console.error(
          "Student ID is missing from user details:",
          user
        );

        return null;
      }

      const finalStudentId = String(studentId).trim();

      console.log("Final Student ID:", finalStudentId);

      return finalStudentId;
    } catch (error) {
      console.error(
        "Unable to read user details:",
        error
      );

      return null;
    }
  };

  // --------------------------------------------------
  // LOCAL STORAGE KEY FOR COMPLETED TASKS
  // --------------------------------------------------

  const getTaskStorageKey = () => {
    const studentId = getStudentId();

    return studentId
      ? `study_planner_tasks_${studentId}`
      : "study_planner_tasks";
  };

  // --------------------------------------------------
  // LOAD COMPLETED TASKS
  // --------------------------------------------------

  const loadCompletedTasks = () => {
    try {
      const savedTasks = localStorage.getItem(
        getTaskStorageKey()
      );

      if (savedTasks) {
        setCompletedTasks(JSON.parse(savedTasks));
      } else {
        setCompletedTasks({});
      }
    } catch (error) {
      console.error(
        "Unable to load completed tasks:",
        error
      );

      setCompletedTasks({});
    }
  };

  // --------------------------------------------------
  // SAVE COMPLETED TASKS
  // --------------------------------------------------

  const saveCompletedTasks = (updatedTasks) => {
    try {
      localStorage.setItem(
        getTaskStorageKey(),
        JSON.stringify(updatedTasks)
      );
    } catch (error) {
      console.error(
        "Unable to save completed tasks:",
        error
      );
    }
  };

  // --------------------------------------------------
  // FETCH STUDY PLANNER FROM BACKEND
  // --------------------------------------------------

  const fetchStudyPlanner = async () => {
    setLoading(true);
    setError("");

    const studentId = getStudentId();

    if (!studentId) {
      setError(
        "Student ID not found. Please login again using your student account."
      );

      setLoading(false);
      return;
    }

    try {
      console.log(
        "Planner Student ID:",
        studentId
      );

      const response = await fetch(
        `http://127.0.0.1:5000/api/study-planner/${encodeURIComponent(
          studentId
        )}`
      );

      let data;

      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(
          "Invalid response received from backend."
        );
      }

      console.log(
        "Study Planner API Response:",
        data
      );

      if (response.ok && data.success) {
        setPlanner(data);
        setError("");
      } else {
        setPlanner(null);

        setError(
          data.message ||
            "Unable to load your study planner."
        );
      }
    } catch (error) {
      console.error(
        "Study planner error:",
        error
      );

      setPlanner(null);

      setError(
        "Unable to connect to the backend. Please make sure Flask is running."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // INITIAL PAGE LOAD
  // --------------------------------------------------

  useEffect(() => {
    loadCompletedTasks();
    fetchStudyPlanner();
  }, []);

  // --------------------------------------------------
  // TOGGLE TASK COMPLETION
  // --------------------------------------------------

  const handleTaskToggle = (taskId) => {
    setCompletedTasks((previousTasks) => {
      const updatedTasks = {
        ...previousTasks,
        [taskId]: !previousTasks[taskId],
      };

      saveCompletedTasks(updatedTasks);

      return updatedTasks;
    });
  };

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout = () => {
    localStorage.removeItem("user");

    window.location.href = "/";
  };

  // --------------------------------------------------
  // PLANNER DATA
  // --------------------------------------------------

  const overall = planner?.overall_performance;

  const attendance = planner?.attendance;

  const weakSubject = planner?.weak_subject;

  const subjectMarks = planner?.subject_marks || [];

  const recommendations =
    planner?.recommendations || [];

  const timetable = planner?.timetable || [];

  // --------------------------------------------------
  // PROGRESS CALCULATION
  // --------------------------------------------------

  const totalTasks = timetable.length;

  const completedCount = useMemo(() => {
    return timetable.filter((item, index) => {
      const taskId = `${item.time}-${item.activity}-${index}`;

      return completedTasks[taskId];
    }).length;
  }, [timetable, completedTasks]);

  const pendingCount = Math.max(
    totalTasks - completedCount,
    0
  );

  const progressPercentage =
    totalTasks > 0
      ? Math.round(
          (completedCount / totalTasks) * 100
        )
      : 0;

  // --------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="student-page-state">
        <RefreshCw
          className="loading-icon"
          size={32}
        />

        <h2>
          Preparing your study planner...
        </h2>

        <p>
          Analyzing your academic performance.
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // ERROR STATE
  // --------------------------------------------------

  if (error) {
    return (
      <div className="student-page-state error-state">
        <AlertTriangle size={36} />

        <h2>Unable to load planner</h2>

        <p>{error}</p>

        <button
          className="student-primary-button"
          onClick={fetchStudyPlanner}
        >
          <RefreshCw size={18} />

          Try Again
        </button>
      </div>
    );
  }

  // --------------------------------------------------
  // MAIN DASHBOARD
  // --------------------------------------------------

  return (
    <div className="student-dashboard-page">
      {/* TOP BAR */}

      <header className="student-topbar">
        <div className="student-brand">
          <div className="student-brand-icon">
            <GraduationCap size={24} />
          </div>

          <div>
            <h2>Student Workspace</h2>

            <p>
              AI Academic Performance System
            </p>
          </div>
        </div>

        <button
          className="student-logout-button"
          onClick={handleLogout}
        >
          <LogOut size={18} />

          Logout
        </button>
      </header>

      <main className="student-dashboard-content">
        {/* WELCOME SECTION */}

        <section className="student-welcome-section">
          <div>
            <p className="student-small-label">
              PERSONALIZED LEARNING
            </p>

            <h1>
              Welcome,{" "}
              {planner?.student_name || "Student"}!
            </h1>

            <p>
              Understand your performance and follow
              your personalized study plan.
            </p>
          </div>

          <div className="student-profile-icon">
            <UserRound size={34} />
          </div>
        </section>

        {/* SUMMARY CARDS */}

        <section className="student-summary-grid">
          <div className="student-summary-card">
            <div className="summary-card-icon teal-icon">
              <Target size={22} />
            </div>

            <div>
              <p>Overall Performance</p>

              <h2>
                {overall !== null &&
                overall !== undefined
                  ? `${overall}%`
                  : "N/A"}
              </h2>
            </div>
          </div>

          <div className="student-summary-card">
            <div className="summary-card-icon blue-icon">
              <CheckCircle size={22} />
            </div>

            <div>
              <p>Attendance</p>

              <h2>
                {attendance !== null &&
                attendance !== undefined
                  ? `${attendance}%`
                  : "N/A"}
              </h2>
            </div>
          </div>

          <div className="student-summary-card">
            <div className="summary-card-icon orange-icon">
              <AlertTriangle size={22} />
            </div>

            <div>
              <p>Risk Status</p>

              <h2 className="risk-value">
                {planner?.risk_status || "N/A"}
              </h2>
            </div>
          </div>

          <div className="student-summary-card">
            <div className="summary-card-icon purple-icon">
              <BookOpen size={22} />
            </div>

            <div>
              <p>Backlogs</p>

              <h2>
                {planner?.backlog_count ?? "N/A"}
              </h2>
            </div>
          </div>
        </section>

        {/* SUBJECT AND PERFORMANCE SECTION */}

        <section className="student-main-grid">
          {/* WEAK SUBJECT */}

          <div className="student-panel weak-subject-panel">
            <div className="panel-heading">
              <div>
                <p className="student-small-label">
                  FOCUS AREA
                </p>

                <h2>Subject to Improve</h2>
              </div>

              <TrendingDown size={24} />
            </div>

            {weakSubject ? (
              <div className="weak-subject-content">
                <h1>{weakSubject.subject}</h1>

                <p>
                  Lowest mark:{" "}
                  <strong>
                    {weakSubject.marks}
                  </strong>
                </p>

                <span>
                  Spend additional study time on
                  this subject.
                </span>
              </div>
            ) : (
              <p>
                No subject-wise marks available.
              </p>
            )}
          </div>

          {/* SUBJECT PERFORMANCE */}

          <div className="student-panel">
            <div className="panel-heading">
              <div>
                <p className="student-small-label">
                  ACADEMIC DETAILS
                </p>

                <h2>Subject Performance</h2>
              </div>

              <BookOpen size={24} />
            </div>

            {subjectMarks.length > 0 ? (
              <div className="subject-list">
                {subjectMarks.map(
                  (subject, index) => (
                    <div
                      className="subject-row"
                      key={`${subject.subject}-${index}`}
                    >
                      <span>
                        {subject.subject}
                      </span>

                      <strong>
                        {subject.marks}
                      </strong>
                    </div>
                  )
                )}
              </div>
            ) : (
              <p>
                No subject marks available.
              </p>
            )}
          </div>
        </section>

        {/* STUDY PROGRESS */}

        <section className="student-panel planner-progress-panel">
          <div className="panel-heading">
            <div>
              <p className="student-small-label">
                STUDY PROGRESS
              </p>

              <h2>Daily Plan Progress</h2>
            </div>

            <Trophy size={24} />
          </div>

          <div className="planner-progress-summary">
            <div className="progress-stat">
              <span>Total Tasks</span>

              <strong>{totalTasks}</strong>
            </div>

            <div className="progress-stat">
              <span>Completed</span>

              <strong>{completedCount}</strong>
            </div>

            <div className="progress-stat">
              <span>Pending</span>

              <strong>{pendingCount}</strong>
            </div>

            <div className="progress-stat">
              <span>Progress</span>

              <strong>
                {progressPercentage}%
              </strong>
            </div>
          </div>

          <div className="planner-progress-track">
            <div
              className="planner-progress-fill"
              style={{
                width: `${progressPercentage}%`,
              }}
            />
          </div>

          <p className="planner-progress-message">
            {progressPercentage === 100
              ? "Great work! You completed all today's study tasks."
              : progressPercentage > 0
              ? "Keep going! Complete your remaining study tasks."
              : "Start your study plan and track your daily progress."}
          </p>
        </section>

        {/* RECOMMENDATIONS */}

        <section className="student-panel recommendations-panel">
          <div className="panel-heading">
            <div>
              <p className="student-small-label">
                AI GUIDANCE
              </p>

              <h2>
                Personalized Recommendations
              </h2>
            </div>

            <Target size={24} />
          </div>

          {recommendations.length > 0 ? (
            <div className="recommendation-list">
              {recommendations.map(
                (recommendation, index) => (
                  <div
                    className="recommendation-item"
                    key={index}
                  >
                    <CheckCircle size={20} />

                    <p>{recommendation}</p>
                  </div>
                )
              )}
            </div>
          ) : (
            <p>
              No recommendations available.
            </p>
          )}
        </section>

        {/* DAILY TIMETABLE */}

        <section className="student-panel timetable-panel">
          <div className="panel-heading">
            <div>
              <p className="student-small-label">
                DAILY ROUTINE
              </p>

              <h2>
                Personal Study Timetable
              </h2>
            </div>

            <CalendarDays size={24} />
          </div>

          {timetable.length > 0 ? (
            <div className="timetable-grid">
              {timetable.map((item, index) => {
                const taskId = `${item.time}-${item.activity}-${index}`;

                const isCompleted =
                  Boolean(completedTasks[taskId]);

                return (
                  <div
                    className={`timetable-card ${
                      isCompleted
                        ? "completed-timetable-card"
                        : ""
                    }`}
                    key={taskId}
                  >
                    <div className="timetable-time">
                      <Clock size={18} />

                      {item.time}
                    </div>

                    <h3>{item.activity}</h3>

                    <p>{item.duration}</p>

                    <button
                      className="task-completion-button"
                      onClick={() =>
                        handleTaskToggle(taskId)
                      }
                    >
                      {isCompleted ? (
                        <>
                          <CheckCircle size={17} />

                          Completed
                        </>
                      ) : (
                        <>
                          <Circle size={17} />

                          Mark as Complete
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-planner-state">
              <ClipboardCheck size={30} />

              <p>
                No timetable available for your
                current academic details.
              </p>
            </div>
          )}
        </section>

        {/* REFRESH BUTTON */}

        <div className="student-refresh-section">
          <button
            className="student-primary-button"
            onClick={fetchStudyPlanner}
          >
            <RefreshCw size={18} />

            Refresh Study Planner
          </button>
        </div>
      </main>
    </div>
  );
}

export default StudentDashboard;