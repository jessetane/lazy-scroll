# lazy-scroll
A web component based on iOS's UITableView.

## Why
If you have a huge list, or just want to keep your resource consumption low.

## How
The idea is to load items that are about to scroll into view on demand, and to unload items that are no longer visible.

## Example
index.html
``` html
<my-scroller></my-scroller>
```
index.js
``` javascript
var LazyScroll = require('lazy-scroll')

var MyScroller = {
  prototype: Object.create(LazyScroll.prototype)
}

MyScroller.prototype.createdCallback = function () {
  LazyScroll.prototype.createdCallback.call(this)
  this.direction = 'vertical' // vertical|horizontal
  this.itemCount = 100        // the number of items in your list
  this.itemSize = 50          // the size of each item
  this.overflow = 0           // the number of items to buffer offscreen
  this.update()
}

MyScroller.prototype.itemAtIndex = function (index) {
  var item = document.createElement('DIV')
  item.textContent = index
  return item
}

document.registerElement('my-scroller', MyScroller)
```

## License
WTFPL
