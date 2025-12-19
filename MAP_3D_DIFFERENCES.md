# Map 3D Buildings: Web vs Mobile Differences

## What Web App Has (Working ✅)

### 1. **Map Style**
```javascript
style: 'mapbox://styles/mapbox/standard'
```
- Uses **Mapbox Standard style** which has advanced 3D building support built-in

### 2. **Initialization Configuration**
```javascript
config: {
  basemap: {
    show3dObjects: true,
    show3dBuildings: true,
    show3dTrees: true,
    show3dLandmarks: true,
    show3dFacades: true,
    lightPreset: isDarkMode ? 'night' : 'day',
  },
}
```
- Passes 3D configuration **during map initialization**
- Uses `mapbox-gl` JavaScript SDK which supports `config` parameter

### 3. **Runtime Configuration**
```javascript
map.current.setConfigProperty('basemap', 'show3dBuildings', true)
map.current.setConfigProperty('basemap', 'show3dObjects', true)
// ... etc
```
- Direct access to map instance
- Can call `setConfigProperty()` method directly
- Works because web SDK exposes these APIs

---

## What Mobile App Has (Current State ❌)

### 1. **Map Style**
```javascript
styleURL: isDarkMode 
  ? "mapbox://styles/mapbox/dark-v11" 
  : "mapbox://styles/mapbox/light-v11"
```
- ❌ **NOT using Standard style** - using older v11 styles
- v11 styles have basic 3D buildings but not as advanced as Standard

### 2. **Initialization Configuration**
```javascript
// React Native Mapbox doesn't support config parameter
<MapboxGL.MapView styleURL={styleURL} />
```
- ❌ **Cannot pass `config` object** during initialization
- `@rnmapbox/maps` doesn't expose this API
- Native SDKs (iOS/Android) may not support it the same way

### 3. **Runtime Configuration**
```javascript
// Attempting to access native map instance
const nativeMap = mapRef.current?.getMap?.() || mapRef.current?._nativeMap;
if (nativeMap?.setConfigProperty) {
  nativeMap.setConfigProperty('basemap', 'show3dBuildings', true);
}
```
- ❌ **Cannot access native map instance** properly
- `getMap()` method may not exist in React Native wrapper
- `_nativeMap` internal property may not be accessible
- `setConfigProperty` may not be available in native SDKs

---

## What's Missing / Not Working

### Issue #1: Style Mismatch
- **Web**: `mapbox://styles/mapbox/standard` ✅
- **Mobile**: `mapbox://styles/mapbox/dark-v11` ❌
- **Impact**: Standard style has better 3D buildings than v11 styles

### Issue #2: No Initialization Config Support
- **Web**: Can pass `config.basemap` during map creation ✅
- **Mobile**: No way to pass config during initialization ❌
- **Impact**: Cannot enable 3D features at startup

### Issue #3: No Runtime API Access
- **Web**: Direct access to `map.setConfigProperty()` ✅
- **Mobile**: Cannot access native map instance or its methods ❌
- **Impact**: Cannot configure 3D features after map loads

### Issue #4: SDK API Differences
- **Web**: Uses `mapbox-gl` JavaScript SDK with full Standard style API ✅
- **Mobile**: Uses `@rnmapbox/maps` wrapper around native iOS/Android SDKs ❌
- **Impact**: Native SDKs may have different/different APIs than web SDK

---

## What Needs to Happen

### Option 1: Use Standard Style (If Supported)
1. Change `styleURL` to `"mapbox://styles/mapbox/standard"`
2. Standard style should enable 3D buildings automatically
3. May still need to configure via `setConfigProperty` if available

### Option 2: Access Native Map Instance
1. Find correct way to access native map instance in `@rnmapbox/maps`
2. May require checking:
   - `mapRef.current.getMap()`
   - `mapRef.current._nativeMap`
   - Platform-specific access methods
   - Bridge methods exposed by React Native wrapper

### Option 3: Use Custom Mapbox Style
1. Create custom style in Mapbox Studio with 3D buildings enabled
2. Use custom style URL instead of Standard
3. 3D buildings configured in style itself

### Option 4: Check SDK Version
1. Verify `@rnmapbox/maps` version supports Standard style
2. May need to upgrade to latest version
3. Check if native SDKs (iOS v11+, Android v11+) are being used

---

## Current Code Status

✅ **Working:**
- Map displays correctly
- Pitch set to 45° for 3D view
- Camera controls work

❌ **Not Working:**
- Standard style not being used
- Cannot configure 3D features
- Cannot access native map APIs
- 3D buildings not appearing

---

## Next Steps to Debug

1. **Check Console Logs**: Look for messages about:
   - Native map instance access
   - `setConfigProperty` availability
   - Style loading errors

2. **Try Standard Style**: Change to Standard style and see if it loads
   - If it loads but no 3D buildings → API access issue
   - If it doesn't load → SDK version or token issue

3. **Check @rnmapbox/maps Documentation**: Look for:
   - Standard style support
   - Native map instance access methods
   - 3D building configuration examples

4. **Test on Physical Device**: Simulators may have limitations, but user confirmed simulator should work


