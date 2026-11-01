// Intentional defects for the SQA course.
//
// The app ships with deliberately planted bugs so students have something real to find.
// Every planted bug is guarded by `bugs.on('<ID>')`. The full list (with explanations)
// is in instructor/ANSWER_KEY.md - keep that folder away from students.
//
// Set INJECT_BUGS=0 to run the clean, spec-correct version of the app.
const ENABLED = process.env.INJECT_BUGS !== '0';

module.exports = {
  enabled: ENABLED,
  on: (id) => ENABLED && !!id,
};
