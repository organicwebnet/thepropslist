# Google Drive Video/File Storage Integration Plan

---

## Overview
This document outlines the technical plan for integrating Google Drive as the storage backend for prop-related videos and files. The goal is to allow users to upload, store, and share media files via their own Google Drive accounts, giving them full control and simplifying file hosting and sharing.

---

## Phase 0: Prerequisites
- Complete and stabilize prop adding and displaying features.
- Review and merge any outstanding PRs related to prop CRUD.

---

## Phase 1: Google Cloud Setup
- Register the app in [Google Cloud Console](https://console.cloud.google.com/).
- Enable the **Google Drive API**.
- Create **OAuth 2.0 credentials**:
  - For mobile: Use type "Android" and "iOS" with correct package/bundle IDs and redirect URIs.
  - For web: Use type "Web application" with correct redirect URIs.
- Configure the OAuth consent screen (app name, logo, privacy policy, etc.).
- Note the **Client ID** and **Client Secret** for use in the app.

---

## Phase 2: App Authentication Integration
- Add Google OAuth flow using [`expo-auth-session`](https://docs.expo.dev/versions/latest/sdk/auth-session/) or [`react-native-app-auth`](https://github.com/FormidableLabs/react-native-app-auth).
- Request the following scopes:
  - `https://www.googleapis.com/auth/drive.file` (recommended: allows app to create and access files/folders it creates)
  - `profile` and `email` (for user info, optional)
- On first upload attempt, prompt user to connect Google Drive and authorize the app.
- Store and manage access tokens securely (use Expo SecureStore or similar).
- Handle token refresh and expiration.

---

## Phase 3: Google Drive Folder Management
- On first use, check if the dedicated folder (e.g., "Show Props Videos") exists in the user's Drive:
  - Use `files.list` with `q` parameter to search for folder by name and `mimeType = 'application/vnd.google-apps.folder'`.
  - If not found, create it using `files.create` with `mimeType` set to folder.
- Store the folder ID in your app's user profile or local storage for future uploads.
- (Optional) Create subfolders for each show/prop for better organization.
- Ensure the app only requests access to files/folders it creates (using the `drive.file` scope).

---

## Phase 4: File Upload & Sharing
- Implement file upload to the Drive folder using the [Google Drive API `files.create`](https://developers.google.com/drive/api/v3/reference/files/create) endpoint with `media` upload.
- Set the `parents` field to the folder ID.
- After upload, set file permissions to "Anyone with the link can view" using the [`permissions.create`](https://developers.google.com/drive/api/v3/reference/permissions/create) endpoint:
  - `type: 'anyone'`, `role: 'reader'`
- Retrieve the file's ID and generate a direct playback/share link:
  - Direct download: `https://drive.google.com/uc?export=download&id=FILE_ID`
  - Web preview: `https://drive.google.com/file/d/FILE_ID/view?usp=sharing`
- Store the link in your database, associated with the prop.

---

## Phase 5: Playback & Sharing in App
- Update prop display screens to show a video player for Drive-hosted videos:
  - Use [`expo-video`](https://docs.expo.dev/versions/latest/sdk/video/) or [`react-native-video`](https://github.com/react-native-video/react-native-video).
  - Pass the direct download URL as the source.
- Add "Share Link" and "Show QR Code" options for each file:
  - Use a QR code library (e.g., [`react-native-qrcode-svg`](https://github.com/awesomejerry/react-native-qrcode-svg)).
- Ensure playback works in-app and via web links.

---

## Phase 6: User Experience & Onboarding
- Add onboarding screens explaining the benefits and privacy of Google Drive integration.
- Provide clear feedback and error handling for uploads, sharing, and playback.
- Allow users to manage (view/remove) their uploaded files from within the app (using Drive API `files.list` and `files.delete`).
- UI copy example for onboarding:
  > "We'll store your prop videos/files in your own Google Drive. You control access and sharing. This keeps your media safe and private."

---

## Phase 7: Testing & Documentation
- Test the full flow on both iOS and Android (and web, if needed).
- Test with different Google accounts and Drive permission scenarios.
- Document the setup and user flow in your project's README/PRD.
- Gather user feedback and iterate on UX.

---

## Phase 8: Launch
- Announce the new feature to users.
- Monitor for issues and provide support.

---

## References & Resources
- [Google Drive API Docs](https://developers.google.com/drive/api/v3/about-sdk)
- [Expo AuthSession Docs](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [react-native-app-auth](https://github.com/FormidableLabs/react-native-app-auth)
- [expo-video](https://docs.expo.dev/versions/latest/sdk/video/)
- [react-native-qrcode-svg](https://github.com/awesomejerry/react-native-qrcode-svg)

---

## Notes
- For privacy, always use the least-permissive OAuth scopes possible.
- Consider Drive API quotas and user bandwidth limits for large files.
- If you need to support team/shared Drives, additional API logic is required. 