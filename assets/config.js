/* ---------------------------------------------------------------
   Site configuration — the only file you need to edit to go live.
   --------------------------------------------------------------- */
window.SITE_CONFIG = {

  /* CONTACT FORM ------------------------------------------------
     Your Gmail address never appears in this repo or in the page
     source. It lives only in the form relay's dashboard.

     To activate:
       1. Create a free form at https://formspree.io (or Web3Forms).
       2. Point it at your Gmail address in their dashboard.
       3. Paste the endpoint URL below.
     Until this is set, the form stays disabled with a notice.        */
  contactEndpoint: "",           // e.g. "https://formspree.io/f/xxxxxxxx"

  /* JOURNAL QUICK-ENTRY ----------------------------------------
     Used by admin.html to commit new entries straight to
     data/journal.json through the GitHub API.
     Fill these in after the repo exists.                            */
  repoOwner:  "",                // e.g. "hunterbickel"
  repoName:   "",                // e.g. "personal-website"
  repoBranch: "main",
  journalPath: "data/journal.json"
};
