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
  this._items = []
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

  var content = this.content
  var itemCount = this.itemCount
  var itemSize = this.itemSize
  var size = itemCount * itemSize

  // update content size
  if (this._lastSize !== size) {
    this._lastSize = size
    content.style[this._dimension] = size + 'px'
  }

  // clamp start / end
  var scrollTop = this.scrollTop
  var start = Math.floor(scrollTop / itemSize) - this.overflow
  var end = Math.floor((scrollTop + this[this._offsetSize]) / itemSize) + this.overflow
  if (start < 0) start = 0
  if (end >= itemCount) end = itemCount - 1

  // remove old items
  var existing = this._items
  var len = existing.length
  var tmp = []
  var i = -1
  while (++i < len) {
    var item = existing[i]
    var index = item[0]
    if (index < start || index > end) {
      item = item[1]
      if (item.hide) item.hide()
      content.removeChild(item)
    } else {
      tmp[tmp.length] = item
    }
  }
  existing = tmp

  // add new items
  len = existing.length
  tmp = []
  end++
  i = start
  while (i < end) {
    var n = -1
    while (++n < len) {
      item = existing[n]
      index = item[0]
      if (index === i || index > i) break
    }
    if (index > i || n === len) {
      var newItem = this.itemAtIndex(i)
      newItem.style.transform = this._translate + '(' + (itemSize * i + 'px') + ')'
      if (n === len) {
        content.appendChild(newItem)
      } else {
        content.insertBefore(newItem, item[1])
      }
      if (newItem.show) newItem.show()
      tmp[tmp.length] = [ i, newItem ]
    } else {
      tmp[tmp.length] = item
    }
    i++
  }

  this._items = tmp
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
