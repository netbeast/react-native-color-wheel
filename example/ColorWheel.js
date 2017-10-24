import React, { Component } from 'react'
import {
  Animated,
  Image,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
  Text,
} from 'react-native'
import colorsys from 'colorsys'

export class ColorWheel extends Component {
  static defaultProps = {
    initialColor: '#ffffff',
    precision: 0,
  }

  constructor(props) {
    super(props)
    this.state = {
      offset: { x: 0, y: 0 },
      currentColor: props.initialColor,
      pan: new Animated.ValueXY(),
    }
  }

  componentWillMount = () => {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponder: (e, gestureState) => true,
      onStartShouldSetPanResponderCapture: (e, gestureState) => {
        this.state.pan.setOffset({
          x: this.state.pan.x._value,
          y: this.state.pan.y._value,
        })
        this.state.pan.setValue({x: 0, y: 0})
        return true
      },
      onMoveShouldSetPanResponder: (e, g) => true,
      onMoveShouldSetPanResponderCapture: (e, gestureState) => true,
      onPanResponderGrant: (e, gestureState) => true,
      onPanResponderMove: Animated.event([null, {
        dx: this.state.pan.x,
        dy: this.state.pan.y,
      }], { listener: this.updateColor }),
      onPanResponderRelease: (e, gestureState) => {
        this.state.pan.flattenOffset()
      },
    })
  }

  onLayout (nativeEvent) {
    this.measureOffset()
    /*
    * Multiple measures to avoid the gap between animated
    * and not animated views
    */
    setTimeout(() => this.measureOffset(), 200)
  }

  measureOffset () {
    /*
    * const {x, y, width, height} = nativeEvent.layout
    * onlayout values are different than measureInWindow
    * x and y are the distances to its previous element
    * but in measureInWindow they are relative to the window
    */
    this.self.measureInWindow((x, y, width, height) => {
      const window = Dimensions.get('window')
      const radius = Math.min(width, height) / 2
      const offset = {
        x: x % window.width + width / 2,
        y: y % window.height + height / 2,
      }

      this.setState({ offset, radius, height, width })
      this.forceUpdate(this.state.currentColor)
    })
  }

  calcPolar (gestureState) {
    const {pageX, pageY, moveX, moveY} = gestureState
    const [x, y] = [pageX || moveX, pageY || moveY]
    const [dx, dy] = [x - this.state.offset.x, y - this.state.offset.y]
    return {
      deg: Math.atan2(dy, dx) * - 180 / Math.PI,
      // pitagoras r^2 = x^2 + y^2 normalized
      radius: Math.sqrt(dy * dy + dx * dx) / this.state.radius,
    }
  }

  calcCartesian (deg, radius) {
    const r = radius * this.state.radius // was normalized
    const rad = Math.PI * deg / 180
    const x = r * Math.cos(rad)
    const y = r * Math.sin(rad)
    return {
      left: this.state.width / 2 + x,
      top: this.state.height / 2 - y,
    }
  }

  updateColor = ({nativeEvent}) => {
    const what = this.state.pan
    const { deg, radius } = this.calcPolar(nativeEvent)
    const currentColor = colorsys.hsv2Hex({ h: deg, s: 100 * radius, v: 100 })
    this.setState({ currentColor })
    if (this.props.onValueChange) this.props.onColorChange(currentColor)
  }

  forceUpdate = (color) => {
    const { h, s } = colorsys.hex2Hsv(color)
    const { left, top } = this.calcCartesian(h, s / 100)
    this.setState({currentColor: color})
    Animated.spring(this.state.pan, {
      toValue: {x: left - 25, y: top - 25}
    }).start()
  }

  render () {
    const { radius } = this.state
    return (
      <View
        ref={(node) => { this.self = node }}
        {...this._panResponder.panHandlers}
        onLayout={(nativeEvent) => this.onLayout(nativeEvent)}
        style={[styles.coverResponder, this.props.style]}>
        <Image
          style={[styles.img, {height: radius * 2, width: radius * 2}]}
          source={require('./color-wheel.png')}/>
        <Animated.View
          {...this._panResponder.panHandlers}
          style={[this.state.pan.getLayout(), styles.circle, {
            backgroundColor: this.state.currentColor,
          }, this.props.thumbStyle]} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  coverResponder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    alignSelf: 'center',
  },
  circle: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 30,
    backgroundColor: '#EEEEEE',
    borderWidth: 3,
    borderColor: '#EEEEEE',
    elevation: 3,
    shadowColor: 'rgb(46, 48, 58)',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
})

function _normalizeAngle (degrees) {
  return (degrees % 360 + 360) % 360;
}