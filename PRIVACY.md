# Privacy Policy - Kaltas: Student Discounts (formerly Iskolar)

Last updated: November 5, 2026

Kaltas: Student Discounts does not collect, store, transmit, or sell any personal data.

**What the extension does**

When you click the toolbar icon, Kaltas: Student Discounts reads the hostname of your current tab (via the `activeTab` permission) and compares it with a list of student offers. The comparison happens entirely on your device. The hostname and the pages you visit are never sent anywhere.

**Toolbar badge**

Kaltas: Student Discounts shows a green dot on its toolbar icon when the site you are on has a
student offer. This uses Chrome's `declarativeContent` feature: the extension
gives Chrome a list of domains from the bundled offers file, and Chrome itself
decides whether the current page matches and swaps the icon. Kaltas: Student Discounts does not
see the pages you visit, does not read your tabs or history, and does not store
or send anything.

**Offers list**

The extension uses the bundled `offers.json` file. It does not make requests
to update offers and does not send browsing data to the project. Offer updates
are reviewed by the project owner and shipped in a new extension release.

**What we do not do**

- No analytics, tracking, advertising, or accounts.
- No collection of browsing history or the pages you visit.
- No sharing or selling of data, because none is collected.

**Reports and optional services**

The "Report an outdated offer" link opens GitHub in a new tab. Any information
you submit there is handled by GitHub, not Kaltas: Student Discounts.

The footer includes an optional tip link that opens PayPal in a new tab. Any
payment or information you provide there is handled by PayPal, not Kaltas: Student Discounts.
The extension itself does not process payments.

The optional AI assistant is not part of the extension package and is disabled
unless the project owner deploys the companion service. If enabled, it receives
only the question and the selected offer's text so it can explain that offer.
It does not receive the current hostname or browsing history. The companion
service uses Google Gemini, which processes that request according to Google's
terms and privacy policy.

**Contact**

Questions or issues: https://github.com/miconvr/iskolar/issues