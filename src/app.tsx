import React from 'react'
import './app.scss'

global.React = React

export default (props) => {
  return props.children
}