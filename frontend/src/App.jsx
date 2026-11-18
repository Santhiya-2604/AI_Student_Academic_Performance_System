import { useState } from "react";

import {
  BarChart3,
  Brain,
  Target,
  Eye,
  EyeOff,
  ArrowRight,
  GraduationCap,
  BookOpen,
} from "lucide-react";

import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
} from "react-router-dom";

import "./App.css";

import AdminDashboard from "./pages/AdminDashboard";
import StudentManagement from "./pages/StudentManagement";
import FacultyDashboard from "./pages/FacultyDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import StudyPlanner from "./pages/StudyPlanner";
import PerformanceTrends from "./pages/PerformanceTrends";
import Reports from "./pages/Reports";
import DatasetManagement from "./pages/DatasetManagement";
import Prediction from "./pages/Prediction";
import PerformanceAnalytics from "./pages/PerformanceAnalytics";
import AtRiskStudents from "./pages/AtRiskStudents";
import AIAssistant from "./pages/AIAssistant";

/* =========================================================
   LOGIN PAGE
========================================================= */

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      setMessage("Please enter your username and password.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password: password,
          }),
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem(
          "user",
          JSON.stringify(data.user)
        );

        if (data.user.role === "admin") {
          navigate("/admin");
        } else if (data.user.role === "faculty") {
          navigate("/faculty");
        } else if (data.user.role === "student") {
          navigate("/student");
        } else {
          setMessage("Unknown user role.");
        }
      } else {
        setMessage(
          data.message || "Invalid username or password."
        );
      }
    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        "Unable to connect to the backend. Please make sure the Flask server is running."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">

      {/* =====================================================
          LEFT BRAND PANEL
      ===================================================== */}

      <section className="brand-panel">
        <div className="brand-content">

          <div className="brand-logo">
            <div className="logo-icon">
              <GraduationCap size={25} />
            </div>

            <div>
              <h3>AI Student Performance System</h3>

              <span>
                Predict • Analyze • Personalize • Succeed
              </span>
            </div>
          </div>

          <div className="hero-content">

            <h1>
              Your Academic
              <br />
              Journey,
              <br />
              Powered by
              <br />
              <span>Intelligence.</span>
            </h1>

            <h2>
              Welcome to a smarter way of learning.
            </h2>

            <p>
              Discover academic insights, understand
              performance patterns and take better steps
              towards your learning goals.
            </p>

          </div>

          <div className="feature-list">

            <div className="feature-item">

              <div className="feature-icon">
                <BarChart3 size={24} />
              </div>

              <div>
                <h4>Predict Performance</h4>

                <p>
                  Data-driven insights for better results
                </p>
              </div>

            </div>

            <div className="feature-item">

              <div className="feature-icon">
                <Brain size={24} />
              </div>

              <div>
                <h4>AI-Powered Analytics</h4>

                <p>
                  Understand your strengths & weaknesses
                </p>
              </div>

            </div>

            <div className="feature-item">

              <div className="feature-icon">
                <Target size={24} />
              </div>

              <div>
                <h4>Personalized Learning</h4>

                <p>
                  Your goals, our priority
                </p>
              </div>

            </div>

          </div>

          <div className="academic-visual">

            <div className="books">

              <div className="book book-bottom">
                <BookOpen size={34} />
              </div>

              <div className="book book-middle"></div>

              <div className="book book-top"></div>

              <div className="cap">
                <div className="cap-top"></div>
                <div className="cap-base"></div>
                <div className="tassel"></div>
              </div>

            </div>

            <div className="plant">

              <span className="leaf leaf-one"></span>
              <span className="leaf leaf-two"></span>
              <span className="leaf leaf-three"></span>

              <div className="plant-pot"></div>

            </div>

          </div>

          <div className="brand-footer">

            <div className="footer-links">
              <span>LEARN</span>
              <b>•</b>
              <span>GROW</span>
              <b>•</b>
              <span>SUCCEED</span>
            </div>

            <p>
              AI-BASED STUDENT ACADEMIC PERFORMANCE SYSTEM • 2026
            </p>

          </div>

        </div>
      </section>

      {/* =====================================================
          RIGHT LOGIN PANEL
      ===================================================== */}

      <section className="login-panel">

        <div className="login-container">

          <div className="welcome-label">
            WELCOME BACK
          </div>

          <h1>
            Sign in to your
            <br />
            workspace
          </h1>

          <p className="login-subtitle">
            Use your username and password to continue
          </p>

          <form onSubmit={handleLogin}>

            {/* USERNAME */}

            <div className="input-group">

              <label>Username</label>

              <div className="input-wrapper">

                <div className="input-icon">
                  <span>♙</span>
                </div>

                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  disabled={loading}
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div className="input-group">

              <label>Password</label>

              <div className="password-wrapper">

                <div className="input-icon">
                  <span>♙</span>
                </div>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(!showPassword)
                  }
                  disabled={loading}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>

              </div>

            </div>

            {/* LOGIN BUTTON */}

            <button
              className="login-button"
              type="submit"
              disabled={loading}
            >

              <span>
                {loading
                  ? "Signing in..."
                  : "Sign In"}
              </span>

              {!loading && (
                <ArrowRight size={20} />
              )}

            </button>

          </form>

          {/* LOGIN MESSAGE */}

          {message && (
            <div className="login-message">
              {message}
            </div>
          )}

          {/* SECURITY NOTE */}

          <div className="access-note">

            <div className="security-icon">
              🔐
            </div>

            <div>

              <strong>
                Secure academic workspace
              </strong>

              <p>
                Access is managed according
                to your assigned role.
              </p>

            </div>

          </div>

        </div>

      </section>

    </div>
  );
}

