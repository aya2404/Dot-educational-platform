export const ROLE_HOME = {
  student: '/student',
  teacher: '/teacher',
  admin: '/admin',
  superadmin: '/superadmin',
};

export const ROLE_LABELS = {
  student: 'طالب',
  teacher: 'مدرس',
  admin: 'مشرف',
  superadmin: 'مشرف رئيسي',
};

export const getRoleHomePath = (role) => ROLE_HOME[role] || '/login';

export const getRoleCoursePath = (role, courseId) => {
  if (!courseId) {
    return getRoleHomePath(role);
  }

  switch (role) {
    case 'student':
      return `/student/course/${courseId}`;
    case 'teacher':
      return `/teacher/course/${courseId}`;
    case 'admin':
      return `/admin/course/${courseId}`;
    case 'superadmin':
      return `/superadmin/course/${courseId}`;
    default:
      return getRoleHomePath(role);
  }
};

export const getCreateContentPath = (role) => {
  switch (role) {
    case 'teacher':
      return '/teacher/content/new';
    case 'admin':
      return '/admin/content/new';
    case 'superadmin':
      return '/superadmin/content/new';
    default:
      return getRoleHomePath(role);
  }
};

export const getEditContentPath = (role, contentId) => {
  if (!contentId) {
    return getCreateContentPath(role);
  }

  switch (role) {
    case 'teacher':
      return `/teacher/content/${contentId}/edit`;
    case 'admin':
      return `/admin/content/${contentId}/edit`;
    case 'superadmin':
      return `/superadmin/content/${contentId}/edit`;
    default:
      return getRoleHomePath(role);
  }
};
