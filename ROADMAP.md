# Roadmap

## Security

- Revisit AniList OAuth for desktop distribution. The app currently accepts a client secret in local runtime config because this is a personal-use app, but a future version should decide whether to use a desktop-safe OAuth flow, a loopback/deep-link callback, or another approach that does not treat a locally stored client secret as confidential.
