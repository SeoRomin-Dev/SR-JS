# SeoRomin JS Library (SR JS)

A pure JavaScript library for DOM manipulation, events, and animations. It provides a familiar chaining syntax while utilizing modern browser APIs for maximum performance.

## Installation

Include the minified script in your HTML file before your custom scripts.

```html
<!DOCTYPE html>
<html lang="en">
<head>
     <meta charset="UTF-8">
     <title>My App</title>
</head>
<body>
     <h1>Hello World</h1>

     <!-- Include SR JS -->
     <script src="sr.min.js"></script>

     <!-- Your Code -->
     <script>
          // Wait for DOM Ready
          $(function() {
                $('h1').text('SR JS is working!');
          });
     </script>
</body>
</html>
```

### Add to your project:

```html
<script src="sr.min.js"></script>
```

### Or use a CDN:

jsDelivr is a great open-source service that lets you use projects without ever downloading the code.

```html
<script src="https://cdn.jsdelivr.net/npm/sr-js@latest"></script>
```

### Or get it:

[Download SR JS](https://raw.githubusercontent.com/SeoRomin-Dev/SR-JS/refs/heads/main/dist/sr.min.js)

### Or install with `npm`:

NPM is a front-end package manager that simplifies adding new packages.

```
npm i sr-js
```

## Some examples

### Basic GET Request

```javascript
$.ajax({
     url: '/api/users',
     method: 'GET',
     dataType: 'json',
     data: { page: 1, limit: 10 }
})
.then(response => {
     console.log('Success:', response);
})
.catch(error => {
     console.error('Request failed:', error);
})
.finally(() => {
     console.log('Cleanup actions');
});
```

### Delegated binding with namespaces

```javascript
$('#container').on('click.myPlugin', '.btn', function() {
     console.log('Button inside container clicked');
});
```

### Toggle class

```javascript
$('div').toggleClass('active');
```

### Create element

```javascript
const $card = $.t('<div>', {
     class: 'card',
     html: '<h1>Title</h1>',
     css: { border: '1px solid black' },
     data: { id: 101 }
});
```
... Refer to the [docs folder](https://github.com/SeoRomin-Dev/SR-JS/blob/main/docs) for more details.

## Extending SR JS

You can easily extend the library with custom plugins or static methods.

### 1. Add an Instance Plugin

Use `$.plugin` to add methods available on SR objects (like `$('div').myMethod()`).

```javascript
$.plugin('color', function(color) {
     this.css('color', color);
     return this; // Enable chaining
});

// Usage
$('p').color('red');
```

### 2. Add a Static Method

Use `$.method` to add utility functions directly to the `$` object.

```javascript
$.method('sum', function(a, b) {
     return a + b;
});

// Usage
console.log($.sum(10, 20)); // 30
```

## Browser Support

This library relies on modern JavaScript features including `Proxy`, `WeakMap`, and `structuredClone`. Below is the minimum browser support matrix.

| Browser | Version | Release Date |
| :--- | :--- | :--- |
| **Google Chrome** | 98+ | Feb 2022 |
| **Mozilla Firefox** | 94+ | Nov 2021 |
| **Apple Safari** | 15.4+ | Mar 2022 |
| **Microsoft Edge** | 98+ | Feb 2022 |

## Author and License

Created and maintained by Roman Orlovskiy ([SeoRomin](https://github.com/SeoRomin-Dev)) under the MIT license.