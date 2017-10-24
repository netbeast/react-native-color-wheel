import React, { Component } from 'react'
import {
  Image,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
 } from 'react-native'

const GREY_LIGHT = '#eeeeee'

export class Dial extends Component {
  static defaultProps = {
    initialRadius: 1,
    initialAngle: 0,
    precision: 0,
  }

  constructor (props) {
    super(props)
    this.state = {
      startingAngle: this.props.initialAngle,
      startingRadius: this.props.initialRadius,
      releaseAngle: this.props.initialAngle,
      releaseRadius: this.props.initialRadius,
      angle: this.props.initialAngle,
      radius: this.props.initialRadius,
    }
    this.offset = {x: 0, y: 0}
  }

  componentWillMount () {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (e, gestureState) => true,
      onStartShouldSetPanResponderCapture: (e, gestureState) => {
        this.measureOffset() // measure again
        const { deg, radius } = this.calcAngle(e.nativeEvent)
        this.setState({startingAngle: deg, startingRadius: radius})
        return true
      },
      onMoveShouldSetPanResponder: (e, g) => true,
      onMoveShouldSetPanResponderCapture: (e, gestureState) => true,
      onPanResponderGrant: (e, gestureState) => true,
      onPanResponderMove: (e, gestureState) => requestAnimationFrame(() => {
        this.updateAngle(gestureState)
      }),
      onPanResponderRelease: (e, gestureState) => {
        this.setState({
          releaseAngle: this.state.angle,
          releaseRadius: this.state.radius,
        })
      },
    })
  }

  onLayout (nativeEvent) {
    /*
    * Multiple measures to avoid the gap between animated
    * and not animated views
    */
    this.measureOffset()
    setTimeout(() => this.measureOffset(), 200)
  }

  measureOffset () {
    /*
    * const {x, y, width, height} = nativeEvent.layout
    * onlayout values are different than measureInWindow
    * x and y are the distances to its previous element
    * but in measureInWindow they are relative to the window
    */
    const { width: screenWidth } = Dimensions.get('window')

    this.self.measureInWindow((x, y, width, height) => {
      this.offset = {
        x: x % screenWidth + width / 2,
        y: y + height / 2,
      }
      this.radius = width / 2
    })
  }

  updateAngle (gestureState) {
    let {deg, radius} = this.calcAngle(gestureState)
    if (deg < 0) deg += 360
    if (Math.abs(this.state.angle - deg) > this.props.precision) {
      this.updateState({deg, radius})
    }
  }

  calcAngle (gestureState) {
    const {pageX, pageY, moveX, moveY} = gestureState
    const [x, y] = [pageX || moveX, pageY || moveY]
    const [dx, dy] = [x - this.offset.x, y - this.offset.y]
    return {
      deg: Math.atan2(dy, dx) * 180 / Math.PI + 120,
      radius: Math.sqrt(dy * dy + dx * dx) / this.radius, // pitagoras r^2 = x^2 + y^2 normalizado
    }
  }

  updateState ({deg, radius = this.state.radius}) {
    radius = this.state.releaseRadius + radius - this.state.startingRadius
    if (radius < this.props.radiusMin) radius = this.props.radiusMin
    else if (radius > this.props.radiusMax) radius = this.props.radiusMax

    deg = deg + this.state.releaseAngle - this.state.startingAngle
    if (deg < 0) deg += 360

    this.setState({angle: deg, radius})
    if (this.props.onValueChange) this.props.onValueChange(deg, radius)
  }

  render () {
    return (
      <View
        onLayout={(nativeEvent) => this.onLayout(nativeEvent)}
        ref={(node) => { this.self = node }}
        style={[styles.coverResponder, this.props.responderStyle]}
        {...this._panResponder.panHandlers}>
        <Image source={require('./color-wheel.png')} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  coverResponder: {
    padding: 20, // needs a minimum
  },
  dial: {
    width: 120,
    height: 120,
    backgroundColor: 'white',
    borderRadius: 60,
    elevation: 5,
    shadowColor: GREY_LIGHT,
    shadowOffset: {width: 1, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 1,
  },
  innerDialDecorator: {
    top: 10,
    left: 10,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    elevation: 3,
  },
  pointer: {
    top: 20,
    left: 20,
    position: 'absolute',
    width: 10,
    height: 10,
    backgroundColor: 'rgb(221,223,226)',
    borderRadius: 5,
  },
})
