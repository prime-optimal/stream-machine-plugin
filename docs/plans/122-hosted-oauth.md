# Verify hosted Twitch OAuth

Build a standalone private Sites test using the earlier TwitchCon OAuth implementation. Keep Stream Machine plugin code, manifests, and installed connections unchanged.

Track work in [issue #122](https://github.com/prime-optimal/stream-machine-plugin/issues/122).

1. Reuse the server-side OAuth service, encrypted D1 storage, and security tests.
2. Use Sites identity for record ownership and a responsive connection page.
3. Publish the isolated Site and provide its exact Twitch redirect URL.
4. Verify authorization, status persistence, and disconnect after the user registers the redirect URL and completes consent.

The new Site is `appgprj_6ae8040442d481918f55ca79cca3b9b2`. Its callback is `https://stream-machine-oauth-test.tinycocoa22.chatgpt.site/api/twitch/callback`.

The original Stream Makeover Site remains unchanged. Hosted Twitch authorization does not establish a hosted MCP connection or prove plugin support on mobile. Those changes require separate work.

Sites source is maintained through its supported source repository workflow in `docs/hosted-oauth-site/`. Runtime secrets belong in Sites configuration, never in source or reports. Browser consent and mobile-device verification require the user.
