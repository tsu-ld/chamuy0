# Store submission copy

Privacy policy URL: https://github.com/tsu-ld/chamuy0/blob/main/PRIVACY.md

## Single purpose

Classify LinkedIn feed posts for slop and optionally hide the highest-scoring ones.

## Chrome Web Store

Summary (132 chars max):
"Score every LinkedIn post for slop and hide the worst ones. Free 1-day trial, no setup."

Detailed description:

chamuy0 reads your LinkedIn feed and puts a small chip on every post: the slop score out of 10 and the verdict. Click the chip to see the signals behind the score — engagement bait, humblebrag, AI generic, buzzwords, broetry, fabricated story, manufactured hook, rage bait.

You can train it: label a post clean, borderline or slop and the next classifications use your labels as reference. Everything stays in your browser.

Feed cleanup: set a threshold and posts at or above it get banished with a stamp animation into a thin marker with a Show button. Nothing is deleted, everything is reversible.

Requirements: a free 1-day trial starts on install, no setup. After it you can subscribe in pesos (ARS 3.000/month or ARS 15.000/year) through Mercado Pago, no account needed, or use your own TypeSafe API key for free. Jev is the decision model that does the scoring; get a key at typesafe.ai. Cost with your own key is about $0.042 per million input tokens; a full day of scrolling costs a fraction of a cent.

Privacy: your key and labels never leave your browser profile. With your own key the only thing sent out is the text of the post being scored, to api.typesafe.ai. In trial or subscription mode the same request passes through our proxy (chamuy0-api.t-su.workers.dev) on its way to TypeSafe. No analytics, no accounts.

Open source, MIT licensed: https://github.com/tsu-ld/chamuy0

Currently works on LinkedIn only. More platforms planned.

Category: Productivity
Language: English

Permission justifications:
- `storage`: saves your API key, labels, settings and the plan token in the browser profile.
- Host `https://www.linkedin.com/*`: reads feed post text to classify it.
- Host `https://api.typesafe.ai/*`: sends post text for scoring with your own key.
- Host `https://chamuy0-api.t-su.workers.dev/*`: sends post text for scoring during the free trial or a subscription, and reads the plan status.

Data usage disclosure: website content (post text the user views) is transmitted to api.typesafe.ai, and during the trial or a subscription through our proxy to the same third party, solely to provide the core classification feature. Authentication information (the user's own API key, or the random plan token for the trial and subscription) is stored locally and transmitted for that purpose. For trial abuse control only, the proxy stores a one-way hash of a few browser properties and a truncated network address; the raw values are not stored. Payments are handled by Mercado Pago on their own page; we receive the preapproval id, its status and the next charge date and do not store the email. Data is not sold, not used for advertising, and not used for creditworthiness or lending.

## Firefox (addons.mozilla.org)

Name: chamuy0
Summary (250 chars max):
"Score every LinkedIn post for slop and hide the worst ones. A free 1-day trial starts on install, no setup; after it, subscribe in pesos or use your own TypeSafe API key."

Category: Productivity
License: MIT

Notes for reviewers: a free 1-day trial starts on install with no setup, so the extension classifies posts out of the box. After the trial it needs either a Mercado Pago subscription in pesos (ARS 3.000/month or ARS 15.000/year, checkout opened from the settings popup) or a TypeSafe API key (early access, https://typesafe.ai). To test without paying: load the extension, open linkedin.com and click a chip to see a score from the trial, then open the settings popup and paste a key to test the bring-your-own-key path. `dev/fixture-feed.html` in the repository mimics the feed DOM with fixture posts for offline testing.
