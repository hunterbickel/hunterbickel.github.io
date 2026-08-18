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
      .replace(/`([^`]+)`/g, function (_, c) {
        return '<code>' + c + '</code>';
      })
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, label, href) {
        /* href arrives already HTML-escaped from the caller, so quotes are
           entities and cannot break out of the attribute. Escaping again here
           would turn &amp; into &amp;amp; and corrupt query strings. */
        return '<a href="' + safeUrl(href) + '">' + label + '</a>';
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
