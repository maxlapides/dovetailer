# HTML Email Builder

## Features

* HTML and text versions
* [Handlebars](http://handlebarsjs.com) support
* [Sass](http://sass-lang.com) support
* [Reset styles](#reset-styles)
* [Responsive support](#responsive-styles)
* HTML minification
* [Development build](#development-and-production-builds) for more efficient development and debugging
* In HTML version, converts special characters to HTML entities
* In text version, replace non-ASCII characters with ASCII equivalents (ex: smart ("curly") quotes are replaced by dumb quotes)

## Installation

1. Install Node.js on your computer (if you don't have it already) by going to [nodejs.org](http://nodejs.org), downloading the current version, and then running the installer.

2. Download this repository by downloading the [ZIP file](https://github.com/maxlapides/html-email-generator/archive/master.zip) or by cloning it to your desktop:

    ```bash
    git clone https://github.com/maxlapides/html-email-generator.git
    ```

3. Download required npm modules by opening the project in a Terminal window and running:

    ```bash
    npm install
    ```

4. In the `templates` folder, add another folder for the new template you want to build. Name this folder whatever you want to call your email template.

5. In that folder, add the following files:

    * `html.handlebars`: your Handlebars template for the HTML version
    * `style.scss`: your main Sass file (these styles will be automatically inlined)
    * `text.handlebars`: your Handlebars template for the text version
    * `content.json`: the data file used by Handlebars to compile your template

    Optional files:
    * `reset.scss`: your Sass file for custom reset styles (see [Reset Styles](#reset-styles) below)

    You can also add additional files and folders in your template directory such as Sass partials. See the `example` template for, well, an example.

## How to Run

Open your project directory in a Terminal window.

To compile development and production versions of your emails and then watch for file changes, type this command and press `ENTER`:

```bash
npm start
```

To stop the server: `CMD+C`

Your compiled emails will be saved in the `build` folder at your project root. Then, the BrowserSync server will start and the `build` directory will be automatically opened in a browser window.

## BrowserSync

BrowserSync will run a server at http://localhost:3000. This server points to the `build` directory as its root. BrowserSync automatically refreshes your emails in the browser.

So, for example, if you have a template named `scrappy-chipmunks`, you should open this URL to test your email as you work: `http://localhost:3000/scrappy-chipmunks/scrappy-chipmunks.html`.

If you're using Coda, make sure to disable the automatic refreshes in the preview pane. Also, make sure to manually change the URL of the preview pane to use the `localhost:3000` URL.

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

## Known Issues

* If you rename a directory in the `templates` folder while Gulp is running, it will crash Gulp.
* Adding a directory in the `templates` folder while Gulp is running causes an infinite loop?
* Relative image paths don't work (I'll be adding support for this in the future)

## Roadmap

### v 0.2.1

* BrowserSync - CSS injection on dev build
* Move compilation error messages to config file
* Clean up reset styles
* Only compile common styles once (implement caching system)

### Future

* Resolve adding/renaming templates issues
* Support `.hbs` naming syntax for Handlebars files
* Automatically add `!important` for all media query styles
* For all HTML tags - inject width/height attributes
    * pull from CSS
    * for `<img>` tags, if width/height not specified in CSS, find actual image size
* tables:
    * width, height attributes - pull from CSS
    * cellpadding, cellspacing, border = 0
    * attributes ordered: width, height, cellpadding, cellspacing, border
* For all images, add `border="0"`
* For all `<a>` anchor tags, add `target="_blank"`
* Automatically convert responsive styles to use the `[class="..."]` syntax
* Strip unnecessary CSS classes/IDs from HTML
* Lossless image compression
* More advanced Handlebars support
* Unit tests
* Relative paths for images
* Ignore specified template folder(s) - underscore in front of folder name?
* Force XHTML 1.0 transitional doctype
* Automatic Gmail Promotions tab code generation
* Autoprefixer with http://pleeease.io
* em/rem to px converter
* Warnings:
    * relative img references
    * `<link>` tags
    * `<script>` tags
    * W3C validation
