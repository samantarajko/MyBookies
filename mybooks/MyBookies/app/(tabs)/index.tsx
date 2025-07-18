import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  View,
  Modal,
  TextInput,
  Button,
  TouchableOpacity,
  Alert,
  Pressable,
  Image as Img,
  Platform,
  SafeAreaView,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';
import { globalstyles } from '../styles/globals';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useTheme } from '../context/ThemeContext';


type Book = {
  book_id: number;
  user_id: number;
  book_title: string;
  book_author: string;
  book_year: number | string;
  read: 'not read' | 'read' | 'currently reading';
  rating: number;
  image_url?: string;
  finished_reading?: string | null;
};

const API_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5000'
  : 'http://localhost:5000';

const DEFAULT_IMAGE = require('../../assets/images/DEFAULT_2.png');



const SECTIONS = [
  { label: 'All', key: 'all', endpoint: (u: number) => `/books/${u}` },
  { label: 'Read', key: 'read', endpoint: (u: number) => `/books/${u}/read` },
  { label: 'Not Read', key: 'not read', endpoint: (u: number) => `/books/${u}/not_read` },
  { label: 'Currently Reading', key: 'currently reading', endpoint: (u: number) => `/books/${u}/currently_reading` },
];

const READ_OPTIONS: Array<{ label: string; value: Book['read'] }> = [
  { label: 'Not Read', value: 'not read' },
  { label: 'Read', value: 'read' },
  { label: 'Currently Reading', value: 'currently reading' },
];

