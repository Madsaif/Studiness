// ============================================================
// Google Form settings. এখানে নিজের Form-এর তথ্য বসান।
// README.md-তে ধাপগুলো লেখা আছে।
// ============================================================
const CONFIG = {
  // Login/Register tracking form. Form > Send > link icon > "formResponse" দিয়ে শেষ হওয়া action URL
  LOGIN_FORM_ACTION: 'https://docs.google.com/forms/d/e/1FAIpQLSf3br1qW9j3sWxG1CIrsi-7r1JZXm6NHVu3sO18nFvsic44QA/viewform?usp=dialog',

  // প্রতিটি প্রশ্নের entry ID (Form > ⋮ > Get pre-filled link থেকে পাবেন)
  LOGIN_FORM_FIELDS: {
     event: 'entry.1429785839',
    name: 'entry.1193451344',
    email: 'entry.979544701',
    time: 'entry.780941897',
  },

  // Feedback form-এর লিংক (শেষ হবে /viewform দিয়ে)
  FEEDBACK_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLScaMqyc65goEjbv3-ThkxyEdNVTEk9MXjBsXksayhG3EzHcuw/viewform?usp=dialog',
};