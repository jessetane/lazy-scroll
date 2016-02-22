var LazyScroll = {
  prototype: Object.create(window.HTMLElement.prototype)
}

LazyScroll.prototype.createdCallback = function () {
  this.direction = this.getAttribute('direction') || 'vertical'
  this.itemCount = this.getAttribute('item-count') || 0
  this.itemSize = this.getAttribute('item-size') || 100
  this.overflow = this.getAttribute('overflow') || 0
  this.deferRemoval = !!this.getAttribute('defer-removal') // work around for desktop safari bug

  if (this.firstElementChild) {
    this.content = this.firstElementChild
  } else {
    this.content = document.createElement('div')
    this.appendChild(this.content)
  }

  this._items = []
  this._removable = null
  this._onenterFrame = this._onenterFrame.bind(this)
  this._onscrollEnd = this._onscrollEnd.bind(this)
  this._onscroll = this._onscroll.bind(this)
  this.addEventListener('scroll', this._onscroll)
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

LazyScroll.prototype._onscroll = function () {
  this.removeEventListener('scroll', this._onscroll)
  this.dispatchEvent(new Event('scrollstart'))
  this._onenterFrame()
}

LazyScroll.prototype._onenterFrame = function () {
  if (this._hidden) return
  var scroll = this[this._scrollStart]
  if (this._lastScroll === scroll) {
    if (!this._debounce) {
      this._debounce = 1
    } else if (this._debounce < 10) {
      this._debounce++
    } else {
      this._onscrollEnd()
      return
    }
  } else {
    this._debounce = 0
    this._lastScroll = scroll
    this.update()
  }
  requestAnimationFrame(this._onenterFrame)
}

LazyScroll.prototype._onscrollEnd = function () {
  delete this._lastScroll
  if (this.deferRemoval) {
    var content = this.content
    var removable = this._removable
    if (removable) {
      this._items = this._items.filter(function (item) {
        if (!removable[item.lazyIndex]) return true
        if (item.hide) item.hide()
        content.removeChild(item)
      })
      this._removable = null
    }
  }
  this.dispatchEvent(new Event('scrollend'))
  this.addEventListener('scroll', this._onscroll)
}

LazyScroll.prototype.update = function () {
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
    var index = item.lazyIndex
    if (this.deferRemoval) {
      existing[index] = item
      if (index < start) {
        before[before.length] = item
        removable[index] = item
      } else if (index > end) {
        after[after.length] = item
        removable[index] = item
      }
    } else {
      if (index < start || index > end) {
        content.removeChild(item)
      } else {
        existing[index] = item
      }
    }
  }

  // add missing items
  var visible = []
  var nextSibling = after.length ? after[0] : null
  var translate = this._translate + '('
  var n = 0
  i = end
  start--
  while (i > start) {
    item = existing[i]
    if (!item) {
      item = this.itemAtIndex(i)
      item.lazyIndex = i
      item.style.transform = translate + itemSize * i + 'px)'
      if (nextSibling) {
        content.insertBefore(item, nextSibling)
      } else {
        content.appendChild(item)
      }
    }
    if (item.show) item.show()
    nextSibling = visible[n] = item
    n++
    i--
  }

  this._removable = removable
  this._visible = visible
  this._items = this.deferRemoval ? before.concat(visible).concat(after) : visible
}

LazyScroll.prototype.clear = function () {
  var content = this.content
  this._removable = null
  this._visible = null
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
