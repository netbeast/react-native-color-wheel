declare module 'react-native-color-wheel' {
	import React from 'react';
	import { StyleProp, ViewStyle } from 'react-native';

	type HsvColor = { h: number; s: number; v: number };

	export type ColorWheelProp = {
		thumbSize?: number;
		initialColor?: string;
		thumbStyle?: StyleProp<ViewStyle>;
		onColorChange?: (color: HsvColor) => void;
		onColorChangeComplete?: (color: HsvColor) => void;
	};

	export const ColorWheel: React.ComponentType<ColorWheelProp>;
}
