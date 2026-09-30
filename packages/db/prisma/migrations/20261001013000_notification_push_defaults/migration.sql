-- Default push on for selected notification kinds (matches @bbrc/shared defaults).
UPDATE "notification_preference"
SET "push_enabled" = true
WHERE "kind" IN (
  'book_added_to_library',
  'comment_on_your_post',
  'sitting_poll_started',
  'sitting_poll_closed',
  'sitting_finished',
  'book_requested'
);
