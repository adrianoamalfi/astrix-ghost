# Security Policy

## Supported versions

Only the latest release of Astrix is supported with security updates.

## Reporting a vulnerability

Please **do not** open a public issue for security problems. Report them
privately via [GitHub Security Advisories](https://github.com/adrianoamalfi/astrix-ghost/security/advisories/new)
or by email to <adrianoamalfi@gmail.com>.

You can expect an acknowledgement within a few days. Since a Ghost theme
runs templates and client-side JavaScript on your readers' pages, reports
about XSS via theme templates or unsafe handling of user-controlled content
are particularly appreciated.

## Threat model notes

### Admin-controlled Design settings

A few theme Design settings accept free-form values that are rendered into
the page — most notably `social_custom_url`, which becomes a link `href`.
Ghost custom settings support only the types `select | boolean | color |
image | text` and provide **no** server-side pattern/URL validation, and
Handlebars has no in-template way to check a URL's protocol. It is therefore
possible for an administrator to enter a `javascript:` or `data:` URL that
would execute when the link is clicked.

This is treated as a **low-severity, admin-only** issue: setting these
values already requires Ghost Admin access, and any administrator can
already run arbitrary JavaScript through Ghost's built-in **Code Injection**
settings. The theme does not add a privilege boundary that this could cross.
Only enter Design-setting URLs you trust, and restrict Ghost Admin accounts
accordingly.
