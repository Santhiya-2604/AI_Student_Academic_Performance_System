
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Search,
  RefreshCw,
  ShieldAlert,
  Users,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

function AtRiskStudents() {
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState({
    total_at_risk: 0,
    high_risk: 0,
    medium_risk: 0,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAtRiskStudents = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/api/analytics/at-risk"
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to load at-risk students."
        );
      }

      setStudents(data.students || []);

      setSummary({
        total_at_risk: data.summary?.total_at_risk || 0,
        high_risk: data.summary?.high_risk || 0,
        medium_risk: data.summary?.medium_risk || 0,
      });
    } catch (err) {
      console.error("At-risk students error:", err);
      setError(
        err.message ||
          "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAtRiskStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      String(student.student_id || "")
        .toLowerCase()
        .includes(search) ||
      String(student.name || "")
        .toLowerCase()
        .includes(search) ||
      String(student.department || "")
        .toLowerCase()
        .includes(search);

    const matchesRisk =
      riskFilter === "All" ||
      student.risk_status === riskFilter;

    return matchesSearch && matchesRisk;
  });

  const getRiskClass = (risk) => {
    if (risk === "High") return "risk-high";
    if (risk === "Medium") return "risk-medium";
    return "risk-low";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f8fa",
        padding: "28px",
        color: "#102f5b",
      }}
    >
      <div
        style={{
          maxWidth: "1450px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
            flexWrap: "wrap",
            marginBottom: "28px",
          }}
        >
          <div>
            <button
              onClick={() => navigate("/admin")}
              style={{
                border: "none",
                background: "transparent",
                color: "#0b8985",
                display: "flex",
                alignItems: "center",
                gap: "7px",
                cursor: "pointer",
                marginBottom: "14px",
                fontWeight: "600",
              }}
            >
              <ArrowLeft size={18} />
              Back to Dashboard
            </button>

            <h1
              style={{
                margin: 0,
                fontSize: "30px",
                fontWeight: "750",
              }}
            >
              At-Risk Students
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#64748b",
              }}
            >
              Identify students who need academic attention.
            </p>
          </div>

          <button
            onClick={fetchAtRiskStudents}
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              borderRadius: "10px",
              padding: "12px 18px",
              background: "#104b4d",
              color: "#ffffff",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            <RefreshCw size={17} />
            Refresh
          </button>
        </div>

        {/* SUMMARY CARDS */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "18px",
            marginBottom: "28px",
          }}
        >
          <SummaryCard
            title="Total At-Risk"
            value={summary.total_at_risk}
            icon={<Users size={24} />}
            color="#2563eb"
            background="#eaf2ff"
          />

          <SummaryCard
            title="High Risk"
            value={summary.high_risk}
            icon={<ShieldAlert size={24} />}
            color="#dc2626"
            background="#fef2f2"
          />

          <SummaryCard
            title="Medium Risk"
            value={summary.medium_risk}
            icon={<AlertTriangle size={24} />}
            color="#d97706"
            background="#fff7ed"
          />
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#b91c1c",
              padding: "16px",
              borderRadius: "12px",
              marginBottom: "20px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <XCircle size={20} />
            {error}
          </div>
        )}

        {/* FILTER SECTION */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "20px",
            marginBottom: "22px",
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            alignItems: "center",
            boxShadow: "0 4px 18px rgba(15, 47, 91, 0.05)",
          }}
        >
          <div
            style={{
              flex: "1 1 280px",
              position: "relative",
            }}
          >
            <Search
              size={19}
              color="#64748b"
              style={{
                position: "absolute",
                left: "13px",
                top: "13px",
              }}
            />

            <input
              type="text"
              placeholder="Search by student ID, name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "12px 14px 12px 42px",
                border: "1px solid #dbe4ea",
                borderRadius: "10px",
                outline: "none",
                fontSize: "14px",
              }}
            />
          </div>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            style={{
              padding: "12px 15px",
              border: "1px solid #dbe4ea",
              borderRadius: "10px",
              background: "#ffffff",
              color: "#102f5b",
              minWidth: "150px",
            }}
          >
            <option value="All">All Risk Levels</option>
            <option value="High">High Risk</option>
            <option value="Medium">Medium Risk</option>
          </select>
        </div>

        {/* STUDENT TABLE */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            overflowX: "auto",
            boxShadow: "0 4px 18px rgba(15, 47, 91, 0.05)",
          }}
        >
          <div
            style={{
              padding: "22px",
              borderBottom: "1px solid #edf1f5",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "19px",
              }}
            >
              Students Requiring Attention
            </h2>

            <p
              style={{
                margin: "7px 0 0",
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Showing {filteredStudents.length} student(s)
            </p>
          </div>

          {loading ? (
            <div
              style={{
                padding: "60px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <RefreshCw size={28} />
              <p>Loading at-risk students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div
              style={{
                padding: "60px",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <Users size={35} />
              <p>No students found.</p>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "1050px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#f8fafc",
                    textAlign: "left",
                  }}
                >
                  {[
                    "Student",
                    "Department",
                    "Semester",
                    "Overall",
                    "Attendance",
                    "Backlogs",
                    "Risk",
                    "Reasons",
                  ].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        padding: "15px",
                        fontSize: "12px",
                        color: "#64748b",
                        textTransform: "uppercase",
                        letterSpacing: "0.4px",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr
                    key={`${student.student_id}-${index}`}
                    style={{
                      borderTop: "1px solid #edf1f5",
                    }}
                  >
                    <td style={{ padding: "17px 15px" }}>
                      <strong>
                        {student.name || "Unknown"}
                      </strong>

                      <div
                        style={{
                          fontSize: "12px",
                          color: "#64748b",
                          marginTop: "4px",
                        }}
                      >
                        {student.student_id || "N/A"}
                      </div>
                    </td>

                    <td style={{ padding: "17px 15px" }}>
                      {student.department || "N/A"}
                    </td>

                    <td style={{ padding: "17px 15px" }}>
                      {student.semester || "N/A"}
                    </td>

                    <td style={{ padding: "17px 15px" }}>
                      {student.overall_performance !== null &&
                      student.overall_performance !== undefined
                        ? `${Number(
                            student.overall_performance
                          ).toFixed(1)}%`
                        : "N/A"}
                    </td>

                    <td style={{ padding: "17px 15px" }}>
                      {student.attendance !== null &&
                      student.attendance !== undefined
                        ? `${Number(student.attendance).toFixed(
                            1
                          )}%`
                        : "N/A"}
                    </td>

                    <td style={{ padding: "17px 15px" }}>
                      {student.backlog_count ?? "N/A"}
                    </td>

                    <td style={{ padding: "17px 15px" }}>
                      <span
                        className={getRiskClass(
                          student.risk_status
                        )}
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "700",
                        }}
                      >
                        {student.risk_status}
                      </span>
                    </td>

                    <td style={{ padding: "17px 15px" }}>
                      <div
                        style={{
                          maxWidth: "240px",
                          fontSize: "13px",
                          color: "#475569",
                          lineHeight: "1.6",
                        }}
                      >
                        {student.reasons?.length
                          ? student.reasons.join(", ")
                          : "Academic attention needed"}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
  background,
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "22px",
        boxShadow: "0 4px 18px rgba(15, 47, 91, 0.05)",
      }}
    >
      <div
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "12px",
          background,
          color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "18px",
        }}
      >
        {icon}
      </div>

      <p
        style={{
          margin: 0,
          color: "#64748b",
          fontSize: "14px",
          fontWeight: "600",
        }}
      >
        {title}
      </p>

      <h2
        style={{
          margin: "8px 0 0",
          fontSize: "32px",
          color: "#102f5b",
        }}
      >
        {value}
      </h2>
    </div>
  );
}

export default AtRiskStudents;