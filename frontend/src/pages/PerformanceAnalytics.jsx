import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Brain,
  ShieldAlert,
  TrendingUp,
  Users,
  RefreshCw,
  AlertCircle,
  BookOpen,
  Clock,
  Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function PerformanceAnalytics() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [detailedAnalytics, setDetailedAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryResponse, detailedResponse, riskResponse] =
        await Promise.all([
          fetch(
            "http://127.0.0.1:5000/api/dashboard/analytics"
          ),
          fetch(
            "http://127.0.0.1:5000/api/analytics/detailed"
          ),
          fetch(
            "http://127.0.0.1:5000/api/analytics/at-risk"
          ),
        ]);

      const summaryData = await summaryResponse.json();
      const detailedData = await detailedResponse.json();
      const riskData = await riskResponse.json();

      if (!summaryResponse.ok || !summaryData.success) {
        throw new Error(
          summaryData.message ||
            "Unable to load summary analytics."
        );
      }

      if (!detailedResponse.ok || !detailedData.success) {
        throw new Error(
          detailedData.message ||
            "Unable to load detailed analytics."
        );
      }

      if (!riskResponse.ok || !riskData.success) {
        throw new Error(
          riskData.message ||
            "Unable to load risk analytics."
        );
      }

      setAnalytics({
        ...summaryData,
        risk: {
          ...(summaryData.risk || {}),
          ...(riskData.summary || {}),
        },
      });

      setDetailedAnalytics(detailedData);
    } catch (err) {
      console.error("Performance analytics error:", err);

      setError(
        err.message ||
          "Unable to load performance analytics."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const dataset = analytics?.dataset || {};
  const performance = analytics?.performance || {};
  const risk = analytics?.risk || {};
  const summary = detailedAnalytics?.summary || {};

  const subjectAnalysis =
    detailedAnalytics?.subject_analysis || [];

  const attendanceAnalysis =
    detailedAnalytics?.attendance_analysis || [];

  const studyHoursAnalysis =
    detailedAnalytics?.study_hours_analysis || [];

  const insights =
    detailedAnalytics?.insights || [];

  const availableFeatures =
    detailedAnalytics?.available_features || {};

  const totalRecords =
    dataset.total_records ??
    summary.total_students ??
    0;

  const overallAverage =
    analytics?.overall_average ??
    summary.overall_average ??
    0;

  const excellent = performance.excellent ?? 0;
  const good = performance.good ?? 0;
  const average = performance.average ?? 0;

  const highRisk = Number(
    risk.high ??
      risk.high_risk ??
      risk.highRisk ??
      0
  );

  const mediumRisk = Number(
    risk.medium ??
      risk.medium_risk ??
      risk.mediumRisk ??
      0
  );

  const lowRisk = Number(
    risk.low ??
      risk.low_risk ??
      risk.lowRisk ??
      Math.max(
        Number(totalRecords) - highRisk - mediumRisk,
        0
      )
  );

  const totalPerformance =
    excellent + good + average;

  const performancePercentage = (value) => {
    if (totalPerformance === 0) return 0;

    return Math.round(
      (value / totalPerformance) * 100
    );
  };

  const riskTotal =
    highRisk + mediumRisk + lowRisk;

  const riskPercentage = (value) => {
    if (riskTotal === 0) return 0;

    return Math.round(
      (value / riskTotal) * 100
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <RefreshCw
          size={34}
          style={styles.spin}
        />

        <h3>Loading Performance Analytics...</h3>

        <p>
          Fetching actual student dataset insights.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <header style={styles.header}>
        <div>
          <p style={styles.pageLabel}>
            ADMIN WORKSPACE
          </p>

          <h1 style={styles.title}>
            Smart Performance Analytics
          </h1>

          <p style={styles.subtitle}>
            Analyze student performance, subject results,
            attendance, and study habits.
          </p>
        </div>

        <button
          style={styles.backButton}
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </button>
      </header>

      {/* ERROR */}

      {error && (
        <div style={styles.errorBox}>
          <AlertCircle size={20} />

          <span>{error}</span>

          <button
            style={styles.retryButton}
            onClick={fetchAnalytics}
          >
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY CARDS */}

      <section style={styles.cardGrid}>
        <SummaryCard
          icon={
            <Users size={23} color="#104b4d" />
          }
          iconBackground="#e7f5f4"
          label="Total Students"
          value={totalRecords.toLocaleString()}
          description="Dataset records"
        />

        <SummaryCard
          icon={
            <BarChart3
              size={23}
              color="#3155a6"
            />
          }
          iconBackground="#eaf0ff"
          label="Overall Average"
          value={`${Number(overallAverage).toFixed(2)}%`}
          description="Academic performance"
        />

        <SummaryCard
          icon={
            <ShieldAlert
              size={23}
              color="#c45b1b"
            />
          }
          iconBackground="#fff0e6"
          label="High Risk"
          value={highRisk}
          description="Requires attention"
        />

        <SummaryCard
          icon={
            <Brain
              size={23}
              color="#6545b8"
            />
          }
          iconBackground="#eeeaff"
          label="AI Analytics"
          value="Active"
          description="Dataset-based insights"
        />
      </section>

      {/* PERFORMANCE DISTRIBUTION */}

      <section style={styles.section}>
        <SectionHeader
          title="Performance Distribution"
          description="Distribution of students according to their performance category."
          icon={
            <TrendingUp
              size={25}
              color="#104b4d"
            />
          }
        />

        <div style={styles.distributionList}>
          <DistributionBar
            title="Excellent Performance"
            count={excellent}
            percentage={performancePercentage(
              excellent
            )}
            color="#16805d"
          />

          <DistributionBar
            title="Good Performance"
            count={good}
            percentage={performancePercentage(good)}
            color="#3678c7"
          />

          <DistributionBar
            title="Average Performance"
            count={average}
            percentage={performancePercentage(
              average
            )}
            color="#d69a27"
          />
        </div>
      </section>

      {/* RISK ANALYSIS */}

      <section style={styles.section}>
        <SectionHeader
          title="Student Risk Analysis"
          description="Current distribution of student risk levels."
          icon={
            <ShieldAlert
              size={25}
              color="#104b4d"
            />
          }
        />

        <div style={styles.riskGrid}>
          <RiskCard
            title="High Risk"
            value={highRisk}
            percentage={riskPercentage(highRisk)}
            description="Requires immediate attention"
            color="#d04444"
          />

          <RiskCard
            title="Medium Risk"
            value={mediumRisk}
            percentage={riskPercentage(
              mediumRisk
            )}
            description="Requires regular monitoring"
            color="#d69a27"
          />

          <RiskCard
            title="Low Risk"
            value={lowRisk}
            percentage={riskPercentage(lowRisk)}
            description="Performing within a safe range"
            color="#16805d"
          />
        </div>
      </section>

      {/* SUBJECT-WISE PERFORMANCE */}

      <section style={styles.section}>
        <div style={styles.cleanSectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Subject-wise Performance Analysis
            </h2>

            <p style={styles.sectionDescription}>
              Compare subject performance using actual
              dataset marks.
            </p>
          </div>

          <div style={styles.cleanSectionIcon}>
            <BookOpen size={21} />
          </div>
        </div>

        {subjectAnalysis.length === 0 ? (
          <EmptyState
            message="Subject-wise data is unavailable."
          />
        ) : (
          <div style={styles.cleanSubjectGrid}>
            {subjectAnalysis.map((subject, index) => {
              const subjectAverage = Number(
                subject.average ?? 0
              );

              return (
                <div
                  key={`${subject.subject}-${index}`}
                  style={styles.cleanSubjectCard}
                >
                  <div style={styles.cleanCardTop}>
                    <div>
                      <h3 style={styles.cleanCardTitle}>
                        {subject.subject}
                      </h3>

                      <p style={styles.cleanCardLabel}>
                        Average marks
                      </p>
                    </div>

                    <span
                      style={styles.cleanScoreBadge}
                    >
                      {subjectAverage.toFixed(1)}
                    </span>
                  </div>

                  <div
                    style={
                      styles.cleanProgressBackground
                    }
                  >
                    <div
                      style={{
                        ...styles.cleanProgressBar,
                        width: `${Math.min(
                          Math.max(
                            subjectAverage,
                            0
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div
                    style={styles.cleanCardFooter}
                  >
                    <span>
                      Highest:{" "}
                      {subject.highest ?? "N/A"}
                    </span>

                    <span>
                      Lowest:{" "}
                      {subject.lowest ?? "N/A"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ATTENDANCE VS PERFORMANCE */}

      <section style={styles.section}>
        <div style={styles.cleanSectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Attendance vs Performance
            </h2>

            <p style={styles.sectionDescription}>
              Understand how attendance relates to
              academic performance.
            </p>
          </div>

          <div style={styles.cleanSectionIconBlue}>
            <Activity size={21} />
          </div>
        </div>

        {attendanceAnalysis.length === 0 ? (
          <EmptyState
            message="Attendance analysis is unavailable."
          />
        ) : (
          <div style={styles.cleanAnalysisGrid}>
            {attendanceAnalysis.map((item, index) => {
              const averagePerformance = Number(
                item.average_performance ?? 0
              );

              return (
                <div
                  key={`${item.range}-${index}`}
                  style={styles.cleanAnalysisCard}
                >
                  <div
                    style={
                      styles.cleanAnalysisIconBlue
                    }
                  >
                    <Activity size={19} />
                  </div>

                  <p
                    style={
                      styles.cleanAnalysisLabel
                    }
                  >
                    {item.range}
                  </p>

                  <h3
                    style={
                      styles.cleanAnalysisValue
                    }
                  >
                    {averagePerformance.toFixed(1)}%
                  </h3>

                  <p
                    style={
                      styles.cleanAnalysisDescription
                    }
                  >
                    Average performance
                  </p>

                  <div
                    style={
                      styles.cleanProgressBackground
                    }
                  >
                    <div
                      style={{
                        ...styles.cleanProgressBarBlue,
                        width: `${Math.min(
                          Math.max(
                            averagePerformance,
                            0
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div
                    style={styles.cleanStudentsText}
                  >
                    <Users size={14} />
                    <span>
                      {item.students ?? 0} students
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* STUDY HOURS VS PERFORMANCE */}

      <section style={styles.section}>
        <div style={styles.cleanSectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>
              Study Hours vs Performance
            </h2>

            <p style={styles.sectionDescription}>
              Explore the relationship between study
              time and academic results.
            </p>
          </div>

          <div
            style={styles.cleanSectionIconPurple}
          >
            <Clock size={21} />
          </div>
        </div>

        {studyHoursAnalysis.length === 0 ? (
          <EmptyState
            message="Study-hours analysis is unavailable."
          />
        ) : (
          <div style={styles.cleanAnalysisGrid}>
            {studyHoursAnalysis.map((item, index) => {
              const averagePerformance = Number(
                item.average_performance ?? 0
              );

              return (
                <div
                  key={`${item.range}-${index}`}
                  style={styles.cleanAnalysisCard}
                >
                  <div
                    style={
                      styles.cleanAnalysisIconPurple
                    }
                  >
                    <Clock size={19} />
                  </div>

                  <p
                    style={
                      styles.cleanAnalysisLabel
                    }
                  >
                    {item.range}
                  </p>

                  <h3
                    style={
                      styles.cleanAnalysisValue
                    }
                  >
                    {averagePerformance.toFixed(1)}%
                  </h3>

                  <p
                    style={
                      styles.cleanAnalysisDescription
                    }
                  >
                    Average performance
                  </p>

                  <div
                    style={
                      styles.cleanProgressBackground
                    }
                  >
                    <div
                      style={{
                        ...styles.cleanProgressBarPurple,
                        width: `${Math.min(
                          Math.max(
                            averagePerformance,
                            0
                          ),
                          100
                        )}%`,
                      }}
                    />
                  </div>

                  <div
                    style={styles.cleanStudentsText}
                  >
                    <Users size={14} />
                    <span>
                      {item.students ?? 0} students
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* AI INSIGHTS */}

      <section style={styles.insightSection}>
        <div style={styles.insightIcon}>
          <Brain
            size={28}
            color="#ffffff"
          />
        </div>

        <div style={styles.insightContent}>
          <h2 style={styles.insightTitle}>
            AI-Based Academic Insights
          </h2>

          <p style={styles.insightText}>
            The following insights are generated
            from the actual dataset analytics.
          </p>

          {insights.length === 0 ? (
            <p style={styles.insightText}>
              No additional insights are available.
            </p>
          ) : (
            <ul style={styles.insightList}>
              {insights.map((insight, index) => (
                <li key={index}>{insight}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* FEATURE STATUS */}

      <section style={styles.section}>
        <SectionHeader
          title="Analytics Feature Availability"
          description="Shows which detailed analytics are available from the current dataset."
          icon={
            <BarChart3
              size={25}
              color="#104b4d"
            />
          }
        />

        <div style={styles.featureGrid}>
          <FeatureStatus
            title="Subject Analysis"
            enabled={
              availableFeatures.subject_analysis
            }
          />

          <FeatureStatus
            title="Attendance Analysis"
            enabled={
              availableFeatures.attendance_analysis
            }
          />

          <FeatureStatus
            title="Study Hours Analysis"
            enabled={
              availableFeatures.study_hours_analysis
            }
          />
        </div>
      </section>

      {/* FOOTER ACTIONS */}

      <div style={styles.footerActions}>
        <button
          style={styles.refreshButton}
          onClick={fetchAnalytics}
        >
          <RefreshCw size={17} />
          Refresh Analytics
        </button>

        <button
          style={styles.dashboardButton}
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft size={17} />
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   REUSABLE COMPONENTS
===================================================== */

function SummaryCard({
  icon,
  iconBackground,
  label,
  value,
  description,
}) {
  return (
    <div style={styles.summaryCard}>
      <div
        style={{
          ...styles.iconBox,
          background: iconBackground,
        }}
      >
        {icon}
      </div>

      <div>
        <p style={styles.cardLabel}>
          {label}
        </p>

        <h2 style={styles.cardValue}>
          {value}
        </h2>

        <span style={styles.cardDescription}>
          {description}
        </span>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon,
}) {
  return (
    <div style={styles.sectionHeader}>
      <div>
        <h2 style={styles.sectionTitle}>
          {title}
        </h2>

        <p style={styles.sectionDescription}>
          {description}
        </p>
      </div>

      {icon}
    </div>
  );
}

function DistributionBar({
  title,
  count,
  percentage,
  color,
}) {
  return (
    <div style={styles.distributionItem}>
      <div style={styles.distributionHeader}>
        <span>{title}</span>

        <strong>
          {count} students
        </strong>
      </div>

      <div style={styles.progressBackground}>
        <div
          style={{
            ...styles.progressBar,
            width: `${percentage}%`,
            background: color,
          }}
        />
      </div>

      <small style={styles.percentageText}>
        {percentage}%
      </small>
    </div>
  );
}

function RiskCard({
  title,
  value,
  percentage,
  description,
  color,
}) {
  return (
    <div
      style={{
        ...styles.riskCard,
        borderTop: `4px solid ${color}`,
      }}
    >
      <span style={styles.riskTitle}>
        {title}
      </span>

      <h2 style={styles.riskValue}>
        {value}
      </h2>

      <p style={styles.riskPercentage}>
        {percentage}% of students
      </p>

      <small style={styles.riskDescription}>
        {description}
      </small>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div style={styles.emptyState}>
      <AlertCircle size={20} />

      <span>{message}</span>
    </div>
  );
}

function FeatureStatus({
  title,
  enabled,
}) {
  return (
    <div style={styles.featureCard}>
      <span style={styles.featureTitle}>
        {title}
      </span>

      <span
        style={{
          ...styles.featureBadge,
          background: enabled
            ? "#e5f7ed"
            : "#fff0f0",
          color: enabled
            ? "#16805d"
            : "#c0392b",
        }}
      >
        {enabled
          ? "Available"
          : "Unavailable"}
      </span>
    </div>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background: "#f5f9fa",
    fontFamily: "Arial, sans-serif",
    color: "#243b3d",
  },

  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    background: "#f5f9fa",
    color: "#104b4d",
    fontFamily: "Arial, sans-serif",
  },

  spin: {
    animation: "spin 1s linear infinite",
  },

  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "25px",
    flexWrap: "wrap",
    marginBottom: "28px",
  },

  pageLabel: {
    margin: 0,
    fontSize: "12px",
    fontWeight: "700",
    letterSpacing: "0.12em",
    color: "#0b8985",
  },

  title: {
    margin: "8px 0",
    color: "#104b4d",
    fontSize: "30px",
  },

  subtitle: {
    margin: 0,
    color: "#667085",
    fontSize: "15px",
    lineHeight: "1.6",
  },

  backButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 17px",
    border: "none",
    borderRadius: "9px",
    background: "#104b4d",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
  },

  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 17px",
    marginBottom: "22px",
    borderRadius: "10px",
    background: "#fff1f1",
    border: "1px solid #ffd0d0",
    color: "#b42318",
  },

  retryButton: {
    marginLeft: "auto",
    border: "none",
    background: "transparent",
    color: "#b42318",
    cursor: "pointer",
    fontWeight: "700",
  },

  cardGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },

  summaryCard: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    padding: "22px",
    borderRadius: "15px",
    background: "#ffffff",
    border: "1px solid #e1eded",
    boxShadow:
      "0 5px 18px rgba(16, 75, 77, 0.05)",
  },

  iconBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    flexShrink: 0,
  },

  cardLabel: {
    margin: 0,
    fontSize: "13px",
    color: "#667085",
  },

  cardValue: {
    margin: "5px 0",
    fontSize: "27px",
    color: "#104b4d",
  },

  cardDescription: {
    fontSize: "12px",
    color: "#98a2b3",
  },

  section: {
    padding: "25px",
    marginBottom: "24px",
    borderRadius: "16px",
    background: "#ffffff",
    border: "1px solid #e1eded",
    boxShadow:
      "0 5px 18px rgba(16, 75, 77, 0.04)",
  },

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "15px",
    marginBottom: "25px",
  },

  sectionTitle: {
    margin: 0,
    color: "#104b4d",
    fontSize: "21px",
  },

  sectionDescription: {
    margin: "7px 0 0",
    color: "#667085",
    fontSize: "14px",
    lineHeight: "1.6",
  },

  distributionList: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  distributionItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },

  distributionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "15px",
    fontSize: "14px",
    color: "#344054",
  },

  progressBackground: {
    width: "100%",
    height: "12px",
    borderRadius: "20px",
    background: "#edf2f2",
    overflow: "hidden",
  },

  progressBar: {
    height: "100%",
    borderRadius: "20px",
    transition: "width 0.4s ease",
  },

  percentageText: {
    color: "#667085",
  },

  riskGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "18px",
  },

  riskCard: {
    padding: "22px",
    borderRadius: "12px",
    background: "#f8fbfb",
  },

  riskTitle: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#344054",
  },

  riskValue: {
    margin: "12px 0 5px",
    fontSize: "30px",
    color: "#104b4d",
  },

  riskPercentage: {
    margin: "4px 0",
    color: "#667085",
    fontSize: "14px",
  },

  riskDescription: {
    color: "#98a2b3",
    lineHeight: "1.5",
  },

  /* CLEAN ANALYTICS DESIGN */

  cleanSectionHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "18px",
    marginBottom: "24px",
  },

  cleanSectionIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#e5f5f3",
    color: "#0b8985",
    flexShrink: 0,
  },

  cleanSectionIconBlue: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#eaf0ff",
    color: "#3678c7",
    flexShrink: 0,
  },

  cleanSectionIconPurple: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    background: "#f0eaff",
    color: "#6846bd",
    flexShrink: 0,
  },

  cleanSubjectGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "18px",
  },

  cleanSubjectCard: {
    padding: "20px",
    borderRadius: "14px",
    background: "#f8fbfb",
    border: "1px solid #e1eded",
    transition: "transform 0.2s ease",
  },

  cleanCardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "18px",
  },

  cleanCardTitle: {
    margin: 0,
    color: "#104b4d",
    fontSize: "16px",
    fontWeight: "700",
  },

  cleanCardLabel: {
    margin: "5px 0 0",
    color: "#98a2b3",
    fontSize: "12px",
  },

  cleanScoreBadge: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "52px",
    padding: "8px 10px",
    borderRadius: "10px",
    background: "#d8f3ee",
    color: "#087f78",
    fontSize: "16px",
    fontWeight: "700",
  },

  cleanProgressBackground: {
    width: "100%",
    height: "9px",
    borderRadius: "20px",
    background: "#e6eeee",
    overflow: "hidden",
  },

  cleanProgressBar: {
    height: "100%",
    borderRadius: "20px",
    background:
      "linear-gradient(90deg, #0b8985, #55e6d0)",
    transition: "width 0.5s ease",
  },

  cleanCardFooter: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "14px",
    color: "#667085",
    fontSize: "12px",
  },

  cleanAnalysisGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
  },

  cleanAnalysisCard: {
    padding: "21px",
    borderRadius: "14px",
    background: "#ffffff",
    border: "1px solid #e1eded",
    boxShadow:
      "0 4px 14px rgba(16, 75, 77, 0.04)",
  },

  cleanAnalysisIconBlue: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#eaf0ff",
    color: "#3678c7",
    marginBottom: "15px",
  },

  cleanAnalysisIconPurple: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    background: "#f0eaff",
    color: "#6846bd",
    marginBottom: "15px",
  },

  cleanAnalysisLabel: {
    margin: 0,
    color: "#344054",
    fontSize: "14px",
    fontWeight: "700",
  },

  cleanAnalysisValue: {
    margin: "10px 0 3px",
    color: "#104b4d",
    fontSize: "28px",
    fontWeight: "700",
  },

  cleanAnalysisDescription: {
    margin: "0 0 16px",
    color: "#98a2b3",
    fontSize: "12px",
  },

  cleanProgressBarBlue: {
    height: "100%",
    borderRadius: "20px",
    background:
      "linear-gradient(90deg, #3678c7, #83b5f2)",
    transition: "width 0.5s ease",
  },

  cleanProgressBarPurple: {
    height: "100%",
    borderRadius: "20px",
    background:
      "linear-gradient(90deg, #6846bd, #a998ef)",
    transition: "width 0.5s ease",
  },

  cleanStudentsText: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginTop: "15px",
    color: "#667085",
    fontSize: "12px",
  },

  /* AI INSIGHTS */

  insightSection: {
    display: "flex",
    alignItems: "flex-start",
    gap: "18px",
    padding: "25px",
    marginBottom: "24px",
    borderRadius: "16px",
    background: "#104b4d",
    color: "#ffffff",
  },

  insightIcon: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "52px",
    height: "52px",
    borderRadius: "13px",
    background:
      "rgba(255, 255, 255, 0.15)",
    flexShrink: 0,
  },

  insightContent: {
    flex: 1,
    minWidth: 0,
  },

  insightTitle: {
    margin: "0 0 10px",
    fontSize: "21px",
  },

  insightText: {
    margin: "7px 0",
    color: "#d9eeee",
    lineHeight: "1.6",
    fontSize: "14px",
  },

  insightList: {
    margin: "15px 0 0",
    paddingLeft: "22px",
    color: "#d9eeee",
    lineHeight: "1.8",
    fontSize: "14px",
  },

  /* FEATURE STATUS */

  featureGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "15px",
  },

  featureCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    flexWrap: "wrap",
    padding: "17px",
    borderRadius: "12px",
    background: "#f8fbfb",
    border: "1px solid #e1eded",
  },

  featureTitle: {
    color: "#344054",
    fontSize: "14px",
    fontWeight: "600",
  },

  featureBadge: {
    padding: "5px 9px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: "700",
  },

  emptyState: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "20px",
    borderRadius: "10px",
    background: "#f8fbfb",
    color: "#667085",
    fontSize: "14px",
  },

  /* FOOTER */

  footerActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    flexWrap: "wrap",
  },

  refreshButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 17px",
    borderRadius: "9px",
    border: "1px solid #c9dddd",
    background: "#ffffff",
    color: "#104b4d",
    cursor: "pointer",
    fontWeight: "600",
  },

  dashboardButton: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "11px 17px",
    borderRadius: "9px",
    border: "none",
    background: "#104b4d",
    color: "#ffffff",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default PerformanceAnalytics;