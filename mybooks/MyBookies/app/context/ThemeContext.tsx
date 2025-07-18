import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BG_KEY = '@app_bg_color';
const BTN_KEY = '@app_button_color';

interface ThemeContextValue {
  backgroundColor: string;
  buttonColor: string;
  setBackgroundColor: (color: string) => void;
  setButtonColor:     (color: string) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeContext = createContext<ThemeContextValue>({
  backgroundColor: '#FBF5E9',
  buttonColor:     '#AECFA4',
  setBackgroundColor: () => {},
  setButtonColor:     () => {},
});

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [backgroundColor, setBackgroundColorState] = useState('#FBF5E9');
  const [buttonColor,     setButtonColorState]     = useState('#AECFA4');

  useEffect(() => {
    (async () => {
      const savedBg  = await AsyncStorage.getItem(BG_KEY);
      const savedBtn = await AsyncStorage.getItem(BTN_KEY);
      if (savedBg)  setBackgroundColorState(savedBg);
      if (savedBtn) setButtonColorState(savedBtn);
    })();
  }, []);

  const setBackgroundColor = (color: string) => {
    setBackgroundColorState(color);
    AsyncStorage.setItem(BG_KEY, color).catch(console.error);
  };

  const setButtonColor = (color: string) => {
    setButtonColorState(color);
    AsyncStorage.setItem(BTN_KEY, color).catch(console.error);
  };

  return (
    <ThemeContext.Provider
      value={{
        backgroundColor,
        buttonColor,
        setBackgroundColor,
        setButtonColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
