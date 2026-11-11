# Privacy Policy - Kaltas

Last updated: November 12, 2026

Kaltas does not collect, store, or sell any personal data. To keep its offers list current, it requests one public file from GitHub, which means GitHub can see your IP address, as any website you visit can. See "Offers list" below.

**What the extension does**

When you click the toolbar icon, Kaltas reads the hostname of your current tab (via the `activeTab` permission) and compares it with a list of student offers. The comparison happens entirely on your device. The hostname and the pages you visit are never sent anywhere.

**Settings saved on your device**

The popup remembers a few settings in your browser's local storage for this
extension: light or dark mode and whether the browse list or footer is hidden.
These settings stay on your device, are never sent anywhere, and are
removed if you uninstall the extension.

**Toolbar badge**

Kaltas shows a green dot on its toolbar icon when the site you are on has a
student offer. This uses Chrome's `declarativeContent` feature: the extension
gives Chrome a list of domains from the offers list (see "Offers list" below), and Chrome itself
decides whether the current page matches and swaps the icon. Kaltas does not
see the pages you visit, does not read your tabs or history, and does not store
or send anything about them.

**Offers list**

When you open the popup, and when Chrome starts or the extension updates, Kaltas requests one public file, `offers.json`, from GitHub (`raw.githubusercontent.com/miconvr/kaltas/main/offers.json`), so new and corrected offers reach you without waiting for a store update. This is an ordinary web request: GitHub, like any website, can see your IP address and the standard information a browser sends with any request. The request does not include the site you are on, your tabs, your history, or any account or identifier from the extension, and no cookies are sent. If GitHub cannot be reached or the file looks wrong, the extension uses a saved copy or the offers file bundled with the extension. The popup keeps a copy of the last good offers list in local storage on your device. Offer changes are reviewed and merged by the project owner before they appear in that file. The file contains offers only, never code.

**What we do not do**

- No analytics, tracking, advertising, or accounts.
- No collection of browsing history or the pages you visit.
- No sharing or selling of data, because none is collected.

**Reports**

The "Report an outdated offer" link opens GitHub in a new tab. Any information
you submit there is handled by GitHub, not Kaltas.

**Contact**

Questions or issues: https://github.com/miconvr/kaltas/issues