const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  generateCertificate,
  getMyCertificates,
  getCertificatePdf,
  getPendingCertificates,
  teacherApprove,
  adminApprove,
  getTemplate,
  updateTemplate,
  verifyCertificate,
} = require('../controllers/certificateController');

// PUBLIC verification endpoint — declared BEFORE `protect` so anyone (including
// unauthenticated visitors scanning the QR) can verify a certificate.
router.get('/verify/:certificateId', verifyCertificate);

// Everything below requires authentication.
router.use(protect);

// ----- Student self-service -----
router.post('/', authorize('student'), generateCertificate);
router.get('/', authorize('student'), getMyCertificates);

// ----- Approval queue + template (staff). Specific paths before '/:id/...'. -----
router.get('/pending', authorize('teacher', 'admin', 'superadmin'), getPendingCertificates);
router.get('/template', authorize('admin', 'superadmin'), getTemplate);
router.put('/template', authorize('admin', 'superadmin'), updateTemplate);

// ----- Review actions -----
router.patch('/:id/teacher-approve', authorize('teacher', 'admin', 'superadmin'), teacherApprove);
router.patch('/:id/admin-approve', authorize('admin', 'superadmin'), adminApprove);

// ----- Student PDF download (issued certificates only) -----
router.get('/:id/pdf', authorize('student'), getCertificatePdf);

module.exports = router;
