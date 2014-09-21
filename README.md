# HTML Email Builder

## Features

* HTML and text versions
* Reset styles
* Responsive support
* In HTML version, converts special characters to HTML entities
* In text version, replace non-ASCII characters with ASCII equivalents (ex: smart ("curly") quotes are replaced by dumb quotes)

## Installation

1. Download this repository by downloading the [ZIP file](https://github.com/maxlapides/html-email-generator/archive/master.zip) or by cloning it to your desktop:

```bash
git clone https://github.com/maxlapides/html-email-generator.git
```

2. In the `templates` folder, add another folder for the new template you want to build. Name this folder whatever you want to call your email template.

3. In that folder, add the following files:

* `html.handlebars`: your Handlebars template for the HTML version
* `style.scss`: your main Sass file (these styles will be automatically inlined)
* `text.handlebars`: your Handlebars template for the text version

Optional files:
* `reset.scss`: your Sass file for custom reset styles (see [Reset Styles](#reset-styles) below)
* `responsive.scss`: your Sass file for responsive styles (see [Responsive Styles](#responsive-styles) below)

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

To stop watching: `CMD+C`

Your compiled emails will be saved in the `build` folder at your project root.

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

Add a file to your template named `responsive.scss`. It will be automatically discovered and injected.

## Troubleshooting

### My reset styles and responsive styles aren't added to my HTML!

You forgot to add a `<head>` to your HTML, didn't you?

## Roadmap

### v 0.2

* Handlebars locals support
* BrowserSync
* Better error handling (missing templates, fse error catching, etc)
* development build: external styles
* development build: css sourcemaps
* production build: minify HTML
* Lossless image compression
* Include reset and responsive styles in the same `<style>` tag
