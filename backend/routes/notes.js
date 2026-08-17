const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
} = require('../controllers/noteController');

// Every note route requires authentication and is scoped to req.user. No role
// gate is needed — notes are personal to each authenticated user, and each
// handler enforces owner + tenant ownership.
router.use(protect);

router.get('/', listNotes);
router.post('/', createNote);
router.patch('/:id', updateNote);
router.delete('/:id', deleteNote);

module.exports = router;
