/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('react-native-volume-manager', () => ({
  VolumeManager: {
    addVolumeListener: jest.fn(() => ({ remove: jest.fn() })),
    getVolume: jest.fn().mockResolvedValue({ volume: 0.5, type: 'music' }),
    setVolume: jest.fn().mockResolvedValue(undefined),
  },
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
