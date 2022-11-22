// @flow

import React, {Component} from 'react'
import {
  Animated,
  Image,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
} from 'react-native'
import colorsys from 'colorsys'

export class ColorWheel extends Component {
  static defaultProps = {
    thumbSize: 50,
    initialColor: '#ffffff',
    onColorChange: () => {},
  }

  static getDerivedStateFromProps(props: Object, state: Object): null | Object {
		const {
      toggleMeToforceUpdateInitialColor,
    } = props;
		if (toggleMeToforceUpdateInitialColor !== state.toggleMeToforceUpdateInitialColor) {
			return {
        toggleMeToforceUpdateInitialColor,
			};
		}
		return null;
	}

  constructor (props) {
    super(props)
    const {
      initialColor,
      toggleMeToforceUpdateInitialColor = 0,
    } = props;
    this.state = {
      offset: {x: 0, y: 0},
      currentColor: initialColor,
      pan: new Animated.ValueXY(),
      toggleMeToforceUpdateInitialColor,
      radius: 0,
      panHandlerReady: true,
      didUpdateThumb: false,
    }
  }

  componentDidMount = () => {
    this._panResponder = PanResponder.create({
      onStartShouldSetPanResponderCapture: () => {
        return true
      },
      onStartShouldSetPanResponder: () => { return true },
      onMoveShouldSetPanResponderCapture: () => { return true },
      onPanResponderGrant: ({nativeEvent}) => {
        if (this.outBounds(nativeEvent)) return
        if (this.props.onGrant) {
          this.props.onGrant();
        }
        if (!this.state.didUpdateThumb) {
          this.updateColorAndThumbPosition(nativeEvent);
        }
      },
      onPanResponderMove: (event, gestureState) => {
        if (this.outBounds(gestureState)) return

        if (!this.state.didUpdateThumb) {
          const {nativeEvent} = event;
          this.updateColorAndThumbPosition(nativeEvent);
        }

        this.resetPanHandler()
        return Animated.event(
          [
            null,
            {
              dx: this.state.pan.x,
              dy: this.state.pan.y,
            },
          ],
          {listener: this.updateColor}
        )(event, gestureState)
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderRelease: ({nativeEvent}) => {
        this.setState({
          panHandlerReady: true,
          didUpdateThumb: false,
        })
        this.state.pan.flattenOffset()
        const {radius} = this.calcPolar(nativeEvent)
        if (radius < 0.1) {
          this.forceUpdate('#ffffff')
        }

        if (this.props.onColorChangeComplete) {
          this.props.onColorChangeComplete(this.state.hsv);
        }
      },
    })
  }

  componentDidUpdate(prevProps: Object, prevState: Object) {
    const {
      initialColor,
    } = this.props;

    if (initialColor && this.state.toggleMeToforceUpdateInitialColor !== prevState.toggleMeToforceUpdateInitialColor) {
      this.forceUpdate(initialColor);
    }
  }

  updateColorAndThumbPosition (nativeEvent) {
    this.updateColor({nativeEvent})

    this.state.pan.setValue({
      x: -this.state.left + nativeEvent.pageX - this.props.thumbSize / 2,
      y: -this.state.top + nativeEvent.pageY - this.props.thumbSize / 2,
    })
    this.setState({
      didUpdateThumb: true,
    })
  }

  onLayout = ({nativeEvent: {layout}}) => {
    this.measureOffset(layout)
  }

  measureOffset (layout) {
    /*
    * const {x, y, width, height} = nativeEvent.layout
    * onlayout values are different than measureInWindow
    * x and y are the distances to its previous element
    * but in measureInWindow they are relative to the window
    */
    this.self.measureInWindow((x, y, width, height) => {
      // In iOS measureInWindow sometimes returns height/width zero. Hence use width/height from layout in that case
      const _w = width || layout.width;
      const _h = height || layout.height
      const window = Dimensions.get('window')
      const absX = x % _w
      const radius = Math.min(_w, _h) / 2
      const offset = {
        x: absX + _w / 2,
        y: y % window.height + _h / 2,
      }

      this.setState({
        offset,
        radius,
        height: _h,
        width: _w,
        top: y % window.height,
        left: absX,
      })
      this.forceUpdate(this.state.currentColor)
    })
  }

  calcPolar (gestureState) {
    const {
      pageX, pageY, moveX, moveY,
    } = gestureState
    const [x, y] = [pageX || moveX, pageY || moveY]
    const [dx, dy] = [x - this.state.offset.x, y - this.state.offset.y]
    return {
      deg: Math.atan2(dy, dx) * (-180 / Math.PI),
      // pitagoras r^2 = x^2 + y^2 normalized
      radius: Math.sqrt(dy * dy + dx * dx) / this.state.radius,
    }
  }

  outBounds (gestureState) {
    const {radius} = this.calcPolar(gestureState)
    return radius > 1
  }

  resetPanHandler () {
    if (!this.state.panHandlerReady) {
      return
    }

    this.setState({panHandlerReady: false})
    this.state.pan.setOffset({
      x: this.state.pan.x._value,
      y: this.state.pan.y._value,
    })
    this.state.pan.setValue({x: 0, y: 0})
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
    const {deg, radius} = this.calcPolar(nativeEvent)
    const hsv = {h: deg, s: 100 * radius, v: 100};
    const currentColor = colorsys.hsv2Hex(hsv)
    this.setState({hsv, currentColor})
    this.props.onColorChange(hsv, false);
  }

  forceUpdate = color => {
    const {h, s, v} = colorsys.hex2Hsv(color)
    const {left, top} = this.calcCartesian(h, s / 100)
    this.setState({currentColor: color})
    this.props.onColorChange({h, s, v}, true)
    this.state.pan.setValue({
      x: left - this.props.thumbSize / 2,
      y: top - this.props.thumbSize / 2,
    })
  }

  animatedUpdate = color => {
    const {h, s, v} = colorsys.hex2Hsv(color)
    const {left, top} = this.calcCartesian(h, s / 100)
    this.setState({currentColor: color})
    this.props.onColorChange({h, s, v}, false)
    Animated.spring(this.state.pan, {
      toValue: {
        x: left - this.props.thumbSize / 2,
        y: top - this.props.thumbSize / 2,
      },
    }).start()
  }

  setRef = (ref) => {
    this.self = ref;
  }

  render () {
    const {radius} = this.state
    const thumbStyle = [
      styles.circle,
      this.props.thumbStyle,
      {
        width: this.props.thumbSize,
        height: this.props.thumbSize,
        borderRadius: this.props.thumbSize / 2,
        backgroundColor: this.state.currentColor,
        opacity: this.state.offset.x === 0 ? 0 : 1,
      },
    ]

    const panHandlers = this._panResponder && this._panResponder.panHandlers || {}

    return (
      <View
        ref={this.setRef}
        onLayout={this.onLayout}
        style={[styles.coverResponder, this.props.style]}
        pointerEvents={'box-none'} >
        <Image
          pointerEvents={'auto'}
          style={[styles.img,
                  {
                    height: radius * 2,
                    width: radius * 2,
                    borderRadius: radius - this.props.thumbSize,
                  }]}
          source={require('./color-wheel.png')}
          {...panHandlers}
        />
        <Animated.View style={[this.state.pan.getLayout(), thumbStyle]} pointerEvents={'box-none'} />
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
