/**
 * Minimal CJS Jest setup — avoids @react-native/jest-preset ESM/Flow issues with pnpm.
 * Provides just enough globals for React Native component imports to resolve.
 */

'use strict';

/* global jest */

global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

Object.defineProperties(global, {
    __DEV__: {
        configurable: true,
        enumerable: true,
        value: true,
        writable: true,
    },
    cancelAnimationFrame: {
        configurable: true,
        enumerable: true,
        value: function (id) {
            return clearTimeout(id);
        },
        writable: true,
    },
    requestAnimationFrame: {
        configurable: true,
        enumerable: true,
        value: function (callback) {
            return setTimeout(function () {
                return callback(Date.now());
            }, 0);
        },
        writable: true,
    },
    window: {
        configurable: true,
        enumerable: true,
        value: global,
        writable: true,
    },
});
// React Native 0.76+ (New Architecture / TurboModules) test mocks.
// Prevents '__fbBatchedBridgeConfig is not set' and 'TurboModuleRegistry.getEnforcing' errors.
global.__fbBatchedBridgeConfig = {};
global.__turboModuleProxy = function (name) {
    return {
        getConstants() {
            return {};
        },
    };
};

// Provide stubs for commonly required TurboModules.
jest.mock('react-native/Libraries/TurboModule/TurboModuleRegistry', () => ({
    getEnforcing: jest.fn((name) => {
        const stubs = {
            NativeSafeAreaProvider: {
                getConstants() {
                    return {
                        initialWindowMetrics: {
                            insets: { top: 0, right: 0, bottom: 0, left: 0 },
                            frame: { x: 0, y: 0, width: 390, height: 844 },
                        },
                    };
                },
            },
            SourceCode: {
                getConstants() {
                    return { scriptURL: 'file:///app.js' };
                },
            },
        };
        return stubs[name] || { getConstants() { return {}; } };
    }),
    get: jest.fn(() => null),
}));

// Initialize Dimensions so PixelRatio and SafeAreaProvider can resolve.
jest.mock('react-native/Libraries/Utilities/Dimensions', () => {
    const dimensions = {
        window: { width: 390, height: 844, scale: 2, fontScale: 1 },
        screen: { width: 390, height: 844, scale: 2, fontScale: 1 },
    };
    return {
        get: jest.fn((key) => dimensions[key]),
        set: jest.fn(),
        addEventListener: jest.fn(),
    };
});

jest.mock(
    'react-native/Libraries/ReactNative/UIManager',
    () => require('@react-native/jest-preset/jest/mocks/UIManager')
);
jest.mock('react-native/Libraries/Text/Text', () =>
    require('@react-native/jest-preset/jest/mocks/Text')
);
jest.mock(
    'react-native/Libraries/Utilities/useColorScheme',
    () => require('@react-native/jest-preset/jest/mocks/useColorScheme')
);
jest.mock(
    'react-native/Libraries/Vibration/Vibration',
    () => require('@react-native/jest-preset/jest/mocks/Vibration')
);
