const RENDER_TO_DOM = Symbol('render to dom') // 私有属性， 很难被访问到

// 创建一个range对象， 并设置开始指针和结束指针
const addRange = (ele, start, end) => {
  let range = document.createRange()
  range.setStart(ele, start)
  range.setEnd(ele, end)
  return range
}

// 实体dom的一层包裹
class ElementWrapper {
  constructor(tagName) {
    this.root = document.createElement(tagName) // 创建一个实体dom
  }

  setAttribute(name, value) {
    // 匹配带有on开头的属性， 如果有说明是监听事件
    if (name.match(/^on([\s\S]+)$/)) {
      // 取到的事件名字开头是以大写的， 需要替换成小写
      this.root.addEventListener(
        RegExp.$1.replace(/^[\s\S]/, (v) => v.toLowerCase()),
        value
      )
    } else {
      // 替换掉className 属性， 改为浏览器可以理解的class
      if (name === 'className') {
        name = 'class'
      }
      this.root.setAttribute(name, value) // 给实体dom赋属性值
    }
  }

  appendChild(component) {
    const len = this.root.childNodes.length // 获取当前dom的子节点长度
    const range = addRange(this.root, len, len) // 创建一个新指针，并指向当前dom节点最后
    component[RENDER_TO_DOM](range) // 执行插入dom
  }

  [RENDER_TO_DOM](range) {
    range.deleteContents() // 清除当前指针包含的内容
    range.insertNode(this.root) // 插入指针后面插入dom
  }
}

class TextWrapper {
  constructor(text) {
    this.root = document.createTextNode(text) // 创建一个实体文本dom
  }

  [RENDER_TO_DOM](range) {
    range.deleteContents() // 清除当前指针包含的内容
    range.insertNode(this.root) // 插入指针后面插入dom
  }
}

export class Component {
  constructor() {
    this.props = Object.create(null) // 组件的props
    this.children = [] // 组件的孩子们
    this._range = null // 私有当前组件指针
  }

  setAttribute(name, value) {
    // 给组件赋属性值
    this.props[name] = value
  }

  appendChild(component) {
    // 保存组件的儿子们
    this.children.push(component)
  }

  [RENDER_TO_DOM](range) {
    this._range = range // 保存当前组件指针
    this.render()[RENDER_TO_DOM](range) // 调用render， 传入指针
  }

  reRender(callback, preState, nextState) {
    const oldRange = this._range
    const range = addRange(oldRange.startContainer, oldRange.startOffset)
    this[RENDER_TO_DOM](range) // 在旧指针后面重新render

    oldRange.setStart(range.endContainer, range.endOffset)
    oldRange.deleteContents()
    callback && callback(preState, nextState)
  }

  setState(newState, callback) {
    if (this.state === null || typeof this.state !== 'object') {
      this.state = newState
      this.reRender(callback, this.state, newState)
      return
    }

    const merge = (oldState, newState) => {
      for (const key in newState) {
        const newValue = newState[key]
        const oldValue = oldState[key]
        if (oldValue === null || typeof oldValue !== 'object') {
          oldState[key] = newValue
        } else {
          merge(oldValue, newValue)
        }
      }
    }

    merge(this.state, newState)
    this.reRender(callback, this.state, newState)
  }
}

export const createElement = (type, attributes, ...children) => {
  let ele
  // 如果是string， 说明是一个真实dom
  if (typeof type === 'string') {
    ele = new ElementWrapper(type)
  } else {
    ele = new type // 如果不是说明是一个组件dom
  }

  for (const attr in attributes) {
    // 都有setAttribute插入属性
    ele.setAttribute(attr, attributes[attr])
  }

  const insertChildren = (children) => {
    for (let child of children) {
      // 如果是string 说明是文本节点
      if (typeof child === 'string' || typeof child === 'number') {
        child = new TextWrapper(child)
      }
      if (child === null) continue
      // 如果是数组， 说明是嵌套儿子们，递归插入
      if (typeof child === 'object' && child instanceof Array) {
        insertChildren(child)
      } else {
        ele.appendChild(child)
      }
    }
  }

  insertChildren(children)

  return ele
}

// 挂载功能行数
export const render = (component, parentElement) => {
  const range = addRange(parentElement, 0, parentElement.childNodes.length)
  range.deleteContents()
  component[RENDER_TO_DOM](range)
}