/* =========================================================
   APP ROUTES
========================================================= */

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =================================================
            LOGIN
        ================================================= */}

        <Route
          path="/"
          element={<LoginPage />}
        />

        {/* =================================================
            ADMIN DASHBOARD
        ================================================= */}

        <Route
          path="/admin"
          element={<AdminDashboard />}
        />

        {/* =================================================
            DATASET MANAGEMENT
        ================================================= */}

        <Route
          path="/admin/dataset"
          element={<DatasetManagement />}
        />

        {/* =================================================
            STUDENT MANAGEMENT
        ================================================= */}

        <Route
          path="/admin/students"
          element={<StudentManagement />}
        />

        {/* =================================================
            AI PREDICTION
        ================================================= */}

        <Route
          path="/admin/prediction"
          element={<Prediction />}
        />

        {/* SIDEBAR AI PREDICTION LINK */}

        <Route
          path="/prediction"
          element={<Prediction />}
        />

        {/* =================================================
            PERFORMANCE ANALYTICS
        ================================================= */}

        <Route
          path="/admin/analytics"
          element={<PerformanceAnalytics />}
        />

        {/* =================================================
            AT-RISK STUDENTS
        ================================================= */}

        <Route
          path="/admin/at-risk"
          element={<AtRiskStudents />}
        />

        {/* =================================================
            AI ACADEMIC ASSISTANT
        ================================================= */}

        <Route
          path="/admin/assistant"
          element={<AIAssistant />}
        />

        {/* =================================================
            STUDY PLANNER
            ADMIN ONLY
        ================================================= */}

        <Route
          path="/admin/study-planner"
          element={<StudyPlanner />}
        />
        <Route
  path="/admin/performance-trends"
  element={<PerformanceTrends />}
/>

<Route
  path="/admin/reports"
  element={<Reports />}
/>

        {/* =================================================
            FACULTY
        ================================================= */}

        <Route
          path="/faculty"
          element={<FacultyDashboard />}
        />

        {/* =================================================
            STUDENT
        ================================================= */}

        <Route
          path="/student"
          element={<StudentDashboard />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default App;