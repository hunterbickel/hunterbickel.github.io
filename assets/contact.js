/* ---------------------------------------------------------------
   Contact form.

   Posts to whatever relay endpoint is set in assets/config.js. The
   destination address lives in that service's dashboard, never in
   this repo or the rendered page — so no crawlable email anywhere.
   --------------------------------------------------------------- */
(function () {
  "use strict";

  var form   = document.getElementById("contact-form");
  var status = document.getElementById("cf-status");
  var submit = document.getElementById("cf-submit");
  if (!form) return;

  var endpoint = (window.SITE_CONFIG && window.SITE_CONFIG.contactEndpoint || "").trim();

  function say(msg, tone) {
    status.textContent = msg;
    status.setAttribute("data-tone", tone || "");
    status.hidden = false;
  }

  if (!endpoint) {
    submit.disabled = true;
    say("The contact form isn't connected yet — add your form endpoint to assets/config.js to switch it on.", "err");
    return;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (form.elements._gotcha && form.elements._gotcha.value) return;  // bot

    var payload = {
      name:    form.elements.name.value.trim(),
      email:   form.elements.email.value.trim(),
      subject: form.elements.subject.value.trim(),
      message: form.elements.message.value.trim()
    };

    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      say("Please fill in every field before sending.", "err");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      say("That email address doesn't look right.", "err");
      return;
    }

    submit.disabled = true;
    say("Sending…");

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        form.reset();
        say("Thanks — your message is on its way. I'll get back to you.", "ok");
      })
      .catch(function (err) {
        say("Something went wrong sending that (" + err.message + "). Please try again in a moment.", "err");
      })
      .then(function () { submit.disabled = false; });
  });
})();
