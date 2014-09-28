# HTML Email Builder

## Features

* HTML and text versions
* Reset styles
* Responsive support
* In HTML version, converts special characters to HTML entities
* In text version, replace non-ASCII characters with ASCII equivalents (ex: smart ("curly") quotes are replaced by dumb quotes)

## Installation

1. Install Node.js on your computer (if you don't have it already) by going to [nodejs.org](http://nodejs.org), downloading the current version, and then running the installer.

2. Install Gulp on your computer by running this command in a Terminal window:

    ```bash
    npm install gulp -g
    ```

3. Download this repository by downloading the [ZIP file](https://github.com/maxlapides/html-email-generator/archive/master.zip) or by cloning it to your desktop:

    ```bash
    git clone https://github.com/maxlapides/html-email-generator.git
    ```

4. Download required npm modules by opening the project in a Terminal window and running:

    ```bash
    npm install
    ```

5. In the `templates` folder, add another folder for the new template you want to build. Name this folder whatever you want to call your email template.

6. In that folder, add the following files:

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
gulp
```

To compile only the development versions of your emails and then watch for file changes:

```bash
gulp dev-only
```

To compile only the production versions of your emails and then watch for file changes:

```bash
gulp prod-only
```

To stop the server: `CMD+C`

Your compiled emails will be saved in the `build` folder at your project root. Then, the BrowserSync server will start and the `build` directory will be automatically opened in a browser window.

## BrowserSync

BrowserSync will run a server at http://localhost:3000. This server points to the `build` directory as its root. BrowserSync automatically refreshes your emails in the browser.

So, for example, if you have a template named `scrappy-chipmunks`, you should open this URL to test your email as you work: `http://localhost:3000/scrappy-chipmunks/scrappy-chipmunks.html`.

If you're using Coda, make sure to disable the automatic refreshes in the preview pane. Also, make sure to manually change the URL of the preview pane to use the `localhost:3000` URL.

## Development and Production Builds

The development and production versions of your email will always render exactly the same in the browser. There is no development build of the text version, only the HTML version.

Differences between the two builds:

* Nothing yet

You should never try to actually send a development build. It definitely won't work.

## Reset Styles

Including a "reset" stylesheet helps ensure that your emails render the same across email clients. In the included `common` folder, there's a file named `reset.scss`. This is the default set of reset styles that are included automatically in every email.

This requires no configuration, but if you want to specify your own set of reset styles for an individual email, you can do so by adding a file named `reset.scss` to that email's template folder.

## Responsive Styles

If you want to build a responsive email, you're going to need to use media queries. Since it's impossible to inline media queries, your responsive styles will be injected into the `<head>` of your HTML.

No extra configuration required! Your media queries will automatically be extracted from your CSS and injected. Also, if you have multiple of the same media query in your stylesheet, the selectors will all be grouped together into a single media query.

## Known Issues

* If you rename a directory in the `templates` folder while Gulp is running, it will crash Gulp.

## Roadmap

### v 0.2

* development build: external styles
* development build: css sourcemaps
* production build: minify HTML
* BrowserSync - CSS injection on dev build

### Future

* Yahoo "sheep" hack
* `<img />` - inject width/height attributes
* tables: cellpadding/cellspacing = 0
* Strip unnecessary CSS classes from HTML
* Lossless image compression
* More advanced Handlebars support
* Unit tests
