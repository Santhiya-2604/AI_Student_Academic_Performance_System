import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  Plus,
  Database,
  Users,
  FileText,
  Download,
  Trash2,
  Edit3,
  Eye,
  X,
  Save,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  ChevronDown,
  BookOpen,
  UserPlus,
} from "lucide-react";

const API = "http://127.0.0.1:5000";

const emptyStudent = {
  student_id: "",
  name: "",
  department: "",
  semester: "",
  academic_details: {
    attendance_percentage: "",
    internal_1_marks: "",
    internal_2_marks: "",
    assignment_score: "",
    previous_semester_percentage: "",
    study_hours_per_day: "",
    learning_activity_score: "",
    backlog_count: "",
    sleep_hours_per_day: "",
    practice_tests_completed: "",
  },
};

const academicFields = [
  {
    key: "attendance_percentage",
    label: "Attendance (%)",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "internal_1_marks",
    label: "Internal 1 Marks",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "internal_2_marks",
    label: "Internal 2 Marks",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "assignment_score",
    label: "Assignment Score",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "previous_semester_percentage",
    label: "Previous Semester (%)",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "study_hours_per_day",
    label: "Study Hours / Day",
    type: "number",
    min: 0,
    max: 24,
    step: 0.1,
  },
  {
    key: "learning_activity_score",
    label: "Learning Activity Score",
    type: "number",
    min: 0,
    max: 100,
  },
  {
    key: "backlog_count",
    label: "Backlog Count",
    type: "number",
    min: 0,
    max: 50,
  },
  {
    key: "sleep_hours_per_day",
    label: "Sleep Hours / Day",
    type: "number",
    min: 0,
    max: 24,
    step: 0.1,
  },
  {
    key: "practice_tests_completed",
    label: "Practice Tests",
    type: "number",
    min: 0,
    max: 100,
  },
];