export default function HomeScreen() {
  const { userId } = useAuth();
  const [booksBySection, setBooksBySection] = useState<{ [key: string]: Book[] }>({});
  const [bookCounts, setBookCounts] = useState<null | {
    read: number,
    not_read: number,
    currently_reading: number,
    total: number
  }>(null);
  
  const { buttonColor, backgroundColor} = useTheme();
  useEffect(() => {
    if (!userId) return;
    fetch(`${API_URL}/books/${userId}/counts`)
      .then(r => r.json())
      .then(setBookCounts)
      .catch(() => setBookCounts(null));
  }, [userId]);

  
  const [sectionModalVisible, setSectionModalVisible] = useState(false);
  const [sectionToShow, setSectionToShow] = useState<string>('all');
  const [loadingSection, setLoadingSection] = useState(false);
  const [errorSection, setErrorSection] = useState<string | null>(null);


  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState({
    book_id: 0,
    book_title: '',
    book_author: '',
    book_year: '',
    read: 'not read' as Book['read'],
    rating: '5',
    image_url: '',
    finished_reading: '',
  });

  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchPage, setSearchPage] = useState(1);

  useFocusEffect(
  useCallback(() => {
    if (!userId) return;

    fetch(`${API_URL}/books/${userId}/counts`)
      .then(r => r.json())
      .then(setBookCounts)
      .catch(() => setBookCounts(null));
  }, [userId])
);


  useEffect(() => {
    if (!userId || !sectionToShow || !sectionModalVisible) return;
    const section = SECTIONS.find(s => s.key === sectionToShow);
    if (!section) return;
    setLoadingSection(true);
    setErrorSection(null);
    fetch(`${API_URL}${section.endpoint(userId)}`)
      .then(r => r.json())
      .then((data: Book[]) => {
        setBooksBySection(prev => ({ ...prev, [sectionToShow]: data }));
        setLoadingSection(false);
      })
      .catch(e => {
        setErrorSection(e.message);
        setLoadingSection(false);
      });
  }, [sectionModalVisible, sectionToShow, userId]);

  const refreshSection = () => {
    if (!userId || !sectionToShow || !sectionModalVisible) return;
    const section = SECTIONS.find(s => s.key === sectionToShow);
    if (!section) return;
    setLoadingSection(true);
    fetch(`${API_URL}${section.endpoint(userId)}`)
      .then(r => r.json())
      .then((data: Book[]) => {
        setBooksBySection(prev => ({ ...prev, [sectionToShow]: data }));
        setLoadingSection(false);
      })
      .catch(() => setLoadingSection(false));
  };


  const handleFinishAndRefresh = () => {
    setModalVisible(false);
    setEditMode(false);
    setShowDatePicker(false);
    setForm({
      book_id: 0,
      book_title: '',
      book_author: '',
      book_year: '',
      read: 'not read',
      rating: '5',
      image_url: '',
      finished_reading: '',
    });
    refreshSection();
  };


  const handleSubmitBook = () => {
    if (form.book_title.length > 200 || form.book_author.length > 200)
      return Alert.alert('Error', 'Title and Author ≤200 chars.');
    if (!/^\d+$/.test(form.book_year) || form.book_year.length > 6)
      return Alert.alert('Error', 'Year must be numeric ≤6 digits.');
    const rating = Number(form.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5)
      return Alert.alert('Error', 'Rating 1–5 integer.');
    setSubmitting(true);
    const payload: any = {
      book_id: form.book_id,
      user_id: userId,
      book_title: form.book_title,
      book_author: form.book_author,
      book_year: Number(form.book_year),
      read: form.read,
      rating,
      image_url: form.image_url || null,
      finished_reading: form.read === 'read' ? (form.finished_reading || null) : null,
    };
    const url = editMode ? `${API_URL}/editbook` : `${API_URL}/addbook`;
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(() => {
        setSubmitting(false);
        handleFinishAndRefresh();
      })
      .catch(() => setSubmitting(false));
  };

  const handleDeleteBook = (book_id: number) => {
    Alert.alert(
      'Delete Book',
      'Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setSubmitting(true);
            fetch(`${API_URL}/deletebook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ book_id, user_id: userId }),
            })
              .then(() => {
                setSubmitting(false);
                handleFinishAndRefresh();
              })
              .catch(() => {
                Alert.alert('Error', 'Delete failed.');
                setSubmitting(false);
              });
          },
        },
      ]
    );
  };

  const openEditModal = (book: Book) => {
    setEditMode(true);
    setForm({
      book_id: book.book_id,
      book_title: book.book_title,
      book_author: book.book_author,
      book_year: String(book.book_year),
      read: book.read,
      rating: String(book.rating),
      image_url: book.image_url || '',
      finished_reading: book.finished_reading || '',
    });
    setModalVisible(true);
  };

  const fetchSearchResults = (page: number) => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(searchQuery)}&limit=5&page=${page}`)
      .then(r => r.json())
      .then(data => {
        const docs = data.docs || [];
        const results: Book[] = docs.map((d: any) => ({
          book_id: 0,
          user_id: userId,
          book_title: d.title || '',
          book_author: d.author_name ? d.author_name.join(', ') : 'Unknown',
          book_year: d.first_publish_year || '',
          read: 'not read',
          rating: 5,
          image_url: d.cover_i
            ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
            : '',
        }));
        setSearchResults(page === 1 ? results : [...searchResults, ...results]);
        setSearchPage(page);
        setSearchLoading(false);
      })
      .catch(() => setSearchLoading(false));
  };

  return (
    /* buttons */
    <ThemedView style={[{backgroundColor: backgroundColor}, styles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText style={globalstyles.tableTitle}>Shelves</ThemedText>
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
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[globalstyles.button1, {backgroundColor: buttonColor}]}
            onPress={() => {
              setEditMode(false);
              setForm({
                book_id: 0,
                book_title: '',
                book_author: '',
                book_year: '',
                read: 'not read',
                rating: '5',
                image_url: '',
                finished_reading: '',
              });
              setModalVisible(true);
            }}
          >
            <ThemedText style={styles.addButtonText}>Add a Book</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[globalstyles.button1, {backgroundColor: buttonColor}, { marginLeft: 12 }]}
            onPress={() => setSearchModalVisible(true)}
          >
            <ThemedText style={styles.addButtonText}>Search Book</ThemedText>
          </TouchableOpacity>
        </View>

        {/* MADE SECTIONS */}
        {SECTIONS.map((sec, index) => {
            let count = 0;

            if (bookCounts) {
              switch (sec.key) {
                case 'all':
                  count = bookCounts.total;
                  break;
                case 'read':
                  count = bookCounts.read;
                  break;
                case 'not read':
                  count = bookCounts.not_read;
                  break;
                case 'currently reading':
                  count = bookCounts.currently_reading;
                  break;
                default:
                  count = 0;
              }
            }

            return (
              <React.Fragment key={sec.key}>
                {/* Section block */}
                <View style={{backgroundColor: backgroundColor}}>
                  <TouchableOpacity
                    activeOpacity={1}
                    style={[
                      {backgroundColor: backgroundColor},

                      {
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingVertical: 10,
                        paddingHorizontal: 12,
                        borderBottomWidth: 0,
                      },
                    ]}
                    onPress={() => {
                      setSectionToShow(sec.key);
                      setSectionModalVisible(true);
                    }}
                  >
                    {/* Default Image (left) */}
                    <Img
                      source={DEFAULT_IMAGE}
                      style={[styles.bookItemImage]}
                      resizeMode="cover"
                    />

                    {/* Section Info */}
                    <View style={{ flex: 1 }}>
                      <ThemedText
                        style={[
                          styles.sectionHeaderText,
                          {
                            fontSize: 20,
                            fontWeight: 'normal',
                            fontFamily: Platform.select({
                              ios: 'Times New Roman',
                              android: 'serif',
                              default: 'Times New Roman',
                            }),
                          },
                        ]}
                      >
                        {sec.label}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.sectionHeaderText,
                          {
                            fontSize: 13,
                            fontWeight: 'normal',
                            fontFamily: Platform.select({
                              ios: 'Times New Roman',
                              android: 'serif',
                              default: 'Times New Roman',
                            }),
                          },
                        ]}
                      >
                        Number of books: {count}
                      </ThemedText>
                    </View>
                  </TouchableOpacity>
                </View>

                {index !== SECTIONS.length - 1 && (
                  <Img
                    source={require('../../assets/images/Line3.png')}
                    style={{
                      width: '130%',
                      height: 4,
                      marginTop: 4,
                      marginBottom: 4,
                      alignSelf: 'center',
                      opacity: 0.9,

                    }}
                    resizeMode="contain"
                  />
                )}
              </React.Fragment>
            );
          })}


      </ScrollView>

      <Modal
        visible={sectionModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSectionModalVisible(false)}
      >
        <SafeAreaView style={[{backgroundColor: backgroundColor}, styles.fullModalContainer]}>
          <View style={[globalstyles.background, styles.fullModalHeader]}>
            <TouchableOpacity
              onPress={() => setSectionModalVisible(false)}
              style={styles.backArrowBtn}
            >
              <Img
                source={require('../../assets/images/backicon.png')}
                style={styles.backArrowImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <ThemedText style={styles.modalTitle2}>
              {SECTIONS.find(s => s.key === sectionToShow)?.label || ''}
            </ThemedText>
            
          </View>
          <View style={[globalstyles.background, {marginBottom:0}]}>
          <Img
            source={require('../../assets/images/Line2.png')}
            style={[globalstyles.background,{
              width: '110%',
              height: 6,
              opacity: 1.0,
              marginBottom: 0,
              alignSelf: 'center',
            }]}
            resizeMode="contain"
          />
          </View>
          
          <ScrollView style={globalstyles.background} contentContainerStyle={{ padding: 12 }}>
            {loadingSection && <ThemedText>Loading...</ThemedText>}
            {errorSection && <ThemedText>Error: {errorSection}</ThemedText>}
            {booksBySection[sectionToShow]?.length === 0 && !loadingSection && <ThemedText>No books found.</ThemedText>}
            {booksBySection[sectionToShow]?.length > 0 && (
            <View style={{ gap: 10 }}>
              {booksBySection[sectionToShow].map((book, i) => (
                <React.Fragment key={i}>
                  <Pressable
                    style={[globalstyles.background, styles.bookItemContainer]}
                    onPress={() => openEditModal(book)}
                  >
                    <Img
                      source={book.image_url ? { uri: book.image_url } : DEFAULT_IMAGE}
                      style={styles.bookItemImage2}
                      resizeMode="cover"
                    />
                    <View style={styles.bookItemInfo}>
                      <ThemedText style={styles.bookItemTitle}>{book.book_title}</ThemedText>
                      <ThemedText>{book.book_author}</ThemedText>
                      <ThemedText>{book.book_year}</ThemedText>
                      <ThemedText>
                        {READ_OPTIONS.find(o => o.value === book.read)?.label}
                      </ThemedText>
                      <ThemedText>⭐ {book.rating}/5</ThemedText>
                      {book.finished_reading && (
                        <ThemedText>Finished: {book.finished_reading}</ThemedText>
                      )}
                    </View>
                  </Pressable>


                  {i !== booksBySection[sectionToShow].length - 1 && (
                    <Img
                      source={require('../../assets/images/Line3.png')}
                      style={{
                      width: '130%',
                      height: 4,
                      marginTop: 4,
                      marginBottom: 4,
                      alignSelf: 'center',
                      opacity: 0.9,
                      }}
                      resizeMode="contain"
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleFinishAndRefresh}
      >
        <View style={[globalstyles.background, styles.modalOverlay]}>
          <View style={[globalstyles.background, styles.modalContent]}>
            <ThemedText style={styles.modalTitle}>{editMode ? 'Edit Book' : 'Add a Book'}</ThemedText>
            <TextInput
              placeholder="Title"
              style={styles.input}
              value={form.book_title}
              onChangeText={t => setForm(f => ({ ...f, book_title: t }))}
            />
            <TextInput
              placeholder="Author"
              style={styles.input}
              value={form.book_author}
              onChangeText={t => setForm(f => ({ ...f, book_author: t }))}
            />
            <TextInput
              placeholder="Year"
              style={styles.input}
              keyboardType="numeric"
              value={form.book_year}
              onChangeText={t => setForm(f => ({ ...f, book_year: t }))}
            />
            <TextInput
              placeholder="Rating (1–5)"
              style={styles.input}
              keyboardType="numeric"
              value={form.rating}
              onChangeText={t => setForm(f => ({ ...f, rating: t }))}
            />
            <TextInput
              placeholder="Image URL"
              style={styles.input}
              value={form.image_url}
              onChangeText={t => setForm(f => ({ ...f, image_url: t }))}
            />
            <View style={styles.readStatusRow}>
              <ThemedText>Add to shelf:</ThemedText>
              <View style={styles.readOptionsContainer}>
              {READ_OPTIONS.map(o => (
                <TouchableOpacity
                  key={o.value}
                  style={[styles.readOption, form.read === o.value && {backgroundColor: buttonColor}]}
                  onPress={() => setForm(f => ({ ...f, read: o.value }))}
                >
                  <ThemedText style={{ color: 'black', fontSize: 11 }}>
                    {o.label}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
            </View>
            {form.read === 'read' && (
              <>
                <TouchableOpacity
                  style={styles.input}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text>
                    {form.finished_reading
                      ? `📖 Finished: ${form.finished_reading}`
                      : 'Select Finished Date'}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={form.finished_reading ? new Date(form.finished_reading) : new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
                    maximumDate={new Date()}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (event.type === 'dismissed') return;
                      const chosen = selectedDate || new Date();
                      const formatted = chosen.toISOString().split('T')[0];
                      setForm(f => ({ ...f, finished_reading: formatted }));
                    }}
                  />
                )}
              </>
            )}
            <View style={styles.modalButtons}>
              {/* Cancel */}
              <TouchableOpacity
                style={[globalstyles.buttoncolorbad, globalstyles.button1]}
                onPress={handleFinishAndRefresh}
              >
                <ThemedText style={{}}>Cancel</ThemedText>
              </TouchableOpacity>

              {/* Delete (only in Edit Mode) */}
              {editMode && (
                <TouchableOpacity
                  style={[{backgroundColor: '#E8A8A8'}, globalstyles.button1]}
                  onPress={() => handleDeleteBook(form.book_id)}
                >
                  <ThemedText style={{}}>Delete</ThemedText>
                </TouchableOpacity>
              )}

              {/* Add / Save */}
              <TouchableOpacity
                style={[
                  {backgroundColor: buttonColor},
                  globalstyles.button1,
                  submitting && { opacity: 0.5 },
                ]}
                onPress={handleSubmitBook}
                disabled={submitting}
              >
                <ThemedText style={{}}>
                  {submitting
                    ? editMode ? 'Saving...' : 'Adding...'
                    : editMode ? 'Save' : 'Add'}
                </ThemedText>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* Search Modal */}
      <Modal
        visible={searchModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSearchModalVisible(false);
          refreshSection();
        }}
      >
        <View style={[globalstyles.background, styles.modalOverlay]}>
          <View style={[globalstyles.background, styles.modalContent]}>
            <ThemedText style={styles.modalTitle}>Search for a Book</ThemedText>
            <TextInput
              placeholder="Enter book title"
              style={styles.input}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => fetchSearchResults(1)}
            />
            <TouchableOpacity
              style={[{backgroundColor: buttonColor}, globalstyles.button1, {width: '50%', marginBottom: 10}]}
              onPress={() => fetchSearchResults(1)}
            >
              <ThemedText style={{fontFamily: Platform.select({
                ios: 'Times New Roman',
                android: 'serif',
                default: 'Times New Roman',
              }),}}>Search</ThemedText>
            </TouchableOpacity>
              <Img
                    source={require('../../assets/images/Line3.png')}
                    style={{
                      width: '115%',
                      height: 4,
                      marginTop: 4,
                      marginBottom: 4,
                      alignSelf: 'center',
                      opacity: 0.9,

                    }}
                    resizeMode="contain"
                  />
            {searchLoading && <ThemedText>Searching…</ThemedText>}
            <ScrollView style={{ maxHeight: 200, marginTop: 8 }}>
              {searchResults.map((b, i) => (
                <Pressable
                  key={i}
                  style={{ padding: 8, borderBottomWidth: 1, borderColor: '#eee' }}
                  onPress={() => {
                    setForm({
                      book_id: 0,
                      book_title: b.book_title,
                      book_author: b.book_author,
                      book_year: String(b.book_year),
                      read: 'not read',
                      rating: '5',
                      image_url: b.image_url || '',
                      finished_reading: '',
                    });
                    setSearchModalVisible(false);
                    setEditMode(false);
                    setModalVisible(true);
                  }}
                >
                  <ThemedText style={{ fontWeight: 'bold' }}>{b.book_title}</ThemedText>
                  <ThemedText>{b.book_author}</ThemedText>
                  <ThemedText>{b.book_year}</ThemedText>
                </Pressable>
              ))}
              {searchResults.length > 0 && (
                <TouchableOpacity
                  style={[{backgroundColor: buttonColor}, globalstyles.button1, { width: 160, alignSelf: 'center', marginTop: 12 }]}
                  onPress={() => fetchSearchResults(searchPage + 1)}
                >
                  <ThemedText style={{fontFamily: Platform.select({
                ios: 'Times New Roman',
                android: 'serif',
                default: 'Times New Roman',
              }),}}>Load More</ThemedText>
                </TouchableOpacity>

              )}
            </ScrollView>
            <Img
                    source={require('../../assets/images/Line3.png')}
                    style={{
                      width: '115%',
                      height: 4,
                      marginTop: 4,
                      marginBottom: 15,
                      alignSelf: 'center',
                      opacity: 0.9,

                    }}
                    resizeMode="contain"
                  />
            <TouchableOpacity
              style={[globalstyles.buttoncolorbad, globalstyles.button1, {width: '50%', marginTop:7}]}
              onPress={() => {
                setSearchModalVisible(false);
                refreshSection();
              }}
            >
              <ThemedText style={{fontFamily: Platform.select({
                ios: 'Times New Roman',
                android: 'serif',
                default: 'Times New Roman',
              }),}}>Close</ThemedText>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1},
  scrollContainer: { flexGrow: 1, padding: 16 },
  tableTitle: {
  fontSize: 32,
  fontFamily: Platform.select({
    ios: 'Times New Roman',
    android: 'serif',
    default: 'Times New Roman',
  }),
  fontWeight: 'normal',
  color: 'black',
  marginBottom: 5,
  marginTop: 30,
},

  buttonRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 30},
  addButton: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24
  },
  addButtonText: {
    color: 'black',
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }),
  },

  sectionContainer: {
    marginBottom: 8,
    backgroundColor: ''
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  sectionHeaderText: {color: 'black' },


  
  table: { minWidth: 500, borderRadius: 6, overflow: 'hidden', backgroundColor: '#D0E7FF' },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#ddd' },
  headerRow: { backgroundColor: '#D0E7FF' },
  headerCell: { flex: 1, fontWeight: 'bold', padding: 8, textAlign: 'center', color: 'black' },
  cell: { justifyContent: 'center', padding: 8, alignItems: 'center' },
  coverImage: { width: 60, height: 80, borderRadius: 4 },
  modalOverlay: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
},


  modalContent: {
  width: '85%',
  maxWidth: 400,
  padding: 24,
  borderRadius: 16,
  alignItems: 'stretch',
  elevation: 5,
  shadowColor: '#000', 
  shadowOpacity: 0.2,
  shadowOffset: { width: 0, height: 2 },
  shadowRadius: 8,
},

  fullModalContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center' },
fullModalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 16,
  paddingHorizontal: 10,
  borderColor: '#ccc',
  minHeight: 60,
},

  backArrowBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
    width: 40,
    height: 40,
  },

  backArrowImage: {
    width: 24,
    height: 24,
    tintColor: 'black',
  },

  modalTitle2: {
    flex: 1,
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'left',
    textAlignVertical: 'center',
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }),
  },

  modalTitle: { fontSize: 20, marginBottom: 35, textAlign: 'center', fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }),},
  input: { borderWidth: 0.6, borderColor: 'black', marginBottom: 12, padding: 8, borderRadius: 6, backgroundColor: 'white', fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'Times New Roman',
    }),},
  readStatusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, alignItems: 'center' },
  readOption: { paddingVertical: 0.5, paddingHorizontal: 16, borderWidth: 1, borderRadius: 14, borderColor: 'black', marginRight: 1, backgroundColor: 'white' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  bookItemContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  padding: 10,
  borderRadius: 12,
  gap: 12,
},

bookItemImage: {
  width: 100,
  height: 100,
  borderRadius: 8,
  backgroundColor: 'transparent',
  marginRight: 20,
},
bookItemImage2: {
  width: 95,
  height: 140,
  borderRadius: 8,
  backgroundColor: 'transparent',
  marginRight: 20,
},

bookItemInfo: {
  flex: 1,
  gap: 0.1,
  justifyContent: 'center',
},

bookItemTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: 'black',
  fontFamily: Platform.select({
    ios: 'Times New Roman',
    android: 'serif',
    default: 'Times New Roman',
  }),
},

readOptionsContainer: {
  flexDirection: 'row',
  gap: 8,
  flexWrap: 'wrap',
},
});
