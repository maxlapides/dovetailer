# 0.4.2 - December 4, 2016

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
