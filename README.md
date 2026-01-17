# BlueSky Edit
Browser extension to edit posts on BlueSky.
I heard some people wanted an edit button, right on the bsky.app site, so I made one.

**Features:**
- **Edit Posts:** You can change the content of your bsky posts, right from the post menu.
- **Add & Remove All The Features:** Images, links and hashtags can be added or removed, quotes can be removed.   
- **Bsky Look & Feel:** Fits right in as close as I could get it. Supports Light, Dark, and Dim themes. 

**Note:**
- This app requires use of an App Password from your bsky settings to use.
- To satisfy the BlueSky (AT Protocol) specifications, this extension performs an "atomic swap" (Delete & Repost). This allows the post to retain its original URL/address. However, because it is technically a new post record, and because of bsky's protections against bait-and-switch editing, **existing likes, reposts, and quotes will be reset**. The post timestamp will also update to the moment you save your edits.

**Privacy & Security:**
- Your BlueSky handle and App Password are stored securely using `chrome.storage.local`.
- No data is ever sent to external servers other than directly to the official BlueSky API.
- Open source code at my GitHub.

# Dev Notes
## Building distribution files
- Chrome: `npm run dist:chrome` 
- Firefox: `npm run dist:firefox`