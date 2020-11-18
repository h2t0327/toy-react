const RENDER_TO_DOM = Symbol('render to dom') // 私有属性， 很难被访问到

// 创建一个range对象， 并设置开始指针和结束指针
const addRange = (ele, start, end) => {
  let range = document.createRange()
  range.setStart(ele, start)
  range.setEnd(ele, end)
  return range
}

const replaceContent = (range, node) => {
  range.insertNode(node)
  range.setStartAfter(node)
  range.deleteContents()

  range.setStartBefore(node)
  range.setEndAfter(node)
}

export class Component {
  constructor() {
    this.props = Object.create(null) // 组件的props
    this.children = [] // 组件的孩子们
    this._root = null
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

  get vdom() {
    return this.render().vdom
  }

  [RENDER_TO_DOM](range) {
    this._range = range // 保存当前组件指针
    this._vdom = this.vdom
    this._vdom[RENDER_TO_DOM](range) // 调用render， 传入指针
  }

  update() {
    const isSameNode = (oldNode, newNode) => {
      if (oldNode.type !== newNode) {
        return false
      }

      for (const name in newNode.props) {
        if (oldNode.props[name] !== newNode.props[name]) {
          return false
        }
      }

      if (
        Object.keys(oldNode.props).length > Object.keys(newNode.props).length
      ) {
        return false
      }

      if (newNode.type === '#text') {
        if (newNode.content !== oldNode.content) {
          return false
        }
      }

      return true
    }

    const update = (oldNode, newNode) => {
      if (!isSameNode(oldNode, newNode)) {
        newNode[RENDER_TO_DOM](oldNode._range)
        return
      }
      newNode._range = oldNode._range

      const newChildren = newNode.vchildren
      const oldChildren = oldNode.vchildren

      if (!newChildren || !oldChildren) {
        return
      }

      const tailRange = oldChildren[oldChildren.length - 1]._range

      for (let i = 0; i < newChildren.length; i++) {
        let newChild = newChildren[i]
        let oldChild = oldChildren[i]
        if (i < oldChildren.length) {
          update(oldChild, newChild)
        } else {
          const range = addRange(
            tailRange.startContainer,
            tailRange.endOffset,
            tailRange.endOffset
          )
          newChild[RENDER_TO_DOM](range)
          tailRange = range
        }
      }
    }

    const vdom = this.vdom
    update(this._vdom, vdom)
    this._vdom = vdom
  }

  setState(newState) {
    if (this.state === null || typeof this.state !== 'object') {
      this.state = newState
      this.update()
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
    this.update()
  }
}

// 实体dom的一层包裹
class ElementWrapper extends Component {
  constructor(type) {
    super(type)
    this.type = type // 创建一个实体dom
  }

  get vdom() {
    this.vchildren = this.children.map((child) => child.vdom)
    return this
  }

  [RENDER_TO_DOM](range) {
    this._range = range
    const root = document.createElement(this.type)
    for (let name in this.props) {
      const value = this.props[name]
      if (name.match(/^on([\s\S]+)$/)) {
        root.addEventListener(
          RegExp.$1.replace(/^[\s\S]/, (v) => v.toLowerCase()),
          value
        )
      } else {
        if (name === 'className') {
          name = 'class'
        }
        root.setAttribute(name, value) // 给实体dom赋属性值
      }
    }

    if(!this.vchildren) {
      this.vchildren = this.children.map((child) => child.vdom)
    }

    for(let child of this.vchildren) {
      const childRange = addRange(root, root.childNodes.length, root.childNodes.length)
      child[RENDER_TO_DOM](childRange)
    }

    replaceContent(range, root)
  }
}

class TextWrapper extends Component {
  constructor(content) {
    super(content)
    this.type = '#text'
    this.content = content
  }

  get vdom() {
    return this
  }

  [RENDER_TO_DOM](range) {
    this._range = range

    const root = document.createTextNode(this.content)

    replaceContent(range, root)
  }
}

export const createElement = (type, attributes, ...children) => {
  let ele
  // 如果是string， 说明是一个真实dom
  if (typeof type === 'string') {
    ele = new ElementWrapper(type)
  } else {
    ele = new type() // 如果不是说明是一个组件dom
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
