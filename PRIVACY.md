# Privacy policy

chamuy0 is a browser extension that scores LinkedIn feed posts for slop. This policy describes exactly what the extension does with your data. There are no accounts and no analytics.

There are two ways to run the extension. With your own TypeSafe API key, nothing goes through us at all. With the free trial or a subscription, post text passes through a small proxy server of ours on its way to TypeSafe, because the trial runs on our key.

## What stays on your device

- Your TypeSafe API key.
- Your training labels and the examples the classifier calibrates with.
- Your settings, including the hide threshold.
- A random token that identifies this install to the proxy, and the plan state that goes with it. This one uses the browser's sync storage, so reinstalling the extension or signing in on another machine keeps a paid plan. Everything else lives in `storage.local`.

All of it lives in your browser profile, and removing the extension deletes it.

## With your own API key

- The text of the posts you view in the LinkedIn feed is sent to `api.typesafe.ai` (TypeSafe) with your API key so the model can score it. When you have labeled posts, up to six recent examples are sent along as reference.
- Nothing reaches our server in this mode.

## With the free trial or a subscription

- The same request goes to our proxy (`chamuy0-api.t-su.workers.dev`), which forwards it to TypeSafe using our key and returns the score. We do not log or store post text or training examples.
- To decide whether a trial can be granted, the proxy records a one-way hash of a few browser properties (platform, browser name and major version, language, timezone, CPU count, and device memory when the browser reports it) together with a truncated network address (the first three octets of an IPv4 address, or the first four groups of an IPv6 address). This is only used to stop one device or network from restarting the trial indefinitely. The raw values are not stored, and the hash is not linked to your name, email, or any account.
- Payments are handled by Mercado Pago on their own checkout page. We receive the preapproval id, its status and the next charge date, which we store next to the random token. Card details never touch the extension or our server, and we do not store your email.
- The token holds no personal data. When browser sync is on, it syncs through your browser account like any other extension setting, so a reinstall does not lose a paid plan.
- A daily counter per token limits how many posts can be scored.

## What never leaves your device

- No browsing history, no LinkedIn profile data, no analytics, no telemetry, no ads, no selling or sharing of data.

## What the extension does on LinkedIn

It reads the feed to find post text and draws a chip next to each post. It does not post, comment, react, message or modify anything on your behalf.

## Third parties

- Scoring is performed by TypeSafe's Jev API. Their handling of the requests follows TypeSafe's own terms and privacy policy (https://typesafe.ai).
- Payments are handled by Mercado Pago (https://www.mercadopago.com.ar).
- We are not affiliated with LinkedIn.

## Children

The extension is not directed at children under 13.

## Changes

Any change to this policy ships with a new version of the extension and is visible in this repository.

## Contact

Open an issue at https://github.com/tsu-ld/chamuy0/issues.
