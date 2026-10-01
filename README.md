# Risk of Rain 2 Build Planner

A browser-based build planner and item reference for *Risk of Rain 2*. Build a loadout, look up item details, and share builds with a link.

## About This Project

This project is based on the original Risk of Rain 2 Build Planner by ScuzzM0nkey. It uses his original code as its foundation, with fixes and item data updates for content released after the original planner stopped receiving updates following the first DLC.

The item database has been updated with newer items. The proc coefficient simulator and Gesture of the Drowned (GotD) calculator have not yet been updated.

## Features

- Browse items and equipment, with descriptions and wiki links.
- Filter the item catalog by rarity/type and by vanilla or DLC content.
- Add items to a build, adjust stack counts, and rearrange picks.
- Save builds in the browser, or import and export build data.
- Share a build using a URL.
- Use the proc coefficient simulator and Gesture of the Drowned cooldown calculator.

## Run Locally

This is a static site and has no build step. Open `index.html` in a browser, or serve the project directory with any static web server. The page loads some libraries and fonts from CDNs, so an internet connection is needed for those resources.

## Publish with GitHub Pages

1. Push the project files to a GitHub repository.
2. Open the repository's **Settings** and select **Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch containing the site (usually `main`) and the `/ (root)` folder, then save.
5. Once deployment completes, open the URL shown in the Pages settings.

No generated output folder or build command is required; `index.html` is at the repository root.

## Using the Planner

- Click or drag an item from the catalog into the build.
- Click a picked item to increase its quantity. On desktop, right-click to decrease it or remove it at quantity one.
- Use the settings checkboxes to choose item types and content, including vanilla items and each supported DLC.
- Save builds to this browser, or use Export and Import to move build data between devices.
- Use Share to create a URL for the current build.

Saved builds are stored in the browser's local storage; they are not uploaded to GitHub or synced between browsers. A shared URL contains the build selection.

## Credits and Licensing

Credit and thanks to ScuzzM0nkey for the original planner and code this project builds upon. The original code was obtained from his website, and no license terms are known. This repository does not include a license or claim to relicense the original code. Please obtain permission from ScuzzM0nkey before publicly redistributing the source.