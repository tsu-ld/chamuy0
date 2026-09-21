# Store submission copy

Privacy policy URL: https://github.com/tsu-ld/chamuy0/blob/main/PRIVACY.md

## Single purpose

Classify LinkedIn feed posts for slop and optionally hide the highest-scoring ones.

## Chrome Web Store

Summary (132 chars max):
"Score every LinkedIn post for slop and hide the worst ones. Your key and labels stay in your browser."

Detailed description:

chamuy0 reads your LinkedIn feed and puts a small chip on every post: the slop score out of 10 and the verdict. Click the chip to see the signals behind the score — engagement bait, humblebrag, AI generic, buzzwords, broetry, fabricated story, manufactured hook, rage bait.

You can train it: label a post clean, borderline or slop and the next classifications use your labels as reference. Everything stays in your browser.

Feed cleanup: set a threshold and posts at or above it get banished with a stamp animation into a thin marker with a Show button. Nothing is deleted, everything is reversible.

Requirements: a TypeSafe API key for Jev, the decision model that does the scoring. Get one at typesafe.ai. Cost is about $0.042 per million input tokens; a full day of scrolling costs a fraction of a cent.

Privacy: your key and labels never leave your browser profile. The only thing sent out is the text of the post being scored, to api.typesafe.ai. No analytics, no accounts, no server.

Open source, MIT licensed: https://github.com/tsu-ld/chamuy0

Currently works on LinkedIn only. More platforms planned.

Category: Productivity
Language: English

Permission justifications:
- `storage`: saves your API key, labels and settings in the browser profile.
- Host `https://www.linkedin.com/*`: reads feed post text to classify it.
- Host `https://api.typesafe.ai/*`: sends post text for scoring.

Data usage disclosure: website content (post text the user views) is transmitted to api.typesafe.ai — a third party — solely to provide the core classification feature. Authentication information (the user's own API key) is stored locally and transmitted to the same third party for that purpose. Data is not sold, not used for advertising, and not used for creditworthiness or lending.

## Firefox (addons.mozilla.org)

Name: chamuy0
Summary (250 chars max):
"Score every LinkedIn post for slop and hide the worst ones with a stamp. Your API key and labels stay in your browser; only the post text is sent for scoring."

Category: Productivity
License: MIT

Notes for reviewers: the extension needs a TypeSafe API key (early access, https://typesafe.ai) to classify posts. Without a key it shows a setup page and stays inert. To test: load the extension, open the settings page, paste a key, then open linkedin.com — chips appear on posts. `dev/fixture-feed.html` in the repository mimics the feed DOM with fixture posts for offline testing.
