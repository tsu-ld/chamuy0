# Privacy policy

chamuy0 is a browser extension that scores LinkedIn feed posts for slop. This policy describes exactly what the extension does with your data. It has no server, no account and no analytics.

## What stays on your device

- Your TypeSafe API key.
- Your training labels and the examples the classifier calibrates with.
- Your settings, including the hide threshold.

All of it lives in your browser profile (`storage.local`) and never reaches us. Removing the extension deletes it.

## What leaves your device

- The text of the posts you view in the LinkedIn feed is sent to `api.typesafe.ai` (TypeSafe) with your API key so the model can score it. When you have labeled posts, up to six recent examples are sent along as reference. That is the only thing transmitted.
- No browsing history, no profile data, no identifiers, no analytics, no telemetry, no ads, no selling or sharing of data.

## What the extension does on LinkedIn

It reads the feed to find post text and draws a chip next to each post. It does not post, comment, react, message or modify anything on your behalf.

## Third parties

Scoring is performed by TypeSafe's Jev API. Their handling of the requests follows TypeSafe's own terms and privacy policy (https://typesafe.ai). We are not affiliated with LinkedIn.

## Children

The extension is not directed at children under 13.

## Changes

Any change to this policy ships with a new version of the extension and is visible in this repository.

## Contact

Open an issue at https://github.com/tsu-ld/chamuy0/issues.
