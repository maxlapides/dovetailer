[![npm version](https://badge.fury.io/js/dovetailer.svg)](https://badge.fury.io/js/dovetailer)

# Dovetailer: HTML Email Generator

## Features

* HTML and text versions
* [Nunjucks](https://mozilla.github.io/nunjucks/) support
* [Sass](http://sass-lang.com) support
* [Markdown](http://commonmark.org/help/) support
* [Reset styles](#reset-styles)
* [Responsive support](#responsive-styles)
* HTML minification
* [Development build](#development-and-production-builds) for more efficient development and debugging
* Automatic special character replacement
  * In HTML version, converts special characters to HTML entities
  * In text version, replace non-ASCII characters with ASCII equivalents (ex: smart "curly" quotes are replaced by dumb quotes)
* [CSS Transformations](#css-transformations)
* [HTML Transformations](#html-transformations)

## Installation

```
npm install dovetailer --save-dev
```

## Usage

Dovetailer is one function, which compiles all of the emails in your templates directory.

Parameters:

* `templatesPath` (STRING, required): filepath to your email templates
* `options` (OBJECT, optional):
  * `doctype` (STRING): a custom doctype if the HTML4 doctype isn't sufficient

```javascript
const compiler = require('dovetailer')
return compiler(templatesPath, options)
```

There's an `example-gulpfile.js` and an `example-config.js` in this repository that you can use as a base for your development environment. It requires Gulp and BrowserSync. I think this a great way to use Dovetailer in development, but you can use Dovetailer however you like. _Coming soon_: a starter project that you can fork to get going quickly.

## Writing Your Own Emails

1.  In the `templates` folder, add another folder for the new template you want to build. Name this folder whatever you want to call your email template.

2.  In that folder, add the following files:

* `html.njk`: your Nunjucks template for the HTML version
* `style.scss`: your main Sass file (these styles will be automatically inlined)
* `text.njk`: your Nunjucks template for the text version
* `context.json`: the data file used by Nunjucks to compile your template

Optional files:

* `reset.scss`: your Sass file for custom reset styles (see [Reset Styles](#reset-styles) below)

You can also add additional files and folders in your template directory such as Sass partials. See the `example` template for, well, an example.

## Development and Production Builds

The development and production versions of your email should always render exactly the same (see below) in the browser. There is no development build of the text version, only the HTML version.

The main difference between the development build and the production build is the development build references external stylesheets. The external stylesheets have sourcemaps that point back to the original Sass files. This makes it much easier to develop and debug your emails.

You should use the development build when you're working on coding an email and you're viewing it in a web browser. You should never try to actually send a development build, even just as a test to yourself. It definitely won't work at all.

### Great, but...the development and production builds aren't rendering the same for me!

The production build moves the media queries into the head and groups the styles together by media query. Since CSS is order dependent, in some cases this can produce unexpected results. However, if you follow best practices and keep your Sass organized, you can avoid these issues.

## Reset Styles

Including "reset" styles helps ensure that your emails render the same across all email clients. There are two different types of reset styles: reset styles that need to be included in the `<head>` of the email and reset styles that need to be inlined. Generally, `<head>` reset styles are client-specific hacks.

Accordingly, in the included `common` folder, there are two reset files named `reset-head.scss` and `reset-inline.scss`. These are the default sets of reset styles that are included automatically in every email. These files are the result of our research and have been thoroughly tested.

This requires no configuration, but if you want to specify your own set of reset styles for an individual email, you can do so by adding files named `reset-head.scss` and/or `reset-inline.scss` to your email's template folder.

## Responsive Styles

If you want to build a responsive email, you're going to need to use media queries. Since it's impossible to inline media queries, your responsive styles will be injected into the `<head>` of your HTML.

No extra configuration required! Your media queries will automatically be extracted from your CSS and injected. Also, if you have multiple of the same media query in your stylesheet, the selectors will all be grouped together into a single media query.

## CSS Transformations

### `!important` directive

For styles in media queries to take any effect in HTML emails, they need to override the internal styles. So, the compiler automatically adds the `!important` directive to all styles in media queries.

### Autoprefixer

All compiled Sass files are also run through [Autoprefixer](https://github.com/postcss/autoprefixer), which in most cases will actually act as a minifier by removing extraneous vendor-prefixed styles.

### MQ Packer

Media query declarations in the same media query rule are packed into one media query rule using [CSS MQPacker](https://github.com/hail2u/node-css-mqpacker). This enables you to nest media queries inside of any style rule in Sass without having redundant media query rules in your compiled CSS.

## HTML Transformations

### tables

Tables (`<table>`) always get the following HTML attributes:

* `cellpadding="0"`
* `cellspacing="0"`
* `border="0"`

Empty table cells (`<td>`) are automatically filled with a non-breaking space (`&nbsp;`). An "empty" table cell is defined to be any table cell that contains either no characters or whitespace only.

### links

Anchor tags (`<a>`) always get the following HTML attributes:

* `target="_blank"`

### imgs

Images (`<img>`) always get the following HTML attributes:

* `border="0"`

Any `width` and `height` styles are always applied to `<img>`s as width/height HTML attributes.

Dovetailer does its best to look up the dimensions of any `<img>` image. It will automatically inject those dimensions as `width`/`height` HTML attributes as well as `width`/`height` inline CSS styles. If the image name ends in `@2x`, it will assume the image is retina quality, and divide the dimensions in half. Similarly, `@3x` images will have dimensions divided by 3. If you specify width/height values for an `<img>` using CSS, the natural dimensions are overridden. Image dimensions are cached; if you want to invalidate the cache you can delete/modify `cache/images.json`.

## Known Issues

* If you rename a directory in the `templates` folder while Gulp is running, it will crash Gulp.
* Adding a directory in the `templates` folder while Gulp is running causes an infinite loop?

## Roadmap

* Improve error handling of email compiles that result in `undefined` output
* Improve caching mechanism for image dimensions
* Support `@import` in CSS
* Replace attributes like `""blah""` with `'"blah"'`
* [Outlook margin support](https://www.emailonacid.com/blog/article/email-development/outlook.com-does-support-margins/)
* Add command line flags:
  * Beautifying production HTML
  * Disabling development version
* Automatically ensure that empty table cells have `line-height: 1px` and `font-size: 1px`
* Resolve adding/renaming templates issues
* table attributes ordered: width, height, cellpadding, cellspacing, border
* Automatically convert responsive styles to use the `[class="..."]` syntax
* Move common build folder elsewhere
* BrowserSync - CSS injection on dev build
* Automatic Gmail Promotions tab code generation
* em/rem to px converter
* Warnings:
  * relative img references
  * `<link>` tags
  * `<script>` tags
  * W3C validation
