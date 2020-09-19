/* eslint-disable no-underscore-dangle */
import React, { useCallback, useState, useMemo, useRef } from 'react';
import {
	PanResponder,
	StyleSheet,
	Dimensions,
	ViewStyle,
	StyleProp,
	Animated,
	Image,
	View,
} from 'react-native';
import colorsys from 'colorsys';

import ColorWheelImage from './color-wheel.png';

const window = Dimensions.get('window');
const WINDOW_HEIGHT = window.height;

export type HSV = {
	h: number;
	s: number;
	v: number;
};

export type ColorWheelProps = {
	thumbStyle?: StyleProp<ViewStyle>;
	style?: StyleProp<ViewStyle>;
	initialColor?: string;
	thumbSize?: number;
	onColorChangeComplete?: (value: HSV) => void;
	onColorChange?: (value: HSV) => void;
};

// TODO: need fix?
// eslint-disable-next-line max-lines-per-function
const ColorWheel = ({
	initialColor = '#FFFFFF', // white color
	onColorChangeComplete,
	thumbSize = 50,
	onColorChange,
	thumbStyle,
	style,
}: ColorWheelProps) => {
	const [colorWheelIsVisible, setColorWheelIsVisible] = useState(false);
	const [currentColor, setCurrentColor] = useState(initialColor);
	const [panHandlerReady, setPanHandlerReady] = useState(false);
	const [offset, setOffset] = useState({ x: 0, y: 0 });
	const [radius, setRadius] = useState(0);
	const [height, setHeight] = useState(0);
	const [width, setWidth] = useState(0);
	const [left, setLeft] = useState(0);
	const [top, setTop] = useState(0);

	const animatedValue = useRef(new Animated.Value(0)).current;
	const pan = useRef(new Animated.ValueXY()).current;
	const self = useRef<View>(null);
	const animatedStyle = {
		transform: [
			{
				translateY: animatedValue.interpolate({
					inputRange: [0, 1],
					outputRange: [0, -60],
				}),
			},
		],
	};

	const onLayout = () =>
		/*
		 * const {x, y, width, height} = nativeEvent.layout
		 * onlayout values are different than measureInWindow
		 * x and y are the distances to its previous element
		 * but in measureInWindow they are relative to the window
		 */
		self?.current?.measureInWindow(
			(x: number, y: number, newWidth: number, newHeight: number) => {
				const absX = x % newWidth;
				const absY = y % WINDOW_HEIGHT;
				const newRadius = Math.min(newWidth, newHeight) / 2;
				const newOffset = { x: absX + newWidth / 2, y: absY + newHeight / 2 };

				setOffset(newOffset);
				setRadius(newRadius);
				setHeight(newHeight);
				setWidth(newWidth);
				setLeft(absX);
				setTop(absY);

				forceUpdate(currentColor, newHeight, newWidth);
			}
		);

	const calcPolar = useCallback(
		(gestureState) => {
			const { pageX, pageY, moveX, moveY } = gestureState;
			const [x, y] = [pageX || moveX, pageY || moveY];
			const [dx, dy] = [x - offset.x, y - offset.y];
			return {
				deg: Math.atan2(dy, dx) * (-180 / Math.PI),
				radius: Math.sqrt(dy * dy + dx * dx) / radius, // pitagoras r^2 = x^2 + y^2 normalized
			};
		},
		[offset.x, offset.y, radius]
	);

	const outBounds = useCallback(
		(gestureState) => {
			const { radius: newRadius } = calcPolar(gestureState);
			return newRadius > 1;
		},
		[calcPolar]
	);

	const resetPanHandler = useCallback(() => {
		if (!panHandlerReady) return false;
		setPanHandlerReady(false);

		pan.setOffset({
			// @ts-ignore
			x: pan.x._value,
			// @ts-ignore
			y: pan.y._value,
		});
		pan.setValue({ x: 0, y: 0 });
	}, [panHandlerReady, pan]);

	const calcCartesian = useCallback(
		(deg, newRadius, newHeight, newWidth) => {
			const rad = (Math.PI * deg) / 180;
			const r = newRadius * radius; // was normalized
			const x = r * Math.cos(rad);
			const y = r * Math.sin(rad);
			return {
				left: (newWidth || width) / 2 + x,
				top: (newHeight || height) / 2 - y,
			};
		},
		[radius, width, height]
	);

	const updateColor = useCallback(
		({ nativeEvent, complete }) => {
			const { deg, radius: newRadius } = calcPolar(nativeEvent);
			const newHsv = { h: deg, s: 100 * newRadius, v: 100 };
			onColorChange?.(newHsv);
			setCurrentColor(colorsys.hsv2Hex(newHsv));
			if (complete) onColorChangeComplete?.(newHsv);
		},
		[calcPolar, onColorChange, onColorChangeComplete]
	);

	const forceUpdate = useCallback(
		(color, newHeight, newWidth) => {
			const { h, s, v } = colorsys.hex2Hsv(color);
			const { left: newLeft, top: newTop } = calcCartesian(
				h,
				s / 100,
				newHeight,
				newWidth
			);
			setCurrentColor(color);
			onColorChange?.({ h, s, v });
			pan.setValue({
				x: newLeft - thumbSize / 2,
				y: newTop - thumbSize / 2,
			});
		},
		[calcCartesian, onColorChange, pan, thumbSize]
	);

	const panResponder = useMemo(
		() =>
			PanResponder.create({
				onStartShouldSetPanResponderCapture: ({ nativeEvent }) => {
					if (outBounds(nativeEvent)) return false;
					updateColor({ nativeEvent });
					setPanHandlerReady(true);
					setColorWheelIsVisible(true);

					Animated.spring(animatedValue, {
						toValue: 1,
					}).start();

					pan.setValue({
						x: -left + nativeEvent.pageX - thumbSize / 2,
						y: -top + nativeEvent.pageY - thumbSize / 2,
					});
					return true;
				},
				onStartShouldSetPanResponder: () => true,
				onMoveShouldSetPanResponderCapture: () => true,
				onPanResponderGrant: () => true,
				onPanResponderMove: (event, gestureState) => {
					if (outBounds(gestureState)) return false;
					resetPanHandler();

					return Animated.event([null, { dx: pan.x, dy: pan.y }], {
						listener: updateColor,
					})(event, gestureState);
				},
				onMoveShouldSetPanResponder: () => true,
				onPanResponderRelease: ({ nativeEvent }) => {
					setPanHandlerReady(true);
					Animated.spring(animatedValue, { toValue: 0 }).start();
					pan.flattenOffset();

					updateColor({ nativeEvent, complete: true });
				},
			}),
		[
			resetPanHandler,
			animatedValue,
			updateColor,
			thumbSize,
			outBounds,
			left,
			pan,
			top,
		]
	);

	const panHandlers = (panResponder && panResponder.panHandlers) || {};

	const CustomThumbStyle = {
		width: thumbSize,
		height: thumbSize,
		borderRadius: thumbSize / 2,
		backgroundColor: currentColor,
		opacity: offset.x === 0 ? 0 : 1,
	};

	return (
		<View
			ref={self}
			{...panHandlers}
			onLayout={onLayout}
			style={[styles.coverResponder, style]}
		>
			<Image
				style={[
					styles.img,
					{ height: radius * 2 - thumbSize, width: radius * 2 - thumbSize },
				]}
				source={ColorWheelImage}
			/>
			{colorWheelIsVisible && (
				<Animated.View
					style={[
						pan.getLayout(),
						styles.circle,
						thumbStyle,
						CustomThumbStyle,
						animatedStyle,
					]}
				/>
			)}
		</View>
	);
};

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
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.8,
		shadowRadius: 2,
	},
});

export default ColorWheel;
