const Task = require('../models/Task');

// @desc    Get all user tasks (with search, status filter, and pagination)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, search, page = 1, limit = 6 } = req.query;

    // Build query
    const query = { userId };

    // Filter by status
    if (status && ['Not Started', 'In Progress', 'Completed', 'On Hold'].includes(status)) {
      query.status = status;
    }

    // Search by title (case insensitive)
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // Pagination calculations
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get tasks and total count
    const totalTasks = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalPages = Math.ceil(totalTasks / limitNum);

    res.status(200).json({
      success: true,
      count: tasks.length,
      pagination: {
        totalTasks,
        totalPages,
        currentPage: pageNum,
        limit: limitNum
      },
      data: tasks
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const { title, description, status, dueDate, assignedTo, priority, attachment, comments } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Please add a title and description' });
    }

    const task = await Task.create({
      title,
      description,
      status: status || 'Not Started',
      priority: priority || 'Medium',
      assignedTo: assignedTo || '',
      attachment: attachment || '',
      comments: comments || '',
      dueDate: dueDate || null,
      userId: req.user._id
    });

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    const { title, description, status, dueDate, assignedTo, priority, attachment, comments } = req.body;
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Verify task ownership
    if (task.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this task' });
    }

    // Update fields
    const updatedData = {};
    if (title !== undefined) updatedData.title = title;
    if (description !== undefined) updatedData.description = description;
    if (status !== undefined) updatedData.status = status;
    if (dueDate !== undefined) updatedData.dueDate = dueDate;
    if (assignedTo !== undefined) updatedData.assignedTo = assignedTo;
    if (priority !== undefined) updatedData.priority = priority;
    if (attachment !== undefined) updatedData.attachment = attachment;
    if (comments !== undefined) updatedData.comments = comments;

    task = await Task.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Verify task ownership
    if (task.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this task' });
    }

    await Task.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTasks,
  createTask,
  updateTask,
  deleteTask
};
