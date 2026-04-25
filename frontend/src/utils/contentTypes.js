export const CONTENT_TYPES = {
  lecture: {
    label:'محاضرة',
    color:'#203F9A',
    bgColor:'#BDCFFF',
    textColor:'#203F9A',
    badgeClass:'badge-lecture',
    orderNum:1,
  },
  material: {
    label:'مادة تعليمية',
    color:'#203F9A',
    bgColor:'#B8C0FF',
    textColor:'#203F9A',
    badgeClass:'badge-material',
    orderNum:2,
  },
  task: {
    label:'مهمة',
    color:'#203F9A',
    bgColor:'#C8B6FE',
    textColor:'#203F9A',
    badgeClass:'badge-task',
    orderNum:   3,
  },
  announcement: {
    label:'إعلان',
    color:'#203F9A',
    bgColor:'#E7C5FF',
    textColor:'#203F9A',
    badgeClass:'badge-announcement',
    orderNum:4,
  },
};

export const getTypeConfig = (type) =>
  CONTENT_TYPES[type] || CONTENT_TYPES.lecture;

export const formatArabicDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-JO', {
    weekday: 'long',
    year:    'numeric',
    month:   'long',
    day:     'numeric',
  });
};

export const formatShortDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-JO', {
    month: 'long',
    day:   'numeric',
  });
};

export const getDueDateBoundary = (dateStr) => {
  if (!dateStr) {
    return null;
  }

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  if (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  ) {
    date.setUTCHours(23, 59, 59, 999);
  }

  return date;
};

export const isDueDatePassed = (dateStr) => {
  const deadline = getDueDateBoundary(dateStr);

  if (!deadline) {
    return false;
  }

  return Date.now() > deadline.getTime();
};

export const formatDueDate = (dateStr) => {
  const deadline = getDueDateBoundary(dateStr);

  if (!deadline) {
    return '';
  }

  return deadline.toLocaleDateString('ar-JO');
};
