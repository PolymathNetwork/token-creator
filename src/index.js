import React, {createContext, useReducer} from 'react'
import ReactDOM from 'react-dom'
import './index.css'
import App from './App'
import rootReducer from './rootReducer'
import * as serviceWorker from './serviceWorker'

const initialState = {
  App: {
    sdk: undefined,
    loading: false,
    loadingMessage: '',
    error: undefined,
    networkId: -1,
    walletAddress: '',
    reservations: undefined
  }
}

export const Store = createContext()
const WrappedApp = () => {
  const store = useReducer(rootReducer, initialState)
  return (<Store.Provider value={store}><App /></Store.Provider>)
}

ReactDOM.render(<WrappedApp />, document.getElementById('root'))

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister()
