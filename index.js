var LazyScroll = {
  prototype: Object.create(window.HTMLElement.prototype)
}

LazyScroll.prototype.createdCallback = function () {
  this.direction = 'vertical'
  this.itemCount = 0
  this.itemSize = 100
  this.overflow = 0
  this.content = this.firstElementChild

  if (!this.content) {
    this.content = document.createElement('div')
    this.appendChild(this.content)
  }

  var self = this
  this._items = {}
  this._updateRequested = false
  this._onscroll = onscroll

  this.addEventListener('scroll', this._onscroll)

  function onscroll () {
    if (self._updateRequested) return
    self._updateRequested = true

    // pointer events can kill scrolling perf
    // so we disable them while scrolling
    if (self._scrolling === undefined) {
      self._disablePointerEvents()
    }

    window.requestAnimationFrame(update)
  }

  function update () {
    self.update()
  }
}

Object.defineProperty(LazyScroll.prototype, 'direction', {
  get: function () {
    return this._dimension === 'height' ? 'vertical' : 'horizontal'
  },
  set: function (direction) {
    switch (direction) {
      case 'vertical':
        this._dimension = 'height'
        this._offsetSize = 'offsetHeight'
        this._translate = 'translateY'
        break
      case 'horizontal':
        this._dimension = 'width'
        this._offsetSize = 'offsetWidth'
        this._translate = 'translateX'
        break
      default:
        throw new Error('must be vertical or horizontal')
    }
  }
})

LazyScroll.prototype._disablePointerEvents = function () {
  var self = this
  var mark = this.scrollTop
  this.content.style.pointerEvents = 'none'
  this._scrolling = setInterval(function () {
    if (mark === self.scrollTop) {
      self.content.style.pointerEvents = ''
      clearInterval(self._scrolling)
      delete self._scrolling
    } else {
      mark = self.scrollTop
    }
  }, 100)
}

LazyScroll.prototype.update = function () {
  if (this._hidden) return

  var scrollTop = this.scrollTop
  var content = this.content
  var itemCount = this.itemCount
  var itemSize = this.itemSize
  var size = itemCount * itemSize
  var start = Math.floor(scrollTop / itemSize) - this.overflow
  var end = Math.floor((scrollTop + this[this._offsetSize]) / itemSize) + this.overflow
  var items = this._items
  var existing = {}
  var i, n, item

  if (start < 0) start = 0
  if (end >= itemCount) end = itemCount - 1

  for (i in items) {
    item = items[i]
    n = parseInt(i, 10)
    if (n < start || n > end) {
      if (item.hide) item.hide()
      content.removeChild(item)
      delete items[i]
    } else {
      existing[i] = true
    }
  }

  end++
  i = start
  while (i < end) {
    if (!existing[i]) {
      item = items[i] = this.itemAtIndex(i)
      item.style.transform = this._translate + '(' + (itemSize * i + 'px') + ')'
      content.appendChild(item)
      if (item.show) item.show()
    }
    i++
  }

  if (this._lastSize !== size) {
    this._lastSize = size
    content.style[this._dimension] = size + 'px'
  }

  this._updateRequested = false
}

LazyScroll.prototype.hide =
LazyScroll.prototype.detachedCallback = function () {
  this._hidden = true
  this.removeEventListener('scroll', this._onscroll)
  for (var i in this.items) {
    var item = this.items[i]
    if (item.hide) item.hide()
    delete this.items[i]
  }
}

module.exports = document.registerElement('x-lazy-scroll', LazyScroll)
