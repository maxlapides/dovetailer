# 0.7.9 - July 6, 2018

- Fix: do not write emails to file system when calling `compileEmail`

# 0.7.8 - June 18, 2018

- Improve log formatting

# 0.7.7 - June 18, 2018

- Improved file saving logic
- Docs: clarified API
- Deps: upgraded dependencies

# 0.7.6 - June 13, 2018

- New: pass an array of `whitelistSelectors`. These selectors will not be stripped from the HTML. For more information, [see here](https://github.com/codsen/email-remove-unused-css#input-optionswhitelist).
- New: `compileEmail` method added to support compiling a single email without saving to the file system
- Performance: faster file system interactions!

# 0.7.5 - May 17, 2018

- Automatically add `<meta>` tag to prevent iOS 11 scaling (more info: https://litmus.com/blog/what-email-marketers-need-to-know-about-ios-11-and-the-new-iphones)

# 0.7.4 - May 17, 2018

- Autoprefixer now adds `-moz` and `-webkit` for CSS gradients

# 0.7.3 - May 16, 2018

Fixes:

- `options` hash is now optional
- Source maps no longer interfere with production CSS cleanup

# 0.7.2 - May 16, 2018

New: optionally pass a custom doctype

# 0.7.1 - May 16, 2018

Fix: recompile Nunjucks templates without caching

# 0.7.0 - May 16, 2018

BREAKING CHANGES:

- Replaced Handlebars with Nunjucks, so templates should now be `.njk` files
- Renamed `content.json` to `context.json` to conform to Nunjucks community standard
- Dropped support for Node <8

New:

- Added support for `@font-face` in CSS
- Added support for pseudo-classes in CSS: `:hover`, `:visited`, `:active`, `:focus`
- Automatically add recommended `<meta>` tags to `<head>`
- Automatically add hack for Outlook zooming on 120 DPI windows devices

# 0.6.1 - May 11, 2018

- Fix dependency issue

# 0.6.0 - May 11, 2018

- Breaking Change: Markdown support must now be enabled explicitly via the `options` parameter
- Updated syntax to ES6
- Updated ESLint rules, added Prettier

# 0.5.20 - May 1, 2018

- Do not parse content strings that begin with `mailto:` as Markdown

# 0.5.19 - August 8, 2017

- Replace `&quot;` HTML entities in anchor `href`s to support dynamic unsubscribe links

# 0.5.18 - March 10, 2017

- Disable [email-remove-unused-css](https://github.com/code-and-send/email-remove-unused-css) (added in 0.5.10) due to performance issues.

# 0.5.17 - March 8, 2017

- Whitelist `#preview_text` instead of `#preview-text`

# 0.5.16 - March 8, 2017

## Fixes

- Correctly pull image sizes from the cache. Should speed up compile times.

# 0.5.15 - February 21, 2017

## Fixes

- Added `#preview-text` to whitelist so it isn't stripped by the minifier (fixes issue #11)

# 0.5.14 - February 12, 2017

## Fixes

- Allow empty `html.handlebars` and `text.handlebars` files

# 0.5.13 - January 31, 2017

## Fixes

- Table cells that contain only HTML (ex: `<img>`) are no longer treated as empty cells

# 0.5.12 - January 26, 2017

## Features

- Empty table cells (`<td>`) are automatically filled with a non-breaking space (`&nbsp;`). An "empty" table cell is defined to be any table cell that contains either no characters or whitespace only.

# 0.5.11 (for real) - January 23, 2017

The versioning somehow got out of sync on this log. Whoops. Okay here we go.

## Fixes

- Handle non-existent images gracefully

# 0.5.11 - January 3, 2017

## Fixes

- Disable detergent for now as it does not handle URLs properly
- Remove unnecessary duplicate CSS width/height on images (since images also have width/height HTML attributes)

# 0.5.10 - January 3, 2017

## Features

- Anchor tags (`<a>`) always get `target="_blank"`
- Use [detergent](https://github.com/code-and-send/detergent) to clean HTML special characters, clean invisible characters, and improve English style
- Use [email-remove-unused-css](https://github.com/code-and-send/email-remove-unused-css) on production HTML to strip unused CSS
- Updated `reset-head.scss` to include a fix for formatting automatic links on iOS device

## Fixes

- Decode HTML entities in text version

# 0.5.8 - December 26, 2016

## Features

- Recursively import Handlebars partials files

# 0.5.7 - December 24, 2016

## Features

- Automatically determine image sizes and inject those dimensions into the HTML as HTML attributes and inline CSS styles. See README for more information.

# 0.5.5 - December 20, 2016

## Features

- Automatically add default HTML attributes to `table`s and `img`s. See README for more information.
- Example Gulpfile

# 0.5.4 - December 20, 2016

## Features

- CSS sourcemaps
- Add HTML attributes for width/height styles to `<img>`s, `<table>`s, etc.

# 0.5.3 - December 19, 2016

## Fixes

- Newlines are replaced with `<br>` in HTML

# 0.5.2 - December 19, 2016

## Fixes

- Fix for nested JSON content

# 0.5.1 - December 19, 2016

## Fixes

- Support nested JSON content

# 0.5.0 - December 4, 2016

## Features

- All content in `content.json` files is now parsed as Markdown
- Added `yarn.lock` for [Yarn](https://yarnpkg.com/) support

# 0.4.0 - September 11, 2016

# Breaking Changes

- BrowserSync is no longer built-in. This project is just a compiler. More info coming soon...

# 0.3.1 - December 30, 2015

## Features

- Move main methods to publicly-available `index.js`
- ESLint pre-commit hook
- Updated dependencies

# 0.3.0 - June 11, 2015

## Features

- Improved error handling and reporting
- Upgraded all dependencies

# 0.2.2 - February 1, 2015

## Features

- `!important` directive added to all media query styles
- Autoprefixer (add/remove vendor prefixes to CSS rules using values from Can I Use)
- MQ Packer (pack same CSS media query rules into one media query rule)

# 0.2.1 - December 28, 2014

## Features

- Development build that references sourcemapped external stylesheets
- Improved installation process
- Start the compiler using `npm start`
- Improved common reset styles

## Performance Improvements

- Cache compiled common reset styles in memory
- Moved global configuration to global memory

# 0.2 - October 26, 2014

## Performance Improvements

- Major refactor to improve concurrency and extensibility
- Support for inline and header reset styles