function DatasetManagement() {
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState([]);
  const [activeDataset, setActiveDataset] = useState(null);

  const [datasetName, setDatasetName] = useState("");
  const [showCreateDataset, setShowCreateDataset] = useState(false);

  const [student, setStudent] = useState(emptyStudent);
  const [subjects, setSubjects] = useState([
    { id: Date.now(), name: "", marks: "" },
  ]);

  const [subjectMode, setSubjectMode] = useState("manual");
  const [previousSubjects, setPreviousSubjects] = useState([]);

  const [editingRecordId, setEditingRecordId] = useState(null);

  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showDatasetDetails, setShowDatasetDetails] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState(null);

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState("");

  const [loading, setLoading] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadCreatedDatasets();
  }, []);

  useEffect(() => {
    if (activeDataset?.id) {
      loadPreviousSubjects(activeDataset.id);
    }
  }, [activeDataset]);

  const clearAlerts = () => {
    setMessage("");
    setError("");
  };

  const showSuccess = (msg) => {
    setError("");
    setMessage(msg);
  };

  const showError = (msg) => {
    setMessage("");
    setError(msg);
  };

  const loadCreatedDatasets = async () => {
    try {
      setLoading(true);

      const response = await fetch(`${API}/api/created-datasets`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load datasets.");
      }

      setDatasets(data.datasets || []);
    } catch (err) {
      showError(err.message || "Failed to load datasets.");
    } finally {
      setLoading(false);
    }
  };

  const openDataset = async (datasetId) => {
    try {
      clearAlerts();
      setLoading(true);

      const response = await fetch(
        `${API}/api/created-datasets/${datasetId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to open dataset.");
      }

      setActiveDataset(data.dataset);
      setShowDatasetDetails(true);
      setShowStudentForm(false);
    } catch (err) {
      showError(err.message || "Failed to open dataset.");
    } finally {
      setLoading(false);
    }
  };

  const createDataset = async () => {
    clearAlerts();

    if (!datasetName.trim()) {
      showError("Please enter a dataset name.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API}/api/created-datasets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataset_name: datasetName.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create dataset.");
      }

      setDatasetName("");
      setShowCreateDataset(false);

      await loadCreatedDatasets();

      if (data.dataset?.id) {
        await openDataset(data.dataset.id);
      } else {
        showSuccess("Dataset created successfully.");
      }
    } catch (err) {
      showError(err.message || "Failed to create dataset.");
    } finally {
      setLoading(false);
    }
  };

  const loadPreviousSubjects = async (datasetId) => {
    try {
      const response = await fetch(
        `${API}/api/created-datasets/${datasetId}/previous-subjects`
      );

      if (!response.ok) return;

      const data = await response.json();
      setPreviousSubjects(data.subjects || []);
    } catch {
      // Previous subjects are optional.
    }
  };

  const resetStudentForm = () => {
    setStudent({
      ...emptyStudent,
      academic_details: {
        ...emptyStudent.academic_details,
      },
    });

    setSubjects([{ id: Date.now(), name: "", marks: "" }]);
    setSubjectMode("manual");
    setEditingRecordId(null);
  };

  const startAddStudent = () => {
    clearAlerts();
    resetStudentForm();

    if (previousSubjects.length > 0) {
      setSubjectMode("previous");
      setSubjects(
        previousSubjects.map((name, index) => ({
          id: Date.now() + index,
          name,
          marks: "",
        }))
      );
    }

    setShowStudentForm(true);
    setShowDatasetDetails(false);
  };

  const handleStudentChange = (field, value) => {
    setStudent((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAcademicChange = (field, value) => {
    setStudent((prev) => ({
      ...prev,
      academic_details: {
        ...prev.academic_details,
        [field]: value,
      },
    }));
  };

  const addSubject = () => {
    setSubjects((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        name: "",
        marks: "",
      },
    ]);
  };

  const removeSubject = (id) => {
    if (subjects.length <= 1) return;

    setSubjects((prev) => prev.filter((item) => item.id !== id));
  };

  const updateSubject = (id, field, value) => {
    setSubjects((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const usePreviousSubjects = () => {
    if (!previousSubjects.length) {
      showError("No previous student subjects available.");
      return;
    }

    setSubjectMode("previous");

    setSubjects(
      previousSubjects.map((name, index) => ({
        id: Date.now() + index,
        name,
        marks: "",
      }))
    );
  };

  const useManualSubjects = () => {
    setSubjectMode("manual");

    setSubjects([
      {
        id: Date.now(),
        name: "",
        marks: "",
      },
    ]);
  };

  const validateStudent = () => {
    if (!activeDataset) {
      return "Please select a dataset first.";
    }

    if (!student.student_id.trim()) {
      return "Student ID is required.";
    }

    if (!student.name.trim()) {
      return "Student name is required.";
    }

    if (!student.department.trim()) {
      return "Department is required.";
    }

    if (!student.semester) {
      return "Semester is required.";
    }

    const validSubjects = subjects.filter(
      (subject) => subject.name.trim() !== ""
    );

    if (validSubjects.length === 0) {
      return "Please add at least one subject.";
    }

    for (const subject of validSubjects) {
      if (subject.marks === "") {
        return `Please enter marks for ${subject.name}.`;
      }

      const marks = Number(subject.marks);

      if (Number.isNaN(marks) || marks < 0 || marks > 100) {
        return `Marks for ${subject.name} must be between 0 and 100.`;
      }
    }

    return null;
  };

  const saveStudent = async (addAnother = false) => {
    clearAlerts();

    const validationError = validateStudent();

    if (validationError) {
      showError(validationError);
      return;
    }

    const cleanSubjects = subjects
      .filter((subject) => subject.name.trim())
      .map((subject) => ({
        name: subject.name.trim(),
        marks: Number(subject.marks),
      }));

    const payload = {
      student_id: student.student_id.trim(),
      name: student.name.trim(),
      department: student.department.trim(),
      semester: Number(student.semester),
      academic_details: {
        ...student.academic_details,
      },
      subjects: cleanSubjects,
    };

    try {
      setSavingStudent(true);

      let url;
      let method;

      if (editingRecordId) {
        url = `${API}/api/created-datasets/${activeDataset.id}/students/${editingRecordId}`;
        method = "PUT";
      } else {
        url = `${API}/api/created-datasets/${activeDataset.id}/students`;
        method = "POST";
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save student.");
      }

      if (editingRecordId) {
        showSuccess("Student details updated successfully.");
      } else {
        showSuccess("Student added successfully.");
      }

      const updatedResponse = await fetch(
        `${API}/api/created-datasets/${activeDataset.id}`
      );

      const updatedData = await updatedResponse.json();

      if (updatedResponse.ok) {
        setActiveDataset(updatedData.dataset);
      }

      await loadCreatedDatasets();

      if (addAnother) {
        resetStudentForm();

        const newPreviousSubjects = cleanSubjects.map(
          (subject) => subject.name
        );

        setPreviousSubjects(newPreviousSubjects);

        setSubjectMode("previous");

        setSubjects(
          newPreviousSubjects.map((name, index) => ({
            id: Date.now() + index,
            name,
            marks: "",
          }))
        );
      } else {
        resetStudentForm();
        setShowStudentForm(false);
        setShowDatasetDetails(true);
      }
    } catch (err) {
      showError(err.message || "Failed to save student.");
    } finally {
      setSavingStudent(false);
    }
  };

  const editStudent = (record) => {
    clearAlerts();

    const details = record.academic_details || {};

    setStudent({
      student_id: record.student_id || "",
      name: record.name || "",
      department: record.department || "",
      semester: record.semester || "",
      academic_details: {
        attendance_percentage: details.attendance_percentage ?? "",
        internal_1_marks: details.internal_1_marks ?? "",
        internal_2_marks: details.internal_2_marks ?? "",
        assignment_score: details.assignment_score ?? "",
        previous_semester_percentage:
          details.previous_semester_percentage ?? "",
        study_hours_per_day: details.study_hours_per_day ?? "",
        learning_activity_score: details.learning_activity_score ?? "",
        backlog_count: details.backlog_count ?? "",
        sleep_hours_per_day: details.sleep_hours_per_day ?? "",
        practice_tests_completed: details.practice_tests_completed ?? "",
      },
    });

    const recordSubjects =
      record.subjects || record.student_subjects || [];

    if (recordSubjects.length > 0) {
      setSubjects(
        recordSubjects.map((subject, index) => ({
          id: Date.now() + index,
          name: subject.name || subject.subject_name || "",
          marks: subject.marks ?? subject.subject_marks ?? "",
        }))
      );
    } else {
      setSubjects([{ id: Date.now(), name: "", marks: "" }]);
    }

    setSubjectMode("manual");
    setEditingRecordId(record.record_id || record.id);
    setShowStudentForm(true);
    setShowDatasetDetails(false);
  };

  const deleteStudent = async (record) => {
    const recordId = record.record_id || record.id;

    const confirmed = window.confirm(
      `Delete student "${record.name}" (${record.student_id})?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      clearAlerts();
      setLoading(true);

      const response = await fetch(
        `${API}/api/created-datasets/${activeDataset.id}/students/${recordId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete student.");
      }

      showSuccess("Student deleted successfully.");

      const updatedResponse = await fetch(
        `${API}/api/created-datasets/${activeDataset.id}`
      );

      const updatedData = await updatedResponse.json();

      if (updatedResponse.ok) {
        setActiveDataset(updatedData.dataset);
      }

      await loadCreatedDatasets();
    } catch (err) {
      showError(err.message || "Failed to delete student.");
    } finally {
      setLoading(false);
    }
  };

  const deleteActiveDataset = async () => {
    if (!activeDataset) return;

    const confirmed = window.confirm(
      `Delete dataset "${activeDataset.dataset_name}"?\n\nAll students and academic records inside this dataset will be deleted.`
    );

    if (!confirmed) return;

    try {
      clearAlerts();
      setLoading(true);

      const response = await fetch(
        `${API}/api/created-datasets/${activeDataset.id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete dataset.");
      }

      setActiveDataset(null);
      setShowDatasetDetails(false);
      setShowStudentForm(false);

      await loadCreatedDatasets();

      showSuccess("Dataset deleted successfully.");
    } catch (err) {
      showError(err.message || "Failed to delete dataset.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCreatedDataset = () => {
    if (!activeDataset) return;

    window.open(
      `${API}/api/created-datasets/${activeDataset.id}/export`,
      "_blank"
    );
  };

  const handleUpload = async () => {
    clearAlerts();

    if (!uploadFile) {
      showError("Please select a CSV file.");
      return;
    }

    if (!uploadName.trim()) {
      showError("Please enter a dataset name.");
      return;
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("dataset_name", uploadName.trim());

    try {
      setUploading(true);

      const response = await fetch(`${API}/api/dataset/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Dataset upload failed.");
      }

      setUploadFile(null);
      setUploadName("");

      const fileInput = document.getElementById("csvUploadInput");
      if (fileInput) fileInput.value = "";

      showSuccess("CSV dataset uploaded successfully.");
      await loadCreatedDatasets();
    } catch (err) {
      showError(err.message || "Dataset upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const studentRecords = useMemo(() => {
    if (!activeDataset) return [];

    return (
      activeDataset.students ||
      activeDataset.records ||
      activeDataset.academic_records ||
      []
    );
  }, [activeDataset]);

  const studentCount =
    activeDataset?.student_count ??
    activeDataset?.students_count ??
    studentRecords.length;

  const subjectCount = useMemo(() => {
    const names = new Set();

    studentRecords.forEach((record) => {
      const recordSubjects =
        record.subjects || record.student_subjects || [];

      recordSubjects.forEach((subject) => {
        const name = subject.name || subject.subject_name;
        if (name) names.add(name);
      });
    });

    return names.size;
  }, [studentRecords]);

  return (
    <div className="dataset-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .dataset-page {
          min-height: 100vh;
          background: #F5F9FA;
          color: #102F5B;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 28px;
        }

        .dataset-container {
          max-width: 1450px;
          margin: 0 auto;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 24px;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .back-btn {
          border: 1px solid #d9e7e8;
          background: white;
          color: #104B4D;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: .2s;
        }

        .back-btn:hover {
          background: #104B4D;
          color: white;
        }

        .page-title {
          margin: 0;
          font-size: 27px;
          font-weight: 800;
          color: #102F5B;
        }

        .page-subtitle {
          margin: 4px 0 0;
          color: #6d7d8b;
          font-size: 14px;
        }

        .primary-btn {
          border: none;
          background: #104B4D;
          color: white;
          padding: 12px 18px;
          border-radius: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          transition: .2s;
        }

        .primary-btn:hover {
          background: #0b393b;
          transform: translateY(-1px);
        }

        .secondary-btn {
          border: 1px solid #d5e4e5;
          background: white;
          color: #104B4D;
          padding: 11px 16px;
          border-radius: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .secondary-btn:hover {
          border-color: #104B4D;
        }

        .danger-btn {
          border: 1px solid #f0caca;
          background: #fff7f7;
          color: #c0392b;
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
        }

        .alert {
          border-radius: 12px;
          padding: 13px 16px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
        }

        .success-alert {
          background: #eafaf5;
          color: #14745f;
          border: 1px solid #bceadd;
        }

        .error-alert {
          background: #fff3f3;
          color: #b53232;
          border: 1px solid #f0caca;
        }

        .section {
          background: white;
          border: 1px solid #e3eded;
          border-radius: 18px;
          padding: 22px;
          margin-bottom: 22px;
          box-shadow: 0 5px 22px rgba(16, 75, 77, .045);
        }

        .section-heading {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 18px;
        }

        .section-title {
          margin: 0;
          font-size: 19px;
          font-weight: 800;
          color: #102F5B;
        }

        .section-description {
          margin: 4px 0 0;
          font-size: 13px;
          color: #758592;
        }

        .dataset-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
          gap: 16px;
        }

        .dataset-card {
          border: 1px solid #e2ecec;
          border-radius: 16px;
          padding: 18px;
          background: #fff;
          transition: .2s;
        }

        .dataset-card:hover {
          border-color: #55E6D0;
          box-shadow: 0 8px 25px rgba(16, 75, 77, .08);
          transform: translateY(-2px);
        }

        .dataset-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .dataset-icon {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          background: #eafaf7;
          color: #104B4D;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dataset-card h3 {
          margin: 0;
          font-size: 16px;
          color: #102F5B;
        }

        .dataset-type {
          margin-top: 5px;
          font-size: 11px;
          font-weight: 700;
          color: #14745f;
          text-transform: uppercase;
          letter-spacing: .5px;
        }

        .dataset-stats {
          display: flex;
          gap: 20px;
          margin: 18px 0;
          color: #667987;
          font-size: 13px;
        }

        .dataset-stat {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .card-actions {
          display: flex;
          gap: 8px;
        }

        .empty-state {
          text-align: center;
          padding: 45px 20px;
          color: #71828d;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 12px;
          border-radius: 16px;
          background: #edf8f7;
          color: #104B4D;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 22px;
        }

        .stat-box {
          border: 1px solid #e3eded;
          background: white;
          border-radius: 15px;
          padding: 17px;
        }

        .stat-label {
          font-size: 12px;
          color: #7a8994;
          font-weight: 600;
        }

        .stat-value {
          margin-top: 6px;
          font-size: 24px;
          font-weight: 800;
          color: #104B4D;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 17px;
        }

        .form-grid.three {
          grid-template-columns: repeat(3, 1fr);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .form-group.full {
          grid-column: 1 / -1;
        }

        .form-label {
          font-size: 13px;
          font-weight: 700;
          color: #425a68;
        }

        .input,
        .select {
          width: 100%;
          border: 1px solid #d9e5e6;
          border-radius: 10px;
          padding: 11px 12px;
          outline: none;
          background: white;
          color: #243b53;
          font-size: 14px;
        }

        .input:focus,
        .select:focus {
          border-color: #55cfc1;
          box-shadow: 0 0 0 3px rgba(85, 230, 208, .12);
        }

        .academic-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .subjects-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 24px 0 13px;
        }

        .subject-mode {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          margin-bottom: 15px;
        }

        .mode-btn {
          border: 1px solid #d6e4e5;
          background: white;
          color: #516875;
          padding: 9px 13px;
          border-radius: 9px;
          cursor: pointer;
          font-weight: 700;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .mode-btn.active {
          background: #104B4D;
          border-color: #104B4D;
          color: white;
        }

        .subjects-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .subject-row {
          display: grid;
          grid-template-columns: 1fr 180px 44px;
          gap: 10px;
          align-items: center;
        }

        .icon-btn {
          border: 1px solid #dce7e8;
          background: white;
          width: 42px;
          height: 42px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #607783;
        }

        .icon-btn:hover {
          border-color: #104B4D;
          color: #104B4D;
        }

        .icon-btn.delete:hover {
          border-color: #efb4b4;
          color: #c0392b;
          background: #fff7f7;
        }

        .form-footer {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #edf1f1;
        }

        .student-table-wrap {
          overflow-x: auto;
        }

        .student-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 800px;
        }

        .student-table th {
          background: #f5f9fa;
          color: #506875;
          text-align: left;
          padding: 12px;
          font-size: 12px;
          font-weight: 800;
        }

        .student-table td {
          padding: 13px 12px;
          border-bottom: 1px solid #edf1f1;
          font-size: 13px;
          color: #435966;
        }

        .student-name {
          font-weight: 800;
          color: #102F5B;
        }

        .student-id {
          font-size: 11px;
          color: #87959e;
          margin-top: 3px;
        }

        .table-actions {
          display: flex;
          gap: 6px;
        }

        .small-icon {
          width: 34px;
          height: 34px;
          border-radius: 8px;
          border: 1px solid #dce7e8;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #607783;
        }

        .small-icon:hover {
          color: #104B4D;
          border-color: #55cfc1;
        }

        .small-icon.danger:hover {
          color: #c0392b;
          border-color: #efb4b4;
        }

        .dataset-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          margin-bottom: 20px;
        }

        .dataset-header-title {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .dataset-header-icon {
          width: 48px;
          height: 48px;
          border-radius: 13px;
          background: #104B4D;
          color: #55E6D0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dataset-header h2 {
          margin: 0;
          font-size: 22px;
        }

        .dataset-header p {
          margin: 4px 0 0;
          color: #7a8994;
          font-size: 13px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(16, 47, 91, .38);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal {
          width: 100%;
          max-width: 520px;
          background: white;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 25px 70px rgba(16, 47, 91, .2);
        }

        .modal.large {
          max-width: 1100px;
          max-height: 88vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 20px;
          color: #102F5B;
        }

        .close-btn {
          border: none;
          background: #f2f7f7;
          color: #55707b;
          width: 36px;
          height: 36px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .close-btn:hover {
          background: #104B4D;
          color: white;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 13px;
        }

        .detail-item {
          padding: 13px;
          border: 1px solid #e6eeee;
          border-radius: 10px;
          background: #fafcfc;
        }

        .detail-item span {
          display: block;
          font-size: 11px;
          color: #7b8b95;
          margin-bottom: 4px;
        }

        .detail-item strong {
          color: #102F5B;
          font-size: 14px;
        }

        .subject-detail {
          margin-top: 18px;
        }

        .subject-detail h4 {
          margin: 0 0 10px;
          color: #102F5B;
        }

        .subject-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .subject-chip {
          padding: 8px 11px;
          background: #edf9f7;
          color: #104B4D;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
        }

        .upload-box {
          border: 1px dashed #b8cecf;
          border-radius: 14px;
          padding: 20px;
          background: #fbfdfd;
        }

        .upload-grid {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 12px;
          align-items: end;
        }

        .file-input {
          width: 100%;
          border: 1px solid #d9e5e6;
          border-radius: 10px;
          padding: 9px;
          background: white;
          font-size: 13px;
        }

        .loading {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
          color: #6e808c;
          gap: 9px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .academic-grid,
          .form-grid.three {
            grid-template-columns: repeat(2, 1fr);
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .upload-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 650px) {
          .dataset-page {
            padding: 15px;
          }

          .topbar,
          .section-heading,
          .dataset-header {
            align-items: flex-start;
          }

          .topbar {
            flex-direction: column;
          }

          .form-grid,
          .form-grid.three,
          .academic-grid,
          .detail-grid {
            grid-template-columns: 1fr;
          }

          .subject-row {
            grid-template-columns: 1fr;
          }

          .form-footer {
            flex-direction: column;
          }

          .form-footer button {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="dataset-container">
        {/* HEADER */}
        <div className="topbar">
          <div className="topbar-left">
            <button className="back-btn" onClick={() => navigate(-1)}>
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="page-title">Dataset Management</h1>
              <p className="page-subtitle">
                Create, manage and prepare student academic datasets for AI
                analysis.
              </p>
            </div>
          </div>

          <button
            className="primary-btn"
            onClick={() => {
              clearAlerts();
              setShowCreateDataset(true);
            }}
          >
            <Plus size={18} />
            Create Dataset
          </button>
        </div>

        {/* ALERTS */}
        {message && (
          <div className="alert success-alert">
            <CheckCircle size={18} />
            {message}
          </div>
        )}

        {error && (
          <div className="alert error-alert">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {/* ACTIVE DATASET */}
        {activeDataset && (
          <>
            <div className="dataset-header">
              <div className="dataset-header-title">
                <div className="dataset-header-icon">
                  <Database size={23} />
                </div>

                <div>
                  <h2>{activeDataset.dataset_name}</h2>
                  <p>Active student academic dataset</p>
                </div>
              </div>

              <div className="header-actions">
                <button
                  className="secondary-btn"
                  onClick={() => {
                    setShowDatasetDetails(true);
                    setShowStudentForm(false);
                  }}
                >
                  <Eye size={17} />
                  View Dataset
                </button>

                <button
                  className="secondary-btn"
                  onClick={startAddStudent}
                >
                  <UserPlus size={17} />
                  Add Student
                </button>

                <button
                  className="secondary-btn"
                  onClick={downloadCreatedDataset}
                >
                  <Download size={17} />
                  Export CSV
                </button>

                <button
                  className="danger-btn"
                  onClick={deleteActiveDataset}
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-box">
                <div className="stat-label">Students</div>
                <div className="stat-value">{studentCount}</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Subjects</div>
                <div className="stat-value">{subjectCount}</div>
              </div>

              <div className="stat-box">
                <div className="stat-label">Dataset Status</div>
                <div className="stat-value" style={{ fontSize: 18 }}>
                  Ready
                </div>
              </div>
            </div>
          </>
        )}

        {/* STUDENT FORM */}
        {showStudentForm && activeDataset && (
          <div className="section">
            <div className="section-heading">
              <div>
                <h2 className="section-title">
                  {editingRecordId ? "Edit Student" : "Add Student"}
                </h2>
                <p className="section-description">
                  Enter student details, academic performance and subject-wise
                  marks.
                </p>
              </div>
            </div>

            {/* STUDENT DETAILS */}
            <div className="section" style={{ marginBottom: 0 }}>
              <h3 className="section-title" style={{ fontSize: 16 }}>
                Student Details
              </h3>

              <div className="form-grid" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Student ID *</label>
                  <input
                    className="input"
                    value={student.student_id}
                    onChange={(e) =>
                      handleStudentChange("student_id", e.target.value)
                    }
                    placeholder="Example: STU001"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Student Name *</label>
                  <input
                    className="input"
                    value={student.name}
                    onChange={(e) =>
                      handleStudentChange("name", e.target.value)
                    }
                    placeholder="Enter student name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <input
                    className="input"
                    value={student.department}
                    onChange={(e) =>
                      handleStudentChange("department", e.target.value)
                    }
                    placeholder="Example: AI & DS"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Semester *</label>

                  <select
                    className="select"
                    value={student.semester}
                    onChange={(e) =>
                      handleStudentChange("semester", e.target.value)
                    }
                  >
                    <option value="">Select semester</option>
                    {Array.from({ length: 8 }, (_, index) => (
                      <option key={index + 1} value={index + 1}>
                        Semester {index + 1}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ACADEMIC DETAILS */}
            <div className="section" style={{ marginBottom: 0 }}>
              <h3 className="section-title" style={{ fontSize: 16 }}>
                Academic Details
              </h3>

              <div className="academic-grid" style={{ marginTop: 16 }}>
                {academicFields.map((field) => (
                  <div className="form-group" key={field.key}>
                    <label className="form-label">{field.label}</label>

                    <input
                      className="input"
                      type={field.type}
                      min={field.min}
                      max={field.max}
                      step={field.step || 1}
                      value={
                        student.academic_details[field.key] ?? ""
                      }
                      onChange={(e) =>
                        handleAcademicChange(
                          field.key,
                          e.target.value
                        )
                      }
                      placeholder="Enter value"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SUBJECTS */}
            <div className="section" style={{ marginBottom: 0 }}>
              <div className="subjects-header">
                <div>
                  <h3 className="section-title" style={{ fontSize: 16 }}>
                    Subject-wise Marks
                  </h3>

                  <p className="section-description">
                    Each student can have a different number of subjects.
                  </p>
                </div>

                <button
                  className="secondary-btn"
                  onClick={addSubject}
                >
                  <Plus size={16} />
                  Add Subject
                </button>
              </div>

              {previousSubjects.length > 0 && !editingRecordId && (
                <div className="subject-mode">
                  <button
                    className={`mode-btn ${
                      subjectMode === "previous" ? "active" : ""
                    }`}
                    onClick={usePreviousSubjects}
                  >
                    <Copy size={14} />
                    Use Previous Student Subjects
                  </button>

                  <button
                    className={`mode-btn ${
                      subjectMode === "manual" ? "active" : ""
                    }`}
                    onClick={useManualSubjects}
                  >
                    <BookOpen size={14} />
                    Enter Subjects Manually
                  </button>
                </div>
              )}

              <div className="subjects-list">
                {subjects.map((subject, index) => (
                  <div className="subject-row" key={subject.id}>
                    <input
                      className="input"
                      value={subject.name}
                      onChange={(e) =>
                        updateSubject(
                          subject.id,
                          "name",
                          e.target.value
                        )
                      }
                      placeholder={`Subject ${index + 1} name`}
                    />

                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      value={subject.marks}
                      onChange={(e) =>
                        updateSubject(
                          subject.id,
                          "marks",
                          e.target.value
                        )
                      }
                      placeholder="Marks / 100"
                    />

                    <button
                      className="icon-btn delete"
                      onClick={() => removeSubject(subject.id)}
                      title="Remove subject"
                      disabled={subjects.length <= 1}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* FORM FOOTER */}
            <div className="form-footer">
              <button
                className="secondary-btn"
                onClick={() => {
                  resetStudentForm();
                  setShowStudentForm(false);
                  setShowDatasetDetails(true);
                }}
              >
                <X size={17} />
                Cancel
              </button>

              {!editingRecordId && (
                <button
                  className="secondary-btn"
                  disabled={savingStudent}
                  onClick={() => saveStudent(true)}
                >
                  <Save size={17} />
                  Save & Add Another
                </button>
              )}

              <button
                className="primary-btn"
                disabled={savingStudent}
                onClick={() => saveStudent(false)}
              >
                {savingStudent ? (
                  <>
                    <RefreshCw size={17} className="spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={17} />
                    {editingRecordId
                      ? "Update Student"
                      : "Save Student"}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* DATASET STUDENTS */}
        {activeDataset && showDatasetDetails && !showStudentForm && (
          <div className="section">
            <div className="section-heading">
              <div>
                <h2 className="section-title">Dataset Students</h2>
                <p className="section-description">
                  View and manage all students stored inside this dataset.
                </p>
              </div>

              <button
                className="primary-btn"
                onClick={startAddStudent}
              >
                <Plus size={17} />
                Add Student
              </button>
            </div>

            {loading ? (
              <div className="loading">
                <RefreshCw size={19} className="spin" />
                Loading dataset...
              </div>
            ) : studentRecords.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Users size={25} />
                </div>

                <h3>No students yet</h3>

                <p>
                  Add the first student to start building this dataset.
                </p>

                <button
                  className="primary-btn"
                  onClick={startAddStudent}
                >
                  <UserPlus size={17} />
                  Add First Student
                </button>
              </div>
            ) : (
              <div className="student-table-wrap">
                <table className="student-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Department</th>
                      <th>Semester</th>
                      <th>Attendance</th>
                      <th>Previous %</th>
                      <th>Subjects</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {studentRecords.map((record, index) => {
                      const recordId =
                        record.record_id || record.id || index;

                      const recordSubjects =
                        record.subjects ||
                        record.student_subjects ||
                        [];

                      const academic =
                        record.academic_details || record;

                      return (
                        <tr key={recordId}>
                          <td>
                            <div className="student-name">
                              {record.name || "Unnamed"}
                            </div>

                            <div className="student-id">
                              {record.student_id || "-"}
                            </div>
                          </td>

                          <td>{record.department || "-"}</td>

                          <td>
                            {record.semester
                              ? `Semester ${record.semester}`
                              : "-"}
                          </td>

                          <td>
                            {academic.attendance_percentage !==
                            undefined
                              ? `${academic.attendance_percentage}%`
                              : "-"}
                          </td>

                          <td>
                            {academic.previous_semester_percentage !==
                            undefined
                              ? `${academic.previous_semester_percentage}%`
                              : "-"}
                          </td>

                          <td>{recordSubjects.length}</td>

                          <td>
                            <div className="table-actions">
                              <button
                                className="small-icon"
                                title="View"
                                onClick={() => {
                                  setSelectedStudent(record);
                                }}
                              >
                                <Eye size={15} />
                              </button>

                              <button
                                className="small-icon"
                                title="Edit"
                                onClick={() =>
                                  editStudent(record)
                                }
                              >
                                <Edit3 size={15} />
                              </button>

                              <button
                                className="small-icon danger"
                                title="Delete"
                                onClick={() =>
                                  deleteStudent(record)
                                }
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* DATASETS */}
        {!activeDataset && (
          <div className="section">
            <div className="section-heading">
              <div>
                <h2 className="section-title">Created Datasets</h2>
                <p className="section-description">
                  Create a separate dataset for admin-added student records.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="loading">
                <RefreshCw size={19} className="spin" />
                Loading datasets...
              </div>
            ) : datasets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Database size={26} />
                </div>

                <h3>No created datasets</h3>

                <p>
                  Create your first dataset and start adding students.
                </p>

                <button
                  className="primary-btn"
                  onClick={() => setShowCreateDataset(true)}
                >
                  <Plus size={17} />
                  Create Dataset
                </button>
              </div>
            ) : (
              <div className="dataset-grid">
                {datasets.map((dataset) => (
                  <div
                    className="dataset-card"
                    key={dataset.id}
                  >
                    <div className="dataset-card-head">
                      <div className="dataset-icon">
                        <Database size={21} />
                      </div>

                      <span className="dataset-type">
                        Created Dataset
                      </span>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      <h3>
                        {dataset.dataset_name ||
                          dataset.name ||
                          "Unnamed Dataset"}
                      </h3>
                    </div>

                    <div className="dataset-stats">
                      <div className="dataset-stat">
                        <Users size={15} />
                        {dataset.student_count ??
                          dataset.students_count ??
                          0}{" "}
                        students
                      </div>

                      {dataset.created_at && (
                        <div className="dataset-stat">
                          <FileText size={15} />
                          {String(
                            dataset.created_at
                          ).slice(0, 10)}
                        </div>
                      )}
                    </div>

                    <div className="card-actions">
                      <button
                        className="primary-btn"
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={() =>
                          openDataset(dataset.id)
                        }
                      >
                        <Eye size={16} />
                        Open
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CSV UPLOAD */}
        {!activeDataset && (
          <div className="section">
            <div className="section-heading">
              <div>
                <h2 className="section-title">
                  Upload Existing CSV Dataset
                </h2>

                <p className="section-description">
                  Upload your existing academic CSV for validation,
                  analysis and ML processing.
                </p>
              </div>
            </div>

            <div className="upload-box">
              <div className="upload-grid">
                <div className="form-group">
                  <label className="form-label">
                    Dataset Name
                  </label>

                  <input
                    className="input"
                    value={uploadName}
                    onChange={(e) =>
                      setUploadName(e.target.value)
                    }
                    placeholder="Example: Student Academic Dataset"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    CSV File
                  </label>

                  <input
                    id="csvUploadInput"
                    className="file-input"
                    type="file"
                    accept=".csv"
                    onChange={(e) =>
                      setUploadFile(
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </div>

                <button
                  className="primary-btn"
                  onClick={handleUpload}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="spin"
                      />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload size={17} />
                      Upload CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE DATASET MODAL */}
      {showCreateDataset && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Dataset</h3>

              <button
                className="close-btn"
                onClick={() =>
                  setShowCreateDataset(false)
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">
                Dataset Name *
              </label>

              <input
                className="input"
                autoFocus
                value={datasetName}
                onChange={(e) =>
                  setDatasetName(e.target.value)
                }
                placeholder="Example: CSE Semester 5 Students"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    createDataset();
                  }
                }}
              />
            </div>

            <div
              style={{
                marginTop: 12,
                fontSize: 12,
                color: "#748590",
              }}
            >
              You can add multiple students to this dataset
              after creating it.
            </div>

            <div className="form-footer">
              <button
                className="secondary-btn"
                onClick={() =>
                  setShowCreateDataset(false)
                }
              >
                <X size={16} />
                Cancel
              </button>

              <button
                className="primary-btn"
                onClick={createDataset}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="spin"
                    />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Create Dataset
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT DETAILS MODAL */}
      {selectedStudent && (
        <div className="modal-overlay">
          <div className="modal large">
            <div className="modal-header">
              <div>
                <h3>
                  {selectedStudent.name ||
                    "Student Details"}
                </h3>

                <div
                  style={{
                    marginTop: 4,
                    color: "#7b8b95",
                    fontSize: 12,
                  }}
                >
                  {selectedStudent.student_id || ""}
                </div>
              </div>

              <button
                className="close-btn"
                onClick={() =>
                  setSelectedStudent(null)
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span>Student ID</span>
                <strong>
                  {selectedStudent.student_id || "-"}
                </strong>
              </div>

              <div className="detail-item">
                <span>Name</span>
                <strong>
                  {selectedStudent.name || "-"}
                </strong>
              </div>

              <div className="detail-item">
                <span>Department</span>
                <strong>
                  {selectedStudent.department || "-"}
                </strong>
              </div>

              <div className="detail-item">
                <span>Semester</span>
                <strong>
                  {selectedStudent.semester
                    ? `Semester ${selectedStudent.semester}`
                    : "-"}
                </strong>
              </div>
            </div>

            <div
              className="subject-detail"
              style={{ marginTop: 22 }}
            >
              <h4>Academic Details</h4>

              <div className="detail-grid">
                {academicFields.map((field) => {
                  const academic =
                    selectedStudent.academic_details ||
                    selectedStudent;

                  return (
                    <div
                      className="detail-item"
                      key={field.key}
                    >
                      <span>{field.label}</span>

                      <strong>
                        {academic[field.key] !==
                        undefined &&
                        academic[field.key] !== ""
                          ? academic[field.key]
                          : "-"}
                      </strong>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="subject-detail">
              <h4>Subject-wise Marks</h4>

              <div className="subject-chips">
                {(
                  selectedStudent.subjects ||
                  selectedStudent.student_subjects ||
                  []
                ).map((subject, index) => (
                  <div
                    className="subject-chip"
                    key={index}
                  >
                    {subject.name ||
                      subject.subject_name}{" "}
                    —{" "}
                    {subject.marks ??
                      subject.subject_marks ??
                      "-"}
                  </div>
                ))}

                {(
                  selectedStudent.subjects ||
                  selectedStudent.student_subjects ||
                  []
                ).length === 0 && (
                  <span
                    style={{
                      color: "#87959e",
                      fontSize: 13,
                    }}
                  >
                    No subject records available.
                  </span>
                )}
              </div>
            </div>

            <div className="form-footer">
              <button
                className="secondary-btn"
                onClick={() =>
                  setSelectedStudent(null)
                }
              >
                <X size={16} />
                Close
              </button>

              <button
                className="primary-btn"
                onClick={() => {
                  const record = selectedStudent;
                  setSelectedStudent(null);
                  editStudent(record);
                }}
              >
                <Edit3 size={16} />
                Edit Student
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatasetManagement;