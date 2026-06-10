import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import './App.css';

function App() {
  const {
    user,
    token,
    loading: authLoading,
    toasts,
    login,
    register,
    logout,
    showToast,
    API_URL
  } = useAuth();

  // Task List States
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, rate: 0 });

  // Query States
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Auth Form States
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskStatus, setTaskStatus] = useState('Not Started');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [taskDueTime, setTaskDueTime] = useState('');
  const [taskAssignedTo, setTaskAssignedTo] = useState('');
  const [taskPriority, setTaskPriority] = useState('Medium');
  const [taskAttachment, setTaskAttachment] = useState('');
  const [taskComments, setTaskComments] = useState('');
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Fetch all user tasks to calculate overall stats
  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/tasks?limit=10000`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        const total = data.data.length;
        const completed = data.data.filter(t => t.status === 'Completed').length;
        const pending = total - completed;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        setStats({ total, completed, pending, rate });
      }
    } catch (err) {
      console.error('Failed to fetch stats', err);
    }
  };

  // Fetch paginated tasks based on current filters/search/page
  const fetchTasks = async () => {
    if (!token) return;
    setTasksLoading(true);
    try {
      let url = `${API_URL}/tasks?page=${currentPage}&limit=6`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery)}`;
      }
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setTasks(data.data);
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch tasks', 'error');
    } finally {
      setTasksLoading(false);
    }
  };

  // Re-fetch tasks when query inputs change
  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token, statusFilter, currentPage]);

  // Debounced search logic
  useEffect(() => {
    if (!token) return;
    const delayDebounceFn = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 on new search
      fetchTasks();
    }, 4000000000000000000); // We will manually trigger or search on small debounce
    // Wait, 4*10^17 is too large. Let's use a standard 400ms debounce instead!
    const realDelay = setTimeout(() => {
      setCurrentPage(1);
      fetchTasks();
    }, 400);

    return () => {
      clearTimeout(delayDebounceFn);
      clearTimeout(realDelay);
    };
  }, [searchQuery]);

  // Fetch stats when tasks change or on mount
  useEffect(() => {
    if (token) {
      fetchStats();
    }
  }, [token, tasks.length]);

  // Handle Authentication submit
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail || !authPassword || (authMode === 'register' && (!authName || !authConfirmPassword))) {
      setAuthError('Please fill in all fields');
      return;
    }
    if (authMode === 'register' && authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match');
      return;
    }
    setAuthSubmitting(true);
    try {
      let result;
      if (authMode === 'login') {
        result = await login(authEmail, authPassword);
      } else {
        result = await register(authName, authEmail, authPassword);
      }
      if (!result.success) {
        setAuthError(result.message || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Connection error, please check backend');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Open modal to create a new task
  const openCreateModal = () => {
    setEditingTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskStatus('Not Started');
    setTaskDueDate('');
    setTaskDueTime('');
    setTaskAssignedTo('');
    setTaskPriority('Medium');
    setTaskAttachment('');
    setTaskComments('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal to edit an existing task
  const openEditModal = (task) => {
    setEditingTask(task);
    setTaskTitle(task.title);
    setTaskDesc(task.description);
    setTaskStatus(task.status || 'Not Started');
    setTaskAssignedTo(task.assignedTo || '');
    setTaskPriority(task.priority || 'Medium');
    setTaskAttachment(task.attachment || '');
    setTaskComments(task.comments || '');
    
    // Parse ISO date-time string into local YYYY-MM-DD and HH:MM parts
    if (task.dueDate) {
      const dateObj = new Date(task.dueDate);
      const pad = (num) => String(num).padStart(2, '0');
      setTaskDueDate(`${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`);
      setTaskDueTime(`${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`);
    } else {
      setTaskDueDate('');
      setTaskDueTime('');
    }
    setFormError('');
    setIsModalOpen(true);
  };

  // Handle file select and convert to base64 JSON string
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File size must be under 5MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const fileObj = {
        name: file.name,
        type: file.type,
        data: reader.result
      };
      setTaskAttachment(JSON.stringify(fileObj));
    };
    reader.readAsDataURL(file);
  };

  // Submit task create / edit form
  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!taskTitle.trim() || !taskDesc.trim()) {
      setFormError('Title and description are required');
      return;
    }
    setFormSubmitting(true);
    try {
      const method = editingTask ? 'PUT' : 'POST';
      const endpoint = editingTask ? `${API_URL}/tasks/${editingTask._id}` : `${API_URL}/tasks`;
      
      // Combine date and time states into a single ISO timestamp string
      let combinedDateTime = null;
      if (taskDueDate) {
        const timePart = taskDueTime || '00:00';
        combinedDateTime = new Date(`${taskDueDate}T${timePart}`).toISOString();
      }

      const body = {
        title: taskTitle,
        description: taskDesc,
        status: taskStatus,
        priority: taskPriority,
        assignedTo: taskAssignedTo,
        attachment: taskAttachment,
        comments: taskComments,
        dueDate: combinedDateTime
      };

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        showToast(editingTask ? 'Task updated!' : 'Task created!', 'success');
        setIsModalOpen(false);
        fetchTasks();
        fetchStats();
      } else {
        setFormError(data.message || 'Failed to save task');
      }
    } catch (err) {
      setFormError('Server connection error');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete task
  const handleDeleteTask = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await fetch(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Task deleted successfully', 'success');
        fetchTasks();
        fetchStats();
      } else {
        showToast(data.message || 'Failed to delete task', 'error');
      }
    } catch (err) {
      showToast('Server connection error', 'error');
    }
  };

  // Fast toggle task status on badge click - cycles through Not Started -> In Progress -> Completed -> On Hold
  const handleToggleStatus = async (task) => {
    const statuses = ['Not Started', 'In Progress', 'Completed', 'On Hold'];
    const currentIndex = statuses.indexOf(task.status || 'Not Started');
    const newStatus = statuses[currentIndex === -1 ? 0 : (currentIndex + 1) % statuses.length];
    
    try {
      const res = await fetch(`${API_URL}/tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Task marked as ${newStatus}`, 'success');
        fetchTasks();
        fetchStats();
      }
    } catch (err) {
      showToast('Server connection error', 'error');
    }
  };

  // Format due date representation showing weekday, date, year, and time
  const formatDueDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return date.toLocaleDateString(undefined, options);
  };

  // Switch between Login and Register modes
  const switchAuthMode = () => {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
    setAuthError('');
    setAuthName('');
    setAuthEmail('');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  // Loading spinner during load
  if (authLoading) {
    return (
      <div className="loader-container">
        <div className="loader"></div>
        <p style={{ color: 'var(--text-muted)' }}>Initializing Task Manager...</p>
      </div>
    );
  }

  // Not authenticated: Auth pages
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-container glass-panel">
          <div className="auth-header">
            <h2>{authMode === 'login' ? 'Welcome Back' : 'Register'}</h2>
            <p>{authMode === 'login' ? 'Sign in to access your dashboard' : 'Register to start managing tasks'}</p>
          </div>

          <form onSubmit={handleAuthSubmit}>
            {authError && <div className="form-error" style={{ marginBottom: '15px' }}>⚠️ {authError}</div>}

            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="John Doe"
                  value={authName}
                  onChange={(e) => { setAuthName(e.target.value); setAuthError(''); }}
                  disabled={authSubmitting}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="yourname@example.com"
                value={authEmail}
                onChange={(e) => { setAuthEmail(e.target.value); setAuthError(''); }}
                disabled={authSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => { setAuthPassword(e.target.value); setAuthError(''); }}
                  disabled={authSubmitting}
                  style={{ width: '100%', paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0'
                  }}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {authMode === 'register' && (
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="••••••••"
                    value={authConfirmPassword}
                    onChange={(e) => { setAuthConfirmPassword(e.target.value); setAuthError(''); }}
                    disabled={authSubmitting}
                    style={{ width: '100%', paddingRight: '45px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0'
                    }}
                  >
                    {showConfirmPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={authSubmitting}>
              {authSubmitting ? 'Processing...' : authMode === 'login' ? 'Sign In' : 'Register'}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
              <a href="#" onClick={(e) => { e.preventDefault(); switchAuthMode(); }}>
                {authMode === 'login' ? 'Register' : 'Sign In'}
              </a>
            </p>
          </div>
        </div>

        {/* System Toast layer */}
        {toasts.length > 0 && (
          <div className="toast-container">
            {toasts.map((toast) => (
              <div key={toast.id} className={`toast ${toast.type}`}>
                <span>{toast.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Dashboard layout
  return (
    <>
      {/* Navigation Bar */}
      <nav className="dashboard-navbar">
        <div className="nav-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          TaskFlow
        </div>

        <div className="nav-user">
          <div className="nav-user-info">
            <div className="nav-user-name">{user.name}</div>
            <div className="nav-user-email">{user.email}</div>
          </div>
          <div className="nav-avatar">
            {user.name ? user.name[0].toUpperCase() : 'U'}
          </div>
          <button onClick={logout} className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </nav>

      {/* Main Dashboard Panel */}
      <main className="dashboard-main">
        {/* Statistical Summary Cards */}
        <section className="stats-grid">
          <div className="stat-card glass-panel">
            <div className="stat-icon total">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 20h9M3 20h9M3 4h18M3 8h18M3 12h18M3 16h18" />
              </svg>
            </div>
            <div>
              <div className="stat-num">{stats.total}</div>
              <div className="stat-label">Total Tasks</div>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon completed">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <div className="stat-num">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon pending">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <div>
              <div className="stat-num">{stats.pending}</div>
              <div className="stat-label">Pending</div>
            </div>
          </div>

          <div className="stat-card glass-panel">
            <div className="stat-icon rate">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
                <path d="M22 12A10 10 0 0 0 12 2v10z" />
              </svg>
            </div>
            <div>
              <div className="stat-num">{stats.rate}%</div>
              <div className="stat-label">Completion Rate</div>
            </div>
          </div>
        </section>

        {/* Dashboard Filters & Controls */}
        <section className="controls-bar">
          <div className="search-box">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="filter-actions">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
              >
                All
              </button>
              <button
                className={`filter-tab ${statusFilter === 'Not Started' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('Not Started'); setCurrentPage(1); }}
              >
                Not Started
              </button>
              <button
                className={`filter-tab ${statusFilter === 'In Progress' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('In Progress'); setCurrentPage(1); }}
              >
                In Progress
              </button>
              <button
                className={`filter-tab ${statusFilter === 'Completed' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('Completed'); setCurrentPage(1); }}
              >
                Completed
              </button>
              <button
                className={`filter-tab ${statusFilter === 'On Hold' ? 'active' : ''}`}
                onClick={() => { setStatusFilter('On Hold'); setCurrentPage(1); }}
              >
                On Hold
              </button>
            </div>

            <button onClick={openCreateModal} className="btn btn-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Task
            </button>
          </div>
        </section>

        {/* Task cards listing */}
        {tasksLoading ? (
          <div className="loader-container" style={{ minHeight: '150px' }}>
            <div className="loader"></div>
            <p style={{ color: 'var(--text-muted)' }}>Loading Tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state glass-panel">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="13" y2="17" />
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h3>No Tasks Found</h3>
            <p>
              {searchQuery || statusFilter !== 'all'
                ? "No tasks match your current search queries or filters."
                : "You don't have any tasks created yet. Click 'Add Task' to get started!"}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button onClick={openCreateModal} className="btn btn-primary" style={{ padding: '8px 16px' }}>
                Create Your First Task
              </button>
            )}
          </div>
        ) : (
          <section className="tasks-grid">
            {tasks.map((task) => (
              <div key={task._id} className={`task-card glass-panel ${task.status ? task.status.toLowerCase().replace(/\s+/g, '-') : 'not-started'}`}>
                <div className="task-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <h3 className="task-title" title={task.title} style={{ margin: 0, flex: 1, paddingRight: '8px' }}>
                    {task.title}
                  </h3>
                  <span className={`priority-badge ${task.priority || 'Medium'}`}>
                    {task.priority || 'Medium'}
                  </span>
                </div>
                
                <p className="task-desc" style={{ margin: '4px 0 8px 0' }}>{task.description}</p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', margin: '4px 0 8px 0' }}>
                  {task.assignedTo && (
                    <div className="task-assigned" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <span>Assigned: <strong>{task.assignedTo}</strong></span>
                    </div>
                  )}
                  
                  {task.dueDate && (
                    <div className="task-date" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>Due: {formatDueDate(task.dueDate)}</span>
                    </div>
                  )}

                  {task.attachment && (() => {
                    let isJson = false;
                    let attachObj = null;
                    try {
                      if (task.attachment.startsWith('{')) {
                        attachObj = JSON.parse(task.attachment);
                        isJson = true;
                      }
                    } catch (e) {}

                    if (isJson && attachObj) {
                      const isImg = attachObj.data && attachObj.data.startsWith('data:image/');
                      return (
                        <div className="task-attachment-container" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                          <div className="task-attachment" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            <a href={attachObj.data} download={attachObj.name} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: '500' }}>
                              {attachObj.name}
                            </a>
                          </div>
                          {isImg && (
                            <a href={attachObj.data} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '4px' }}>
                              <img 
                                src={attachObj.data} 
                                alt={attachObj.name} 
                                style={{ 
                                  maxWidth: '100%', 
                                  maxHeight: '120px', 
                                  borderRadius: '6px', 
                                  objectFit: 'cover', 
                                  border: '1px solid var(--glass-border)',
                                  cursor: 'pointer',
                                  transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.target.style.transform = 'scale(1.02)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                              />
                            </a>
                          )}
                        </div>
                      );
                    } else {
                      return (
                        <div className="task-attachment" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                          <a href={task.attachment.startsWith('http') ? task.attachment : '#'} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-secondary)', textDecoration: 'none' }}>
                            {task.attachment.length > 25 ? 'View Document / Reference' : task.attachment}
                          </a>
                        </div>
                      );
                    }
                  })()}
                </div>

                {task.comments && (
                  <div className="task-comments" style={{ 
                    fontSize: '0.8rem', 
                    color: 'rgba(148, 163, 184, 0.8)', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    padding: '6px 10px', 
                    borderRadius: '6px', 
                    borderLeft: '2px solid var(--color-primary)',
                    fontStyle: 'italic',
                    marginBottom: '8px'
                  }}>
                    "{task.comments}"
                  </div>
                )}
                
                <div className="task-card-footer">
                  <span
                    className={`status-badge ${task.status ? task.status.toLowerCase().replace(/\s+/g, '-') : 'not-started'}`}
                    onClick={() => handleToggleStatus(task)}
                    title="Click to cycle status"
                  >
                    <span className="badge-dot" style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: 'currentColor',
                      display: 'inline-block'
                    }}></span>
                    {task.status || 'Not Started'}
                  </span>

                  <div className="task-actions">
                    <button
                      className="btn-icon"
                      onClick={() => openEditModal(task)}
                      title="Edit Task"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z" />
                      </svg>
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={() => handleDeleteTask(task._id, task.title)}
                      title="Delete Task"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Pagination Controls */}
        {tasks.length > 0 && (
          <section className="pagination-container">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              &lt;
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`pagination-btn ${page === currentPage ? 'active' : ''}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              &gt;
            </button>
          </section>
        )}
      </main>

      {/* Task Create / Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingTask ? 'Edit Task' : 'Create Task'}</h2>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleTaskSubmit}>
              {formError && <div className="form-error" style={{ marginBottom: '15px' }}>⚠️ {formError}</div>}

              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Review pull request..."
                  value={taskTitle}
                  onChange={(e) => { setTaskTitle(e.target.value); setFormError(''); }}
                  disabled={formSubmitting}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="6"
                  placeholder="Examine frontend components and styling rules..."
                  value={taskDesc}
                  onChange={(e) => { setTaskDesc(e.target.value); setFormError(''); }}
                  disabled={formSubmitting}
                  style={{ resize: 'vertical' }}
                ></textarea>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Assigned To</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Name of assignee..."
                    value={taskAssignedTo}
                    onChange={(e) => { setTaskAssignedTo(e.target.value); setFormError(''); }}
                    disabled={formSubmitting}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Priority</label>
                  <select
                    className="form-control"
                    value={taskPriority}
                    onChange={(e) => { setTaskPriority(e.target.value); setFormError(''); }}
                    disabled={formSubmitting}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-control"
                  value={taskStatus}
                  onChange={(e) => { setTaskStatus(e.target.value); setFormError(''); }}
                  disabled={formSubmitting}
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Due Date</label>
                  <input
                    type="date"
                    className="form-control"
                    value={taskDueDate}
                    onChange={(e) => { setTaskDueDate(e.target.value); setFormError(''); }}
                    disabled={formSubmitting}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Due Time</label>
                  <input
                    type="time"
                    className="form-control"
                    value={taskDueTime}
                    onChange={(e) => { setTaskDueTime(e.target.value); setFormError(''); }}
                    disabled={formSubmitting}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Attachments / References</label>
                {(() => {
                  let parsedAttachment = null;
                  try {
                    if (taskAttachment && taskAttachment.startsWith('{')) {
                      parsedAttachment = JSON.parse(taskAttachment);
                    }
                  } catch (e) {}

                  if (parsedAttachment) {
                    const isImg = parsedAttachment.data && parsedAttachment.data.startsWith('data:image/');
                    return (
                      <div className="file-preview-container">
                        <div className="file-preview-info">
                          {isImg ? (
                            <img src={parsedAttachment.data} alt={parsedAttachment.name} className="file-preview-thumbnail" />
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                            </svg>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div className="file-preview-name" title={parsedAttachment.name}>{parsedAttachment.name}</div>
                            <div className="file-preview-size">Ready for save</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => setTaskAttachment('')}
                          title="Remove Attachment"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    );
                  } else if (taskAttachment) {
                    return (
                      <div className="file-preview-container">
                        <div className="file-preview-info">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                          </svg>
                          <div style={{ minWidth: 0 }}>
                            <div className="file-preview-name" title={taskAttachment}>{taskAttachment}</div>
                            <div className="file-preview-size">Legacy URL Reference</div>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn-icon btn-icon-danger"
                          onClick={() => setTaskAttachment('')}
                          title="Remove Attachment"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    );
                  } else {
                    return (
                      <div 
                        className="file-upload-wrapper" 
                        onClick={() => document.getElementById('task-file-input').click()}
                      >
                        <input
                          id="task-file-input"
                          type="file"
                          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                          style={{ display: 'none' }}
                          onChange={handleFileChange}
                          disabled={formSubmitting}
                        />
                        <svg className="file-upload-icon" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                          Click to upload PDF, Image or Document
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Max size: 5MB
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting ? 'Saving...' : editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating System Toasts */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast ${toast.type}`}>
              <span className="badge-dot" style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'currentColor',
                display: 'inline-block'
              }}></span>
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export default App;
