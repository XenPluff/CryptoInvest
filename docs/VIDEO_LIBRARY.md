# Website video library

The `/videos` page contains five real MP4 motion-graphics films, with matching
JPEG posters, English WebVTT captions and downloadable text transcripts. A
homepage preview, header/footer links and contextual deposit/withdrawal links
lead to the collection. Guide links can select a film directly using its hash.

| Film | Duration | Link |
| --- | --- | --- |
| Meet AUREON | 32 seconds | `/videos#introduction` |
| Set up your account | 48 seconds | `/videos#getting-started` |
| Understand the deposit process | 56 seconds | `/videos#deposit-guide` |
| Request and track a withdrawal | 48 seconds | `/videos#withdrawal-guide` |
| A clearer perspective | 20 seconds | `/videos#a-clearer-perspective` |

The videos use original Canvas graphics, the project's existing DM Sans and
Cormorant Garamond fonts, and an original synthesized ambient score. There is no
spoken narration, licensed stock footage, external video embed, tracking player,
real investor data, account credentials or embedded deposit address. Visual
interface panels are labeled as illustrations/process previews. Use the live
workspace for current supported networks, receiving addresses and funding status.

The brand film introduces the product without quoting returns, asset balances,
licensing, external custody or independent-review claims. The existing
[legal review brief](reviews/LEGAL_BRIEF.md) still applies to any paid investment
advertising or financial promotions. This work does not publish ads on external
networks or establish legal approval of the offering.

## Playback and accessibility

One native HTML video player serves the selected film, uses `preload="none"`,
plays inline and never autoplays on page load or selection. Selecting a chapter
is an explicit playback action. The collection supports keyboard selection,
native playback controls, caption tracks, full text transcripts, chapter seeking
and MP4/text downloads. Poster artwork appears before playback. All information
is included as text in the transcript; the soundtrack conveys no instructions.
Browser autoplay restrictions may require use of the native play button.

All media is served from `public/videos/` on the same origin. Keep this path in
the deployment output. MP4 uses H.264/yuv420p video, AAC audio and `faststart`
metadata for browser playback. The player defers MP4 loading with `preload="none"`;
poster images and caption tracks load independently.

## Editing and regenerating

1. Edit scripts/chapters in [video content](../lib/video-content.ts).
2. Edit the visual stage in [stage.html](../scripts/videos/stage.html).
3. With dependencies installed, FFmpeg with `libx264`/AAC and Chromium available,
   run `npm run videos:render`. Set `CHROMIUM_PATH` if needed. Regenerate one film
   with `npm run videos:render -- --only=deposit-guide`.
4. Check the generated MP4, poster, caption and text files together. Update the
   homepage duration if changing the introduction's length. Never publish a new
   script while leaving its old video or captions in place.
5. Run the production build and browser media tests:
   `npx playwright test tests/e2e/videos.spec.ts` against a running website.

The offline renderer advances a deterministic timeline at 24 frames per second,
renders 1280×720 frames in Chromium, pipes them to FFmpeg, synthesizes the score,
then writes posters/captions/transcripts from the same script. No paid generation
service or API key is required. Unfinished `.rendering.mp4` files must not be
committed. Real security findings, legal opinions and operator intake stay private.

The deposit and getting-started guides have been regenerated for hashless deposit
reporting and the optional identity review for deposits. The deposit guide no
longer asks investors to paste a blockchain hash; captions, transcript and
process-preview graphics match the current confirmation-only report form.
