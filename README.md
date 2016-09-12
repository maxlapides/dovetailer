# Dovetailer: HTML Email Generator

## Features

- HTML and text versions
- [Handlebars](http://handlebarsjs.com) support
- [Sass](http://sass-lang.com) support
- [Reset styles](#reset-styles)
- [Responsive support](#responsive-styles)
- HTML minification
- [Development build](#development-and-production-builds) for more efficient development and debugging
- Automatic special character replacement

  - In HTML version, converts special characters to HTML entities
  - In text version, replace non-ASCII characters with ASCII equivalents (ex: smart "curly" quotes are replaced by dumb quotes)

- [CSS Transformations](#css-transformations)

## Installation

```
npm install dovetailer --save-dev
```

More info coming soon...

## Writing Your Own Emails

1. In the `templates` folder, add another folder for the new template you want to build. Name this folder whatever you want to call your email template.

2. In that folder, add the following files:

  - `html.handlebars`: your Handlebars template for the HTML version
  - `style.scss`: your main Sass file (these styles will be automatically inlined)
  - `text.handlebars`: your Handlebars template for the text version
  - `content.json`: the data file used by Handlebars to compile your template

    Optional files:

  - `reset.scss`: your Sass file for custom reset styles (see [Reset Styles](#reset-styles) below)

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

Make sure to read the ["known issues"](https://github.com/hail2u/node-css-mqpacker#known-issue) section of the MQPacker documentation to understand how this media query packing can affect your CSS.

## Handlebars Partials

- You can register partials with handlebars through the HTML Email Builder.
- To do this, just pass the absolute path of the folder that all of your partials are in to the main function along with your templates path.
- The HTML Email Builder will take every file in this folder and register an associated partial.
- If the file name is `myPartial.html` a partial will get registered as `myPartial`. Extension types do not matter.
- More on Handlebars partials [here](http://handlebarsjs.com/partials.html).

## Known Issues

- If you rename a directory in the `templates` folder while Gulp is running, it will crash Gulp.
- Adding a directory in the `templates` folder while Gulp is running causes an infinite loop?
- Relative image paths don't work (I'll be adding support for this in the future)

## Roadmap

### v 0.3.1

- Support `@import` in CSS
- Replace attributes like `""blah""` with `'"blah"'`
- Ignore specified template folder(s) - underscore in front of folder name?
- Support `.hbs` naming syntax for Handlebars files
- Update common reset styles
- Remove `css` npm module

### Future

- Use ES6 classes for main modules (handlebars, styles, templateInfo, etc.)
- Move pseudo-classes to `<head>` (ex: `hover` styles)
- [Outlook margin support](https://www.emailonacid.com/blog/article/email-development/outlook.com-does-support-margins/)
- Add command line flags:

  - Beautifying production HTML
  - Disabling development version

- Automatically ensure that there are no empty table cells:

  - Add `` to empty table cells
  - Ensure the table cell has `line-height: 0` and `font-size: 0`

- Resolve adding/renaming templates issues

- For all HTML tags - inject width/height attributes

  - pull from CSS
  - for `<img>` tags, if width/height not specified in CSS, find actual image size

- tables:

  - width, height attributes - pull from CSS
  - cellpadding, cellspacing, border = 0
  - attributes ordered: width, height, cellpadding, cellspacing, border

- For all images, add `border="0"`

- For all `<a>` anchor tags, add `target="_blank"`
- Automatically convert responsive styles to use the `[class="..."]` syntax
- Strip unnecessary CSS classes/IDs from HTML
- Lossless image compression
- More advanced Handlebars support
- Unit tests
- Move common build folder elsewhere
- BrowserSync - CSS injection on dev build
- Relative paths for images
- Automatic Gmail Promotions tab code generation
- em/rem to px converter
- Warnings:

  - relative img references
  - `<link>` tags
  - `<script>` tags
  - W3C validation
