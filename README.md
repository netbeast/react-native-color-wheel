# react-native-color-wheel
![npm version](https://badge.fury.io/js/react-native-color-wheel.svg)

:art: A react native reusable and color picker wheel

```javascript
import React, { Component } from 'react';
import {
  Dimensions,
  StyleSheet,
  View
} from 'react-native';
import { ColorWheel } from 'react-native-color-wheel';

export default class Example extends Component {
  render() {
    return (
      <View style={{flex: 1}}>
        <ColorWheel
          initialColor="#ee0000"
          onColorChange={color => console.log({color})}
          style={{width: Dimensions.get('window').width}}
          thumbStyle={{ height: 30, width: 30, borderRadius: 30}} />
        <ColorWheel
          initialColor="#00ee00"
          style={{ marginLeft: 20, padding: 40, height: 200, width: 200 }} />
      </View>
    )
  }
}
```

<img alt="demo screenshot" src="screenshot.png" width="350" />

More documentation is incoming, in the meanwhile please read the source code. It is a single file!
PRs and issues are more than welcome.

<a href="https://getyeti.co" target="_blank">
   <img alt="works with yeti" src="works-with-yeti.png" width="100" />
</a>

> This package powers [Yeti Smart Home](https://getyeti.co) and is used in production.
Follow us in Github or https://twitter.com/netbeast_co.
