import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
  Button,
  TouchableOpacity,
  ScrollView,
  Image as Img,
  ImageBackground
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calendar } from 'react-native-calendars';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { globalstyles } from '../styles/globals';
import { useTheme } from '../context/ThemeContext';

function getCurrentWeekDates() {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://localhost:5000';

export default function ChallengesScreen() {

  const { userId } = useAuth();

  const [finishedThisMonth, setFinishedThisMonth] = useState([]);
  const [finishedThisYear, setFinishedThisYear] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingYear, setLoadingYear] = useState(true);

  const monthlyTarget = 5;
  const [yearlyTarget, setYearlyTarget] = useState(50);

  const weekDates = getCurrentWeekDates();
  const [weekCheckins, setWeekCheckins] = useState<{ [date: string]: boolean }>({});
  const [checkinModalVisible, setCheckinModalVisible] = useState(false);

  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [inputValue, setInputValue] = useState('');

  type RatingSummary = {
    total_books: number;
    rating_counts: Record<string, number>;
    average_rating: number | null;
  };

  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);

  const [loadingRating, setLoadingRating] = useState(true);

  const fetchRatingSummary = useCallback(() => {
    if (!userId) return;
    setLoadingRating(true);
    fetch(`${API_URL}/books/${userId}/rating_summary`)
      .then(res => res.json())
      .then(data => {
        setRatingSummary(data);
        setLoadingRating(false);
      })
      .catch(() => {
        setRatingSummary(null);
        setLoadingRating(false);
      });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const storedYearly = await AsyncStorage.getItem('yearlyTarget');
      const storedCheckins = await AsyncStorage.getItem(`weekCheckins_${userId}`);
      if (storedYearly) setYearlyTarget(parseInt(storedYearly, 10));
      if (storedCheckins) setWeekCheckins(JSON.parse(storedCheckins));
    })();
  }, [userId]);

  const saveYearlyTarget = async () => {
    const value = Math.max(1, parseInt(inputValue, 10) || 1);
    setYearlyTarget(value);
    await AsyncStorage.setItem('yearlyTarget', String(value));
    setTargetModalVisible(false);
  };

  const fetchMonthData = useCallback(() => {
    if (!userId) return;
    setLoadingMonth(true);
    fetch(`${API_URL}/books/finished_this_month?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        setBooksReadMonth(data.count ?? 0);
        setLoadingMonth(false);
      })
      .catch(() => {
        setBooksReadMonth(0);
        setLoadingMonth(false);
      });
  }, [userId]);


  const fetchYearData = useCallback(() => {
    if (!userId) return;
    setLoadingYear(true);
    fetch(`${API_URL}/books/finished_this_year?user_id=${userId}`)
      .then(res => res.json())
      .then(data => {
        setBooksReadYear(data.count ?? 0);
        setLoadingYear(false);
      })
      .catch(() => {
        setBooksReadYear(0);
        setLoadingYear(false);
      });
  }, [userId]);


  useFocusEffect(
    useCallback(() => {
      fetchMonthData();
      fetchYearData();
      fetchRatingSummary();
    }, [fetchMonthData, fetchYearData, fetchRatingSummary])
  );

  const [booksReadMonth, setBooksReadMonth] = useState(0);

  const [booksReadYear, setBooksReadYear] = useState(0);


  const { buttonColor, backgroundColor } = useTheme();


  return (
    <ThemedView style={[{ backgroundColor: backgroundColor }, styles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText style={globalstyles.tableTitle}>Quests</ThemedText>
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
        <Text style={styles.subtitle}>
          Complete interesting quests by going through countless adventures and stories...{'\n'}
          Forge your destiny, one quest at a time
        </Text>

        {/* ---- RATINGS ---- */}
        <ImageBackground
          source={require('../../assets/images/kvadrat.png')}
          style={styles.imageBorder}
          imageStyle={styles.borderImageStyle}
        >
          <View style={styles.ratingSummaryBox}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{
                fontFamily: Platform.select({
                  ios: 'Times New Roman',
                  android: 'serif',
                  default: 'Times New Roman',
                }), fontSize: 18, marginBottom: 12
              }}>Milestones:</Text>
            </View>
            {loadingRating ? (
              <Text>Loading...</Text>
            ) : ratingSummary ? (
              <>
                <Text style={styles.ratingText}>Read books:............................................................ {ratingSummary.total_books}</Text>
                <Text style={styles.ratingText}>1 star books:........................................................... {ratingSummary.rating_counts['1'] || 0}</Text>
                <Text style={styles.ratingText}>2 star books:........................................................... {ratingSummary.rating_counts['2'] || 0}</Text>
                <Text style={styles.ratingText}>3 star books:........................................................... {ratingSummary.rating_counts['3'] || 0}</Text>
                <Text style={styles.ratingText}>4 star books:........................................................... {ratingSummary.rating_counts['4'] || 0}</Text>
                <Text style={styles.ratingText}>5 star books:........................................................... {ratingSummary.rating_counts['5'] || 0}</Text>
                <Text style={styles.ratingText}>Average rating of read books:............................ {ratingSummary.average_rating ?? 'N/A'}</Text>
              </>
            ) : (
              <Text style={styles.ratingText}>No data available.</Text>
            )}
          </View>
        </ImageBackground>
        {/* ---- Weekly Check-In Row ---- */}
        <ImageBackground
          source={require('../../assets/images/kvadrat.png')}
          style={styles.imageBorder}
          imageStyle={styles.borderImageStyle}
        >
          <View style={styles.ratingSummaryBox}>
            <View>
              <Text style={{ fontSize: 18 }}>Daily Check-in...</Text>
            </View>

            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 13 }}>
                ...check-in for your daily quest to continue your everyday adventure
              </Text>
            </View>

            <View style={{ flexDirection: 'row' }}>
              {weekDates.map((date, i) => (
                <View key={date} style={{ alignItems: 'center', marginHorizontal: 6, marginBottom: 14 }}>
                  <Text style={styles.weekDayLabel}>{WEEKDAY_LABELS[i]}</Text>
                  <Img
                    source={
                      weekCheckins[date]
                        ? require('../../assets/images/butterfly_good.png')
                        : require('../../assets/images/butterfly_bad.png')
                    }
                    style={{ width: 32, height: 32 }}
                    resizeMode="contain"
                  />
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                style={[globalstyles.button1, { backgroundColor: buttonColor, paddingHorizontal: 20, paddingVertical: 2 }]}
                onPress={() => setCheckinModalVisible(true)}>
                <Text style={styles.editCheckinText}>Edit your Check-in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ImageBackground>
        {/* ---- Full Calendar Check-in Modal ---- */}

        <Modal visible={checkinModalVisible} transparent animationType="slide" onRequestClose={() => setCheckinModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { width: 360 }]}>
              <Text style={styles.modalTitle}>Edit Your Check-ins</Text>
              <Calendar
                maxDate={new Date().toISOString().split('T')[0]}
                minDate="2000-01-01"
                onDayPress={async ({ dateString }) => {
                  const updated = { ...weekCheckins, [dateString]: !weekCheckins[dateString] };
                  setWeekCheckins(updated);
                  await AsyncStorage.setItem(`weekCheckins_${userId}`, JSON.stringify(updated));
                }}
                markedDates={Object.keys(weekCheckins).reduce((acc, date) => {
                  if (weekCheckins[date]) {
                    acc[date] = {
                      selected: true,
                      selectedColor: '#43a047',
                      textColor: '#fff',
                    };
                  }
                  return acc;
                }, {} as Record<string, any>)}
                theme={{ todayTextColor: 'black', selectedDayBackgroundColor: '#43a047' }}
                style={{ marginBottom: 24, borderRadius: 10 }}
              />
              <TouchableOpacity
                style={[globalstyles.button1, { backgroundColor: buttonColor }]}
                onPress={() => setCheckinModalVisible(false)}
              >
                <Text style={{ color: 'black', fontSize: 16 }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ---- Monthly Challenge --- not editable --- */}
        <ImageBackground
          source={require('../../assets/images/kvadrat.png')}
          style={styles.imageBorder}
          imageStyle={styles.borderImageStyle}
        >
          <View style={styles.ratingSummaryBox}>
            <Text style={{ fontSize: 18 }}>Monthly quest...</Text>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 13 }}>
                ...here is a fun adventure for you. Conquer stories of your choice and capture your experiences
              </Text>
            </View>
            {loadingMonth ? <Text>Loading...</Text> : (
              <View>
                <View style={styles.statusContainer}>
                  {Array.from({ length: monthlyTarget }, (_, i) => (
                    <Img
                      key={i}
                      source={
                        i < booksReadMonth
                          ? require('../../assets/images/read_book.png')
                          : require('../../assets/images/unread_book.png')
                      }
                      style={{ width: 25, height: 25, marginHorizontal: 12 }}
                      resizeMode="contain"
                    />
                  ))}
                </View>
                <View style={{ alignItems: 'center' }}>
                  {booksReadMonth === monthlyTarget && (
                    <Text style={{
                      fontFamily: Platform.select({
                        ios: 'Times New Roman',
                        android: 'serif',
                        default: 'Times New Roman',
                      }),
                    }}>
                      You conquered all your stories {'<3'}
                    </Text>
                  )}
                  {booksReadMonth === monthlyTarget - 1 && (
                    <Text style={{
                      fontFamily: Platform.select({
                        ios: 'Times New Roman',
                        android: 'serif',
                        default: 'Times New Roman',
                      }),
                    }}>
                      Almost there, keep going!
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </ImageBackground>
        {/* ---- Yearly Challenge ---- */}
        <ImageBackground
          source={require('../../assets/images/kvadrat.png')}
          style={styles.imageBorder}
          imageStyle={styles.borderImageStyle}
        >
          <View style={styles.ratingSummaryBox}>
            <View>
              <Text style={{ fontSize: 18 }}>Yearly quest...</Text>
            </View>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 13 }}>
                ...count your blessings, count your quests, whatever comes your way. See how far you can go.
              </Text>
            </View>
            {loadingYear ? <Text>Loading...</Text> : (
              <View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={styles.bigFraction}>
                    {booksReadYear}<Text style={styles.denominator}>/{yearlyTarget}</Text>
                  </Text>

                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity
                    style={[globalstyles.button1, { backgroundColor: buttonColor, paddingHorizontal: 20, paddingVertical: 2 }]}
                    onPress={() => {
                      setInputValue(String(yearlyTarget));
                      setTargetModalVisible(true);
                    }}
                  >
                    <Text style={styles.editCheckinText}>Edit Yearly Challenge</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ImageBackground>
        {/* ---- Yearly Target Modal ---- */}
        <Modal visible={targetModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Set Yearly Target</Text>
              <TextInput
                value={inputValue}
                keyboardType="numeric"
                onChangeText={setInputValue}
                style={styles.input}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[globalstyles.button1, { backgroundColor: buttonColor }]}
                  onPress={saveYearlyTarget}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: 'black', fontSize: 16 }}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalstyles.button1, { backgroundColor: '#888' }]}
                  onPress={() => setTargetModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: 'black', fontSize: 16 }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  ratingText: {
    marginBottom: 3,
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }),
  },
  subtitle: {
    fontSize: 16,
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }),
  },
  container: { flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#455a64' },
  challengeBox: {
    backgroundColor: '#fffbe6',
    padding: 28,
    borderRadius: 14,
    alignItems: 'center',
    width: 300,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  ratingSummaryBox: {
    backgroundColor: '#FFFFFF40',
    padding: 16,
  },
  progressText: { fontSize: 18, marginBottom: 8, color: '#455a64' },
  boldText: { fontWeight: 'bold', color: '#1976d2' },
  statusContainer: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' },
  checked: { fontSize: 28, marginHorizontal: 5 },
  unchecked: { fontSize: 28, marginHorizontal: 5, color: '#bdbdbd' },
  completeText: { fontSize: 18, color: '#43a047', fontWeight: 'bold', marginTop: 12 },
  bigFraction: {
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }), fontSize: 48, color: '#AECFA4', marginBottom: 8
  },
  denominator: {
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }), color: '#bdbdbd', fontSize: 32, fontWeight: 'normal'
  },
  buttonRow: { flexDirection: 'row', marginBottom: 20 },
  checkinRow: { backgroundColor: '#FFFFFF40', flexDirection: 'row', marginTop: 40, marginBottom: 12, justifyContent: 'center' },
  weekDayLabel: { fontSize: 12, color: '#555', marginBottom: 2, textAlign: 'center' },
  checkedIcon: { fontSize: 32, color: '#43a047' },
  uncheckedIcon: { fontSize: 32, color: '#bdbdbd' },
  editCheckinButton: { marginBottom: 16, backgroundColor: '#1976d2', padding: 10, borderRadius: 8, alignItems: 'center' },
  editCheckinText: { color: 'black', fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalContent: { backgroundColor: 'white', padding: 24, borderRadius: 12, alignItems: 'center' },
  modalBox: { backgroundColor: '#fff', padding: 24, borderRadius: 8, width: 280 },
  modalTitle: { fontSize: 18, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 8, marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  scrollContainer: { flexGrow: 1, padding: 16 },
  imageBorder: {
    padding: 2,
    borderRadius: 10,
    marginVertical: 8,
  },
  borderImageStyle: {
    resizeMode: 'stretch',
    borderRadius: 10,
  },
});
