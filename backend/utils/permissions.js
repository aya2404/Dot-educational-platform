const { MANAGER_ROLES } = require('./courseAccess');

const getIdString = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value.toString === 'function' && !value._id) {
    return value.toString();
  }

  return value._id?.toString() || '';
};

const userHasManagerPrivileges = (user) => MANAGER_ROLES.has(user?.role);

const ownsResource = (user, owner) =>
  Boolean(user?._id) && getIdString(owner) === user._id.toString();

const isAssignedCourseTeacher = (user, course) =>
  user?.role === 'teacher' && ownsResource(user, course?.teacher);

const getSubmissionDeadline = (task) => {
  if (!task?.dueDate) {
    return null;
  }

  const deadline = new Date(task.dueDate);

  if (Number.isNaN(deadline.getTime())) {
    return null;
  }

  if (
    deadline.getUTCHours() === 0 &&
    deadline.getUTCMinutes() === 0 &&
    deadline.getUTCSeconds() === 0 &&
    deadline.getUTCMilliseconds() === 0
  ) {
    deadline.setUTCHours(23, 59, 59, 999);
  }

  return deadline;
};

const isSubmissionWindowOpen = (task) => {
  const deadline = getSubmissionDeadline(task);

  if (!deadline) {
    return true;
  }

  return Date.now() <= deadline.getTime();
};

const getContentPermissions = ({ user, content, course }) => {
  const isOwner = ownsResource(user, content?.createdBy);
  const isCourseTeacher = isAssignedCourseTeacher(user, course || content?.course);
  const canManage = userHasManagerPrivileges(user) || isOwner || isCourseTeacher;

  return {
    isOwner,
    isCourseTeacher,
    canEdit: canManage,
    canDelete: canManage,
    canManageAttachments: canManage,
  };
};

const getSubmissionPermissions = ({ user, submission, task }) => {
  const isOwner = ownsResource(user, submission?.student);
  const isManager = userHasManagerPrivileges(user);
  const isWindowOpen = isSubmissionWindowOpen(task);
  const canOwnerManage = user?.role === 'student' && isOwner && isWindowOpen;

  return {
    isOwner,
    isPastDeadline: !isWindowOpen,
    canEdit: isManager || canOwnerManage,
    canDelete: isManager || canOwnerManage,
    canManageAttachments: isManager || canOwnerManage,
  };
};

module.exports = {
  getContentPermissions,
  getIdString,
  getSubmissionDeadline,
  getSubmissionPermissions,
  isSubmissionWindowOpen,
  ownsResource,
  userHasManagerPrivileges,
};
