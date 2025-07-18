// NotificationPage.tsx
import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  Button,
  TextInput,
  Modal,
  Image as Img
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { NativeModules } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { globalstyles } from '../styles/globals';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ImageBackground } from 'react-native';



const { NotificationManagerModule } = NativeModules;
const STORAGE_KEY = '@notification_times';
const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://localhost:5000';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function requestPermissions(): Promise<boolean> {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const result = await Notifications.requestPermissionsAsync();
    status = result.status;
  }
  if (status !== 'granted') {
    Alert.alert('Permission required', 'Please enable notifications in settings.');
    return false;
  }
  return true;
}

async function scheduleOne(time: Date): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: '📖 Your Book Journey Awaits',
      body: 'Open your favorite story and escape for a while ✨',
      sound: true,

    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: time.getHours(),
      minute: time.getMinutes(),
    },
  });
  return id;
}

export default function NotificationPage() {
  const {
    backgroundColor,
    buttonColor,
    setBackgroundColor,
    setButtonColor,
  } = useTheme();
  const { userId, logout } = useAuth();

  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [username, setUsername] = useState<string | null>(null);

  const [times, setTimes] = useState<Date[]>([]);
  const [pickerTime, setPickerTime] = useState<Date>(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);

  const [selectedBg, setSelectedBg] = useState(backgroundColor);
  const [selectedBtn, setSelectedBtn] = useState(buttonColor);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [showBtnPicker, setShowBtnPicker] = useState(false);

  useEffect(() => { setSelectedBg(backgroundColor); }, [backgroundColor]);
  useEffect(() => { setSelectedBtn(buttonColor); }, [buttonColor]);


  useEffect(() => {
    (async () => {
      const ok = await requestPermissions();
      if (!ok) return;
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const loaded = JSON.parse(json) as { time: string; id: string }[];
        setTimes(loaded.map(item => new Date(item.time)));
      }
      try {
        const res = await fetch(`${API_URL}/username/${userId}`);
        if (res.ok) {
          const data = await res.json();
          setUsername(data.username);
        }
      } catch { }
    })();
  }, []);


  useEffect(() => {
    (async () => {
      const ok = await requestPermissions();
      if (!ok) return;
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) {
        const loaded = JSON.parse(json) as { time: string; id: string }[];
        setTimes(loaded.map(item => new Date(item.time)));
      }
    })();
  }, []);

  const saveAll = async (newTimes: Date[]) => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const arr: { time: string; id: string }[] = [];
    for (const t of newTimes) {
      const id = await scheduleOne(t);
      arr.push({ time: t.toISOString(), id });
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    setTimes(newTimes);
  };

  const addTime = async (t: Date) => {
    const ok = await requestPermissions();
    if (!ok) return;
    if (times.some(x => x.getHours() === t.getHours() && x.getMinutes() === t.getMinutes())) {
      Alert.alert('Exists', 'This time is already in your list.');
      return;
    }
    const list = [...times, t].sort((a, b) => a.getTime() - b.getTime());
    await saveAll(list);
    Alert.alert('Added', 'New reminder time added.');
  };

  const removeTime = async (i: number) => {
    const list = times.filter((_, idx) => idx !== i);
    await saveAll(list);
    Alert.alert('Removed', 'Reminder time removed.');
  };

  const onChange = (e: DateTimePickerEvent, date?: Date) => {
    setShowTimePicker(false);
    if (e.type === 'set' && date) addTime(date);
  };

  const handleEditUsername = async () => {
    try {
      const res = await fetch(`${API_URL}/username/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername }),
      });
      if (res.ok) {
        const data = await res.json();
        setUsername(data.username);
        setEditingUsername(false);
        Alert.alert('Success', 'Username updated!');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to update username');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleLogout = () => {
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => { });
    Notifications.cancelAllScheduledNotificationsAsync();
    logout();
  };

  const handlePress = async () => {
    try {
      const result = await NotificationManagerModule.sayHello();
      Alert.alert('Native Module Response', result);
    } catch {
      Alert.alert('Error', 'Failed to call native method');
    }
  };

  const handleOpenPasswordModal = () => setShowPasswordModal(true);
  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordChanging(false);
  };

  const handleSubmitPasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    setPasswordChanging(true);
    try {
      const res = await fetch(`${API_URL}/change_password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Password updated successfully');
        handleClosePasswordModal();
      } else {
        Alert.alert('Error', data.error || 'Failed to change password');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    }
    setPasswordChanging(false);
  };


  const BackgroundColorPicker = ({
    value,
    onSelect,
  }: { value: string; onSelect: (c: string) => void }) => {
    const palette = [
      '#FAF9F6', '#F5F2EC', '#EAF5F1', '#E8F1FA',
      '#F7EEF8', '#F9F7EC', '#FFF9E8', '#F0EFFF',
    ];
    const defaults = ['#FBF5E9'];
    return (
      <View>
        <View style={styles.colorGrid}>
          {palette.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                value === c && styles.selectedSwatch,
              ]}
              onPress={() => onSelect(c)}
            />
          ))}
        </View>
        <View style={styles.defaultSection}>
          <Text style={styles.defaultLabel}>Default Background</Text>
          <View style={styles.defaultColorRow}>
            {defaults.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  value === c && styles.selectedSwatch,
                ]}
                onPress={() => onSelect(c)}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };


  const ButtonColorPicker = ({
    value,
    onSelect,
  }: { value: string; onSelect: (c: string) => void }) => {
    const palette = [

      '#B1D27B',
      '#A6C875',

      '#F5F2EC',
      '#D1DCC6',


      '#EAF3E4',
      '#EAF5F1',


      '#E8F1FA',
      '#4F4F4F',
    ];

    const defaults = ['#AECFA4'];
    return (
      <View>
        <View style={styles.colorGrid}>
          {palette.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                value === c && styles.selectedSwatch,
              ]}
              onPress={() => onSelect(c)}
            />
          ))}
        </View>
        <View style={styles.defaultSection}>
          <Text style={styles.defaultLabel}>Default Button</Text>
          <View style={styles.defaultColorRow}>
            {defaults.map(c => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  value === c && styles.selectedSwatch,
                ]}
                onPress={() => onSelect(c)}
              />
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={[{ backgroundColor }, styles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={{ padding: 16 }}>
          <ThemedText style={globalstyles.tableTitle}>Explorer ID</ThemedText>
          <Img
            source={require('../../assets/images/Line2.png')}
            style={{
              width: '110%',
              height: 10,
              marginTop: 15,
              marginBottom: 15,
              marginLeft: '-5%',
              marginRight: '-5%',
              alignSelf: 'center',
            }}
            resizeMode="contain"
          />

          <Text style={styles.userpass}>
            Username:
          </Text>
          {/* Username */}

          <View style={[styles.rowLeft, { justifyContent: 'space-between', alignItems: 'center', minHeight: 48, marginBottom: 0 }]}>
            {!editingUsername ? (
              username && (
                <>
                  <Text style={styles.username}>{username}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingUsername(true);
                      setNewUsername(username);
                    }}
                    style={[globalstyles.button1, { backgroundColor: buttonColor, paddingVertical: 1 }]}
                  >
                    <Text style={{ color: 'black' }}>Edit</Text>
                  </TouchableOpacity>
                </>
              )
            ) : (
              <>
                <TextInput
                  style={[styles.input, { flex: 1, marginRight: 12 }]}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoFocus
                  placeholder="New username"
                />
                <TouchableOpacity
                  onPress={handleEditUsername}
                  style={[globalstyles.button1, { backgroundColor: buttonColor, paddingVertical: 4 }]}
                >
                  <Text style={{ fontWeight: 'bold', color: 'black' }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setEditingUsername(false)}
                  style={[styles.smallButton, { marginLeft: 8, alignSelf: 'center', height: 40, justifyContent: 'center', paddingVertical: 4 }]}
                >
                  <Text style={[styles.linkText, { color: '#FF3B30' }]}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <Img
            source={require('../../assets/images/Line3.png')}
            style={{
              width: '130%',
              height: 4,
              marginBottom: 20,
              alignSelf: 'center',
              opacity: 0.9,

            }}
            resizeMode="contain"
          />
          <Text style={styles.userpass}>
            Password:
          </Text>
          {/* Password */}
          <View style={[styles.rowLeft, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 0 }}>
              <Text style={styles.passwordAsterisks}>********</Text>
            </View>
            <TouchableOpacity
              onPress={handleOpenPasswordModal}
              style={[globalstyles.button1, { backgroundColor: buttonColor, paddingVertical: 1, marginBottom: 0 }]}
            >
              <Text style={{ color: 'black' }}>Edit</Text>
            </TouchableOpacity>
          </View>


          {/* Password Modal */}
          <Modal visible={showPasswordModal} transparent animationType="fade">
            <View style={[styles.modalOverlay]}>
              <View style={[styles.modalContent, , { backgroundColor }]}>
                <Text style={styles.modalTitle}>Change Password</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Current Password"
                  secureTextEntry
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="New Password"
                  secureTextEntry
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TextInput
                  style={styles.modalInput}
                  placeholder="Confirm New Password"
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <View style={styles.pickerButtons}>
                  <TouchableOpacity
                    style={[globalstyles.button1, { backgroundColor: buttonColor, paddingHorizontal: 20 }]}
                    onPress={handleSubmitPasswordChange}
                    disabled={passwordChanging}
                  >
                    <Text style={styles.pickerButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[globalstyles.button1, globalstyles.buttoncolorbad]}
                    onPress={handleClosePasswordModal}
                    disabled={passwordChanging}
                  >
                    <Text style={styles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

          </Modal>
        </View>
        <Img
          source={require('../../assets/images/Line3.png')}
          style={{
            width: '130%',
            height: 4,
            marginBottom: 0,
            marginTop: 0,
            alignSelf: 'center',
            opacity: 0.9,
            marginVertical: 0
          }}
          resizeMode="contain"
        />


        <View style={{
          width: '100%',
          backgroundColor: '#fff',
          paddingHorizontal: 16,
          paddingVertical: 0,
        }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: 18,
              marginTop: 20,
              color: 'black',
              fontFamily: Platform.select({
                ios: 'Times New Roman',
                android: 'serif',
                default: 'Times New Roman',
              }),
            }}>Personalization of the app</Text>
            <Img
              source={require('../../assets/images/Line3.png')}
              style={{
                width: '75%',
                height: 4,
                marginBottom: 0,
                marginTop: 0,
                alignSelf: 'center',
                opacity: 0.9,
                marginVertical: 0
              }}
              resizeMode="contain"
            />
          </View>

          {/* --- Background Color Row --- */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 20,
              marginBottom: 16,
            }}
          >
            <Text style={styles.userpass}>Background color:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ImageBackground
                source={require('../../assets/images/rectangle.png')}
                style={{
                  width: 30,
                  height: 30,
                  marginRight: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                imageStyle={{ resizeMode: 'stretch' }}
              >
                <View
                  style={{
                    width: 25,
                    height: 25,
                    borderRadius: 5,
                    backgroundColor: selectedBg,
                  }}
                />
              </ImageBackground>

              <TouchableOpacity
                onPress={() => setShowBgPicker(true)}
                style={{ padding: 4 }}
              >
                <Img
                  source={require('../../assets/images/colorpicker.png')}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Background Color Modal */}
          <Modal visible={showBgPicker} transparent animationType="slide">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Pick a background color</Text>
                <BackgroundColorPicker value={selectedBg} onSelect={setSelectedBg} />
                <View style={styles.pickerButtons}>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: buttonColor }]}
                    onPress={() => {
                      setBackgroundColor(selectedBg);
                      setShowBgPicker(false);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: '#aaa' }]}
                    onPress={() => {
                      setSelectedBg(backgroundColor);
                      setShowBgPicker(false);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text style={styles.userpass}>Button color:</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Swatch with IMAGE BORDER (rectangle.png) */}
              <ImageBackground
                source={require('../../assets/images/rectangle.png')}
                style={{
                  width: 30,
                  height: 30,
                  marginRight: 10,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                imageStyle={{ resizeMode: 'stretch' }}
              >
                <View
                  style={{
                    width: 25,
                    height: 25,
                    borderRadius: 5,
                    backgroundColor: selectedBtn,
                  }}
                />
              </ImageBackground>

              <TouchableOpacity
                onPress={() => setShowBtnPicker(true)}
                style={{ padding: 4 }}
              >
                <Img
                  source={require('../../assets/images/colorpicker.png')}
                  style={{ width: 28, height: 28 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>



          <Modal visible={showBtnPicker} transparent animationType="slide">
            <View style={styles.pickerOverlay}>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerTitle}>Pick a button color</Text>
                <ButtonColorPicker value={selectedBtn} onSelect={setSelectedBtn} />
                <View style={styles.pickerButtons}>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: selectedBtn }]}
                    onPress={() => {
                      setButtonColor(selectedBtn);
                      setShowBtnPicker(false);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.pickerButton, { backgroundColor: '#aaa' }]}
                    onPress={() => {
                      setSelectedBtn(buttonColor);
                      setShowBtnPicker(false);
                    }}
                  >
                    <Text style={styles.pickerButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </View>


        <Img
          source={require('../../assets/images/Line3.png')}
          style={{
            width: '130%',
            height: 4,
            marginBottom: 0,
            marginTop: 0,
            alignSelf: 'center',
            opacity: 0.9,
            marginVertical: 0
          }}
          resizeMode="contain"
        />


        <View style={{ alignItems: 'center', marginLeft: 20, marginRight: 20 }}>
          <Text style={{
            fontSize: 18,
            marginTop: 20,
            color: 'black',
            fontFamily: Platform.select({
              ios: 'Times New Roman',
              android: 'serif',
              default: 'Times New Roman',
            }),
          }}>Time to turn the page...</Text>
          <Text style={{
            fontSize: 12,
            color: 'black',
            textAlign: 'center',
            fontFamily: Platform.select({
              ios: 'Times New Roman',
              android: 'serif',
              default: 'Times New Roman',
            }),
          }}>...take your time to relax, make yourself a hot cup of tea and step into stories where every page is an adventure</Text>
          <Text style={{
            fontSize: 12,
            color: 'black',
            textAlign: 'center',
            fontFamily: Platform.select({
              ios: 'Times New Roman',
              android: 'serif',
              default: 'Times New Roman',
            }),
          }}>Tap "+ Add Time" to add; tap a time to remove</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 0, padding: 16 }}>
            <TouchableOpacity
              style={[
                globalstyles.button1,
                { backgroundColor: buttonColor, marginRight: 12, marginBottom: 12, paddingVertical: 5, paddingHorizontal: 4, marginLeft: 5 }
              ]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.addButtonText}>＋ Add Time</Text>
            </TouchableOpacity>
            {times.map((t, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.timeItem,
                ]}
                onPress={() =>
                  Alert.alert(
                    'Remove?',
                    `Remove ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => removeTime(i) },
                    ]
                  )
                }
              >
                <Text style={styles.timeText}>
                  {t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showTimePicker && (
            <DateTimePicker
              value={pickerTime}
              mode="time"
              is24Hour
              display="default"
              onChange={onChange}
            />
          )}
        </View>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <TouchableOpacity
            style={[globalstyles.button1, { backgroundColor: '#FFBFC5', paddingHorizontal: 30, paddingVertical: 7, marginBottom: 20 }]}
            onPress={handleLogout}
          >
            <Text style={{
              color: 'black', fontWeight: 'bold', textAlign: 'center', fontSize: 16, fontFamily: Platform.select({
                ios: 'Times New Roman',
                android: 'serif',
                default: 'Times New Roman',
              }),
            }}>
              Log Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ThemedView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, alignItems: 'center', flexGrow: 1 },
  title: {
    fontSize: 28, fontWeight: '700', color: '#333', marginBottom: 10, textAlign: 'center'
  },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 20, textAlign: 'center' },
  rowLeft: { width: '100%', flexDirection: 'row', marginBottom: 0 },
  smallButton: { marginLeft: 8, padding: 4 },
  linkText: { color: '#007AFF', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, minWidth: 100, marginRight: 8 },
  username: { fontSize: 18, color: 'black' },
  passwordLabel: { fontSize: 16, color: '#444', fontWeight: 'bold' },
  passwordAsterisks: { fontSize: 18, color: '#333', letterSpacing: 2 },
  timeItem: {
    paddingVertical: 4, backgroundColor: 'white',
    borderRadius: 8, alignItems: 'center', paddingHorizontal: 16, borderWidth: 1, marginLeft: 6, marginRight: 6, marginBottom: 6,
    borderColor: 'black',
  },
  timeText: {
    fontSize: 15, color: 'black', fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }),
  },
  addButton: {
    marginTop: 20, paddingVertical: 12, paddingHorizontal: 20,
    borderRadius: 8
  },
  addButtonText: { color: 'black', fontSize: 14 },
  logoutContainer: { marginTop: 40, width: '100%' },
  bottomContainer: { marginTop: 20, width: '100%', alignItems: 'center' },


  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center'
  },
  modalContent: {
    width: 320, backgroundColor: '#fff', borderRadius: 12,
    padding: 24, elevation: 6
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  modalInput: {
    borderWidth: 1, borderColor: '#ccc', borderRadius: 8,
    padding: 10, fontSize: 16, marginTop: 10
  },

  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center'
  },
  pickerContainer: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 20, margin: 20, minWidth: 300
  },
  pickerTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  colorGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    justifyContent: 'center', marginBottom: 20
  },
  colorSwatch: {
    width: 50, height: 50, borderRadius: 25,
    margin: 5, borderWidth: 2, borderColor: '#ddd'
  },
  selectedSwatch: {
    borderColor: '#333', borderWidth: 3
  },
  pickerButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  pickerButton: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    marginHorizontal: 5, alignItems: 'center'
  },
  pickerButtonText: {
    fontSize: 16,
    color: 'black',
  },

  defaultSection: {
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: '#eee'
  },
  defaultLabel: {
    fontSize: 14, fontWeight: '600', color: '#666',
    textAlign: 'center', marginBottom: 10
  },
  defaultColorRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center'
  },
  scrollContainer: { flexGrow: 1, padding: 0 },
  userpass: {
    fontSize: 16,
    color: 'black',
    marginBottom: 0,
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }),
  }
});
