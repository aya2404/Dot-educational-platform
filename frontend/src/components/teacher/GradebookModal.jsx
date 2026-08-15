import React, { useEffect, useState } from 'react';
import { BsTable, BsXLg } from 'react-icons/bs';
import api from '../../utils/api';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import Loader from '../common/Loader';
import './GradebookModal.css';

const formatPercentage = (value) =>
  value === null || value === undefined ? '—' : `${value}%`;

const GradebookModal = ({ course, onClose }) => {
  const dialogRef = useFocusTrap(true);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await api.get(`/courses/${course._id}/gradebook`);
        if (active) setData(response.data);
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || 'تعذر تحميل دفتر الدرجات');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [course._id]);

  const tasks = data?.tasks || [];
  const students = data?.students || [];
  const maxScoreById = Object.fromEntries(tasks.map((task) => [task.id, task.maxScore]));

  const renderCell = (cell) => {
    if (!cell || cell.status === 'not_submitted') {
      return <span className="gb-cell gb-cell--missing" title="لم يُسلّم">—</span>;
    }
    if (cell.status === 'ungraded') {
      return <span className="gb-cell gb-cell--ungraded">قيد التقييم</span>;
    }
    return (
      <span className={`gb-cell gb-cell--graded${cell.invalid ? ' gb-cell--invalid' : ''}`}>
        {cell.grade}/{maxScoreById[cell.taskId]}
        {cell.invalid ? ' ⚠' : ''}
      </span>
    );
  };

  return (
    <div className="theme-modal-backdrop" onClick={onClose}>
      <div
        className="theme-modal theme-modal--wide"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`دفتر الدرجات: ${course.name}`}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="theme-modal__header">
          <div className="d-flex align-items-start gap-3">
            <div className="theme-modal__icon">
              <BsTable size={18} />
            </div>
            <div>
              <h2 className="theme-modal__title">دفتر الدرجات — {course.name}</h2>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onClose}
            aria-label="إغلاق"
          >
            <BsXLg size={14} />
          </button>
        </div>

        <div className="gradebook__body">
          {isLoading ? (
            <Loader variant="section" />
          ) : error ? (
            <div className="alert alert-danger mb-0">{error}</div>
          ) : students.length === 0 ? (
            <div className="empty-panel">
              <h3>لا يوجد طلاب مسجلون في هذا الكورس</h3>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-panel">
              <h3>لا توجد مهام قابلة للتقييم في هذا الكورس</h3>
            </div>
          ) : (
            <div className="gradebook__scroll">
              <table className="gradebook__table">
                <thead>
                  <tr>
                    <th scope="col">الطالب</th>
                    {tasks.map((task) => (
                      <th key={task.id} scope="col" title={task.title}>
                        <span className="gradebook__task-head">{task.title}</span>
                        <span className="gradebook__task-max">/{task.maxScore}</span>
                      </th>
                    ))}
                    <th scope="col">المكتسبة</th>
                    <th scope="col">الكلية</th>
                    <th scope="col">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const cellByTask = Object.fromEntries(student.tasks.map((cell) => [cell.taskId, cell]));
                    return (
                      <tr key={student.id}>
                        <th scope="row" className="gradebook__student">
                          <span className="gradebook__student-name">{student.name}</span>
                          <span className="gradebook__student-id">{student.studentId}</span>
                        </th>
                        {tasks.map((task) => (
                          <td key={task.id} className="gradebook__cell">
                            {renderCell(cellByTask[task.id])}
                          </td>
                        ))}
                        <td className="gradebook__num">{student.earnedPoints}</td>
                        <td className="gradebook__num">{student.possiblePoints}</td>
                        <td className="gradebook__num gradebook__pct">
                          {formatPercentage(student.percentage)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GradebookModal;
