var LazyScroll = {
  prototype: Object.create(window.HTMLElement.prototype)
}

LazyScroll.prototype.createdCallback = function () {
  var self = this

  this.direction = this.getAttribute('direction') || 'vertical'
  this.itemCount = this.getAttribute('item-count') || 0
  this.itemSize = this.getAttribute('item-size') || 100
  this.overflow = this.getAttribute('overflow') || 0

  if (this.firstElementChild) {
    this.content = this.firstElementChild
  } else {
    this.content = document.createElement('div')
    this.appendChild(this.content)
  }

  this._items = []
  this._removable = null
  this._updateRequest = null
  this._onscroll = onscroll
  this._doUpdate = function () {
    self.update()
  }

  this.addEventListener('scroll', this._onscroll)

  function onscroll () {
    if (self._updateRequest) return
    if (!self._scrolling) this._watchForScrollEnd()
    self._updateRequest = window.requestAnimationFrame(self._doUpdate)
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
        this._scrollStart = 'scrollTop'
        break
      case 'horizontal':
        this._dimension = 'width'
        this._offsetSize = 'offsetWidth'
        this._translate = 'translateX'
        this._scrollStart = 'scrollLeft'
        break
      default:
        throw new Error('must be vertical or horizontal')
    }
  }
})

LazyScroll.prototype._watchForScrollEnd = function () {
  var self = this
  var mark = this.scrollTop
  this.dispatchEvent(new Event('scrollstart'))
  this._scrolling = setInterval(function () {
    if (mark === self.scrollTop) {
      clearInterval(self._scrolling)
      var content = self.content
      var removable = self._removable
      if (removable) {
        self._items = self._items.filter(function (item) {
          if (!removable[item._lazyIndex]) return true
          if (item.hide) item.hide()
          content.removeChild(item)
        })
        self._removable = null
      }
      delete self._scrolling
      self.dispatchEvent(new Event('scrollend'))
    } else {
      mark = self.scrollTop
    }
  }, 250)
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
  var scrollStart = this[this._scrollStart]
  var start = Math.floor(scrollStart / itemSize) - this.overflow
  var end = Math.floor((scrollStart + this[this._offsetSize]) / itemSize) + this.overflow
  if (start < 0) start = 0
  if (end >= itemCount) end = itemCount - 1

  // find removable items
  var existing = {}
  var removable = {}
  var before = []
  var after = []
  var items = this._items
  var len = items.length
  var i = -1
  while (++i < len) {
    var item = items[i]
    var index = item._lazyIndex
    existing[index] = item
    if (index < start) {
      before[before.length] = item
      removable[index] = item
    } else if (index > end) {
      after[after.length] = item
      removable[index] = item
    }
  }

  // add missing items
  var current = []
  var nextSibling = after.length ? after[0] : null
  var translate = this._translate + '('
  var n = 0
  i = end
  start--
  while (i > start) {
    item = existing[i]
    if (!item) {
      item = this.itemAtIndex(i)
      item._lazyIndex = i
      item.style.transform = translate + itemSize * i + 'px)'
      if (nextSibling) {
        content.insertBefore(item, nextSibling)
      } else {
        content.appendChild(item)
      }
      if (item.show) item.show()
    }
    nextSibling = current[n] = item
    n++
    i--
  }

  this._removable = removable
  this._items = before.concat(current).concat(after)
  this._updateRequest = null
}

LazyScroll.prototype.clear = function () {
  var content = this.content
  this._removable = null
  this._items = this._items.filter(function (item) {
    if (item.hide) item.hide()
    content.removeChild(item)
  })
}

LazyScroll.prototype.detachedCallback = function () {
  this._hidden = true
  this.removeEventListener('scroll', this._onscroll)
  this.clear()
}

module.exports = document.registerElement('x-lazy-scroll', LazyScroll)
