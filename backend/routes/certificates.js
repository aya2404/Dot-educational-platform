const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  generateCertificate,
  getMyCertificates,
  getCertificatePdf,
  verifyCertificate,
} = require('../controllers/certificateController');

// PUBLIC verification endpoint — declared BEFORE `protect` so anyone (including
// unauthenticated visitors scanning the QR) can verify a certificate.
router.get('/verify/:certificateId', verifyCertificate);

// Everything below requires authentication.
router.use(protect);

router.post('/', authorize('student'), generateCertificate);
router.get('/', authorize('student'), getMyCertificates);
router.get('/:id/pdf', authorize('student'), getCertificatePdf);

module.exports = router;
