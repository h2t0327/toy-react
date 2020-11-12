// 实体dom的一层包裹
class ElementWrapper {
  constructor(tagName) {
    this.root = document.createElement(tagName) // 创建一个实体dom
  }

  setAttribute(name, value) {
    this.root.setAttribute(name, value) // 给实体dom赋属性值
  }

  appendChild(component) {
    this.root.appendChild(component.root) // 给实体dom插入子节点
  }
}

class TextWrapper {
  constructor(text) {
    this.root = document.createTextNode(text) // 创建一个实体文本dom
  }
}

export class Component {
  constructor() {
    this.props = Object.create(null)  // 组件的props
    this._root = null // 组件的隐藏真实dom
    this.children = [] // 组件的孩子们
  }

  setAttribute(name, value) { // 给组件赋属性值
    this.props[name] = value
  }

  appendChild(component) { // 保存组件的儿子们
    this.children.push(component)
  }

  get root() { // 获取组件render里的真实dom
    if (!this._root) {
      this._root = this.render().root // 每一个继承Component 的方法都要事先render方法， 并返回一个真实dom， 如果不是，就还是一个组件
    }
    return this._root
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

  for (const attr in attributes) { // 都有setAttribute插入属性
    ele.setAttribute(attr, attributes[attr])
  }

  const insertChildren = (children) => {
    for (let child of children) {
      // 如果是string 说明是文本节点
      if (typeof child === 'string') {
        child = new TextWrapper(child)
      }
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
  parentElement.appendChild(component.root)
}
