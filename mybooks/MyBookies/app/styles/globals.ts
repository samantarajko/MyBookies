// styles/globals.ts
import { StyleSheet, Platform } from 'react-native';
export const globalstyles = StyleSheet.create({
  background: {
    backgroundColor: '#FBF5E9'
  },
  hotbar: {
    zIndex: 10,
    bottom: 0,
    height: 100,
  },
  lineAboveHotbar: {
    width: '100%',
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10, // adjust as needed for your PNG
    bottom: 92.5, // typical tab bar height; adjust to your actual value
    zIndex: 1,
  },
  button1: {
    borderWidth: 1,
    borderColor: 'black',
    borderRadius: 10,
    paddingHorizontal: 20,   // same 10x side padding
    paddingVertical: 8,      // reduced for a smaller button
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  buttoncolor: {
    backgroundColor: '#AECFA4',
  },
  buttoncolorbad: {
    backgroundColor: '#B7C0B4',
  },
  tableTitle: {
    fontSize: 32,
    lineHeight: 36,
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif', // closest fallback on Android
      default: 'Times New Roman',
    }),
    fontWeight: 'normal',
    color: 'black',
    marginBottom: 1,
    marginTop: 30,
  },
});


