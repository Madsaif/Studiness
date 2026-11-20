// ============================================================
// Google Form settings. এখানে নিজের Form-এর তথ্য বসান।
// README.md-তে ধাপগুলো লেখা আছে।
// ============================================================
const CONFIG = {
  // Login/Register tracking form. Form > Send > link icon > "formResponse" দিয়ে শেষ হওয়া action URL
  LOGIN_FORM_ACTION: 'https://docs.google.com/forms/d/e/YOUR_LOGIN_FORM_ID/formResponse',

  // প্রতিটি প্রশ্নের entry ID (Form > ⋮ > Get pre-filled link থেকে পাবেন)
  LOGIN_FORM_FIELDS: {
    event: 'entry.1111111111', // login / register
    name: 'entry.2222222222',
    email: 'entry.3333333333',
    time: 'entry.4444444444',
  },

  // Feedback form-এর লিংক (শেষ হবে /viewform দিয়ে)
  FEEDBACK_FORM_URL: 'https://docs.google.com/forms/d/e/YOUR_FEEDBACK_FORM_ID/viewform',
};
