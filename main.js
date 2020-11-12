import { createElement, render, Component } from './toy-react'

class MyComponent extends Component {
  render() {
    return (
      <div>
        <h1>Toy React</h1>
        <div>lalal</div>
        {this.children}
      </div>
    )
  }
}

render(<MyComponent >
  <div>儿子   你妈叫你回家吃饭了</div>
</MyComponent>, document.getElementById('root'))
