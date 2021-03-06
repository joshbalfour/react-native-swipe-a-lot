import React, {
  Component,
} from 'react'
import ReactNative, {
  Platform,
  ScrollView,
  View,
  ViewPagerAndroid,
  ViewPropTypes,
  Dimensions,
} from 'react-native'
import {PropTypes} from 'prop-types'

import Circles from './Circles'
import FixedSizeView from './FixedSizeView'
import reducer from './reducer'

import { createStore } from 'redux'

import { EventEmitter } from 'events'

export default class SwipeALot extends Component {
  constructor(props) {
    super(props)

    this.store = createStore(reducer)
    this.emitter = new EventEmitter()

    this.autoplayInterval = null
    this.autoplayPageCurrentlyBeingTransitionedTo = 0
  }

  getAutoplaySettings() {
    // This seems to be the recommended way to setup default props with nested objects
    // See https://github.com/facebook/react/issues/2568
    return Object.assign({
      enabled: false,
      disableOnSwipe: false,
      delayBetweenAutoSwipes: 5000
    }, this.props.autoplay)
  }

  onSetActivePage(page) {
    if (this.props.onSetActivePage) {
      this.props.onSetActivePage(page)
    }
  }

  componentDidMount() {

    this.store.dispatch({
      type: 'SET_ACTIVE_PAGE',
      page: this.props.initialPage || 0
    })

    this.swipeToPageListener = ({ page, disableAnimation }) => {
      this.store.dispatch({
        type: 'SET_ACTIVE_PAGE',
        page
      })

      if (false) {
        this.swiper.setPage(page)
      }
      else {
        const { width } = this.store.getState()

        this.swiper.scrollTo({
          x: page * (width || Dimensions.get('window').width),
          animated: !disableAnimation,
        })
      }

      this.onSetActivePage(page)
      if (this.getAutoplaySettings().disableOnSwipe &&
        this.autoplayPageCurrentlyBeingTransitionedTo !== page) {
        this.stopAutoplay()
      }
    }

    this.emitter.addListener('swipeToPage', this.swipeToPageListener)

    if (this.getAutoplaySettings().enabled) {
      this.startAutoplay()
    }
  }

  componentWillUnmount() {
    this.emitter.removeListener('swipeToPage', this.swipeToPageListener)
  }

  startAutoplay() {
    if (this.autoplayInterval) return

    this.autoplayInterval = setInterval(() => {
      let { page } = this.store.getState()
      const numOfPages = this.props.children.length || 1
      page++
      if (page >= numOfPages) page = 0
      this.swipeToPage(page)
      this.autoplayPageCurrentlyBeingTransitionedTo = page
    }, this.getAutoplaySettings().delayBetweenAutoSwipes)
  }

  stopAutoplay() {
    if (!this.autoplayInterval) return

    clearInterval(this.autoplayInterval)
  }

  getPage() {
    let { page } = this.store.getState()
    return page
  }

  swipeToPage(page, disableAnimation) {
    this.emitter.emit('swipeToPage', { page, disableAnimation })
  }

  static get propTypes() {
    return {
      wrapperStyle: PropTypes.object,
      circleWrapperStyle: ViewPropTypes.style,
      circleDefaultStyle: ViewPropTypes.style,
      circleActiveStyle: ViewPropTypes.style,
      children: PropTypes.any,
      emitter: PropTypes.object,
      autoplay: PropTypes.object,
      scrollEnabled: PropTypes.bool,
      onSetActivePage: PropTypes.func,
    }
  }

  render() {
    let {
      wrapperStyle,
      circleWrapperStyle,
      circleDefaultStyle,
      circleActiveStyle,
      children,
      emitter,
      autoplay,
      onSetActivePage,
      getCircleActiveStyle,
      scrollEnabled,
      ...props
    } = this.props;

    if (scrollEnabled === undefined) {
      scrollEnabled = true
    }

    return (
      <View style={[wrapperStyle, {flex: 1}]} onLayout={() => {
          const page = this.getPage()
          this.swipeToPage(page, true)
        }}>
        {(() => {
          if (true) {
            return (
              <ScrollView
                ref={(c) => this.swiper = c}
                pagingEnabled={true}
                horizontal={true}
                bounces={false}
                removeClippedSubviews={true}
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const { width } = this.store.getState()
                  const page = e.nativeEvent.contentOffset.x / width
                  this.swipeToPage(page)
                }}
                scrollEnabled={scrollEnabled}
                onLayout={(event) => {
                  const {x, y, width, height} = event.nativeEvent.layout
                  this.store.dispatch({
                    type: 'SET_DIMS',
                    width,
                    height
                  })
                }}
                automaticallyAdjustContentInsets={false}
                {...props}
              >
                {React.Children.map(children, (c, i) => {
                  return <FixedSizeView store={this.store} key={`view${i}`}>{c}</FixedSizeView>
                })}
              </ScrollView>
            )
          }
          else if (Platform.OS === 'android') {
            return (
              <ViewPagerAndroid
                ref={(c) => this.swiper = c}
                initialPage={0}
                onPageSelected={(e) => {
                  this.swipeToPage(e.nativeEvent.position)
                }}
                style={{
                  flex: 1
                }}>
                {React.Children.map(children, (c) => {
                  return <View>{c}</View>
                })}
              </ViewPagerAndroid>
            )
          }
        })()}
        <Circles store={this.store} emitter={this.emitter}
          circleWrapperStyle={circleWrapperStyle}
          circleDefaultStyle={circleDefaultStyle}
          circleActiveStyle={circleActiveStyle}
          getCircleActiveStyle={getCircleActiveStyle}>
          {children}
        </Circles>
      </View>
    )
  }
}
