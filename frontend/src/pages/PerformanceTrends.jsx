import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  RefreshCw,
  GraduationCap,
  Activity,
  ArrowLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function PerformanceTrends() {
  const navigate = useNavigate();

  const [studentId, setStudentId] = useState("");
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTrend = async () => {
    const id = studentId.trim();

    if (!id) {
      setError("Please enter a Student ID.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setStudent(null);

      const response = await fetch(
        `http://127.0.0.1:5000/api/dashboard/student/${encodeURIComponent(
          id
        )}`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load student performance."
        );
      }

      setStudent(data.student || data);
    } catch (err) {
      console.error("Performance Trend Error:", err);

      setError(
        err.message || "Unable to load performance trend."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearData = () => {
    setStudentId("");
    setStudent(null);
    setError("");
  };

  const getTrendInfo = (trend) => {
    const value = String(trend || "Stable").toLowerCase();

    if (value.includes("improv")) {
      return {
        label: "Improving",
        icon: <TrendingUp size={30} />,
        className: "trend-improving",
        description:
          "The student's current performance is higher than the previous academic performance.",
      };
    }

    if (value.includes("declin")) {
      return {
        label: "Declining",
        icon: <TrendingDown size={30} />,
        className: "trend-declining",
        description:
          "The student's current performance is lower than the previous academic performance.",
      };
    }

    return {
      label: "Stable",
      icon: <Minus size={30} />,
      className: "trend-stable",
      description:
        "The student's performance is relatively stable compared with the previous academic performance.",
    };
  };

  const getValue = (obj, keys, fallback = "N/A") => {
    for (const key of keys) {
      if (
        obj &&
        obj[key] !== undefined &&
        obj[key] !== null &&
        obj[key] !== ""
      ) {
        return obj[key];
      }
    }

    return fallback;
  };

  const overall = getValue(student, [
    "overall_performance_percentage",
    "overall_percentage",
    "overall_performance",
    "overall_score",
  ]);

  const previous = getValue(student, [
    "previous_semester_percentage",
    "previous_percentage",
    "previous_semester_performance",
  ]);

  const attendance = getValue(student, [
    "attendance_percentage",
    "attendance",
  ]);

  const trend = getValue(student, [
    "performance_trend",
    "trend",
  ], "Stable");

  const trendInfo = getTrendInfo(trend);

  let difference = "N/A";

  if (
    previous !== "N/A" &&
    overall !== "N/A" &&
    !Number.isNaN(Number(previous)) &&
    !Number.isNaN(Number(overall))
  ) {
    difference = (
      Number(overall) - Number(previous)
    ).toFixed(2);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6fbfb",
        padding: "30px",
        color: "#102f5b",
      }}
    >
      <div
        style={{
          maxWidth: "1150px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "28px",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <Activity
                size={30}
                color="#0b8985"
              />

              <h1
                style={{
                  margin: 0,
                  fontSize: "30px",
                }}
              >
                Performance Trends
              </h1>
            </div>

            <p
              style={{
                marginTop: "8px",
                color: "#64748b",
              }}
            >
              Analyze student academic performance trends
              and compare current performance with previous
              academic performance.
            </p>
          </div>

          <button
            onClick={() => navigate("/admin")}
            style={{
              border: "1px solid #d5e5e5",
              background: "white",
              padding: "10px 16px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>
        </div>

        {/* SEARCH */}
        <div
          style={{
            background: "white",
            border: "1px solid #dceaea",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 15px rgba(16,75,77,0.05)",
            marginBottom: "25px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "16px",
              fontSize: "20px",
            }}
          >
            Search Student
          </h2>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <input
              value={studentId}
              onChange={(e) =>
                setStudentId(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  fetchTrend();
                }
              }}
              placeholder="Enter Student ID"
              style={{
                flex: 1,
                minWidth: "250px",
                padding: "13px 15px",
                border: "1px solid #cbdede",
                borderRadius: "10px",
                outline: "none",
                fontSize: "15px",
              }}
            />

            <button
              onClick={fetchTrend}
              disabled={loading}
              style={{
                background: "#0b8985",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "12px 20px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {loading ? (
                <RefreshCw
                  size={17}
                  className="spin"
                />
              ) : (
                <Search size={17} />
              )}

              {loading ? "Loading..." : "Analyze Trend"}
            </button>

            <button
              onClick={clearData}
              style={{
                background: "#eef7f7",
                color: "#104b4d",
                border: "none",
                borderRadius: "10px",
                padding: "12px 18px",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>

          {error && (
            <div
              style={{
                marginTop: "16px",
                background: "#fff1f2",
                color: "#be123c",
                padding: "12px 15px",
                borderRadius: "10px",
              }}
            >
              {error}
            </div>
          )}
        </div>

        {/* EMPTY STATE */}
        {!student && !loading && !error && (
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "60px 20px",
              textAlign: "center",
              border: "1px solid #dceaea",
            }}
          >
            <GraduationCap
              size={50}
              color="#0b8985"
            />

            <h2>Search a Student</h2>

            <p
              style={{
                color: "#64748b",
              }}
            >
              Enter a Student ID to view academic
              performance trend.
            </p>
          </div>
        )}

        {/* RESULT */}
        {student && (
          <>
            {/* STUDENT INFO */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "22px",
                border: "1px solid #dceaea",
                marginBottom: "20px",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                Student Performance
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit,minmax(180px,1fr))",
                  gap: "14px",
                }}
              >
                <div>
                  <small>Student ID</small>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    {getValue(student, [
                      "student_id",
                      "studentid",
                      "id",
                    ], studentId)}
                  </strong>
                </div>

                <div>
                  <small>Name</small>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    {getValue(student, [
                      "name",
                      "student_name",
                    ])}
                  </strong>
                </div>

                <div>
                  <small>Overall Performance</small>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    {overall !== "N/A"
                      ? `${overall}%`
                      : "N/A"}
                  </strong>
                </div>

                <div>
                  <small>Attendance</small>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "5px",
                    }}
                  >
                    {attendance !== "N/A"
                      ? `${attendance}%`
                      : "N/A"}
                  </strong>
                </div>
              </div>
            </div>

            {/* TREND CARD */}
            <div
              className={trendInfo.className}
              style={{
                borderRadius: "18px",
                padding: "28px",
                marginBottom: "20px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
                background:
                  trendInfo.label === "Improving"
                    ? "#ecfdf5"
                    : trendInfo.label === "Declining"
                    ? "#fff1f2"
                    : "#f8fafc",
                border:
                  trendInfo.label === "Improving"
                    ? "1px solid #a7f3d0"
                    : trendInfo.label === "Declining"
                    ? "1px solid #fecdd3"
                    : "1px solid #dbe4ea",
              }}
            >
              <div>
                {trendInfo.icon}
              </div>

              <div>
                <small>Current Performance Trend</small>

                <h2
                  style={{
                    margin: "5px 0",
                  }}
                >
                  {trendInfo.label}
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#64748b",
                  }}
                >
                  {trendInfo.description}
                </p>
              </div>
            </div>

            {/* COMPARISON */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(220px,1fr))",
                gap: "18px",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "24px",
                  borderRadius: "16px",
                  border: "1px solid #dceaea",
                }}
              >
                <small>Previous Performance</small>

                <h2>
                  {previous !== "N/A"
                    ? `${previous}%`
                    : "N/A"}
                </h2>

                <p
                  style={{
                    color: "#64748b",
                  }}
                >
                  Previous semester performance
                </p>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "24px",
                  borderRadius: "16px",
                  border: "1px solid #dceaea",
                }}
              >
                <small>Current Performance</small>

                <h2>
                  {overall !== "N/A"
                    ? `${overall}%`
                    : "N/A"}
                </h2>

                <p
                  style={{
                    color: "#64748b",
                  }}
                >
                  Current overall performance
                </p>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "24px",
                  borderRadius: "16px",
                  border: "1px solid #dceaea",
                }}
              >
                <small>Performance Difference</small>

                <h2>
                  {difference !== "N/A"
                    ? `${difference > 0 ? "+" : ""}${difference}%`
                    : "N/A"}
                </h2>

                <p
                  style={{
                    color: "#64748b",
                  }}
                >
                  Change from previous performance
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PerformanceTrends;