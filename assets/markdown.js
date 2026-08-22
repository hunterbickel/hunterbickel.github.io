/* ---------------------------------------------------------------
   A deliberately small Markdown subset, rendered safely.

   Supported: paragraphs, ## headings, > blockquotes, - and 1. lists,
   --- rules, **bold**, *italic*, `code`, [links](url).

   Everything is HTML-escaped BEFORE any formatting is applied, and
   link targets are restricted to http/https/mailto/relative, so entry
   text can never inject markup or a javascript: URL.
   --------------------------------------------------------------- */
window.renderMarkdown = (function () {
  "use strict";

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safeUrl(raw) {
    var url = String(raw).trim();
    if (/^(https?:|mailto:)/i.test(url)) return url;         // absolute, allowed schemes
    if (/^[^a-z0-9+.-]*[a-z0-9+.-]+:/i.test(url)) return "#"; // any other scheme -> blocked
    return url;                                               // relative / anchor
  }

  /* Inline formatting. Input is already escaped. */
  function inline(text) {
    return text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, src) {
        return '<img src="' + safeUrl(src) + '" alt="' + alt +
               '" loading="lazy" decoding="async">';
      })
      .replace(/`([^`]+)`/g, function (_, c) {
        return '<code>' + c + '</code>';
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
        /* href arrives already HTML-escaped from the caller, so quotes are
           entities and cannot break out of the attribute. Escaping again here
           would turn &amp; into &amp;amp; and corrupt query strings. */
        var url = safeUrl(href);
        /* Links that leave the site open in a new tab; in-page anchors and
           relative links stay put. noreferrer keeps the referring URL out
           of the destination's logs. */
        var away = /^https?:/i.test(url);
        return '<a href="' + url + '"' +
               (away ? ' target="_blank" rel="noopener noreferrer"' : '') +
               '>' + label + '</a>';
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  }

  function renderMarkdown(src) {
    var blocks = escapeHtml(src == null ? "" : src)
      .replace(/\r\n/g, "\n")
      .split(/\n{2,}/);

    var out = [];

    blocks.forEach(function (block) {
      var b = block.trim();
      if (!b) return;

      if (/^---+$/.test(b)) { out.push("<hr>"); return; }

      /* An image block: a ![](src) line, then optional caption lines, repeated.
         A caption belongs to the image directly above it, so write them with
         no blank line between — a blank line starts a new block and leaves the
         caption stranded as a paragraph.

         Two images in one block are laid out side by side, each keeping its
         own caption. Captions run through inline() so links inside survive. */
      if (/^!\[[^\]]*\]\([^)\s]+\)/.test(b)) {
        var lines = b.split("\n");
        var figs = [];
        var pending = null;
        var flush = function () {
          if (!pending) return;
          figs.push('<figure><img src="' + pending.src + '" alt="' + pending.alt +
                    '" loading="lazy" decoding="async">' +
                    (pending.cap.length
                       ? '<figcaption>' + inline(pending.cap.join(" ")) + '</figcaption>'
                       : '') +
                    '</figure>');
          pending = null;
        };
        lines.forEach(function (ln) {
          var m = /^!\[([^\]]*)\]\(([^)\s]+)\)\s*$/.exec(ln.trim());
          if (m) { flush(); pending = { alt: m[1], src: safeUrl(m[2]), cap: [] }; }
          else if (pending && ln.trim()) { pending.cap.push(ln.trim()); }
        });
        flush();
        out.push(figs.length === 2
          ? '<div class="figure--pair">' + figs.join("") + '</div>'
          : figs.join(""));
        return;
      }

      if (/^##\s+/.test(b)) {
        out.push("<h3>" + inline(b.replace(/^##\s+/, "")) + "</h3>");
        return;
      }

      if (/^&gt;\s?/.test(b)) {
        var quoted = b.split("\n")
          .map(function (l) { return l.replace(/^&gt;\s?/, ""); })
          .join(" ");
        out.push("<blockquote><p>" + inline(quoted) + "</p></blockquote>");
        return;
      }

      var lines = b.split("\n");

      if (lines.every(function (l) { return /^\s*[-*]\s+/.test(l); })) {
        out.push("<ul>" + lines.map(function (l) {
          return "<li>" + inline(l.replace(/^\s*[-*]\s+/, "")) + "</li>";
        }).join("") + "</ul>");
        return;
      }

      if (lines.every(function (l) { return /^\s*\d+\.\s+/.test(l); })) {
        out.push("<ol>" + lines.map(function (l) {
          return "<li>" + inline(l.replace(/^\s*\d+\.\s+/, "")) + "</li>";
        }).join("") + "</ol>");
        return;
      }

      out.push("<p>" + inline(lines.join(" ")) + "</p>");
    });

    return out.join("\n");
  }

  renderMarkdown.escapeHtml = escapeHtml;
  return renderMarkdown;
})();
