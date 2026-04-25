const { normalizeAttachmentArray } = require('./attachments');
const { getContentPermissions, getSubmissionPermissions } = require('./permissions');

const toPlainObject = (document) =>
  typeof document?.toObject === 'function' ? document.toObject() : document;

const serializeUser = (user) => {
  const source = toPlainObject(user);

  if (!source) {
    return null;
  }

  return {
    _id: source._id,
    id: source._id,
    name: source.name,
    username: source.username,
    studentId: source.studentId,
    role: source.role,
    avatar: source.avatar || '',
    isActive: source.isActive,
  };
};

const serializeContent = (content, req, options = {}) => {
  const source = toPlainObject(content);

  if (!source) {
    return null;
  }

  const viewer = options.user || req?.user || null;
  const course = options.course || source.course || null;

  return {
    ...source,
    attachments: normalizeAttachmentArray(source.attachments, { req }),
    permissions: getContentPermissions({ user: viewer, content: source, course }),
  };
};

const serializeSubmission = (submission, req, options = {}) => {
  const source = toPlainObject(submission);

  if (!source) {
    return null;
  }

  const viewer = options.user || req?.user || null;
  const task = options.task || source.task;

  return {
    ...source,
    attachments: normalizeAttachmentArray(source.attachments, { req }),
    permissions: getSubmissionPermissions({ user: viewer, submission: source, task }),
  };
};

module.exports = {
  serializeContent,
  serializeSubmission,
  serializeUser,
};
