import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  useWindowDimensions,
  ScrollView,
  Image as Img,
  Platform
} from 'react-native';
import { Reader, ReaderProvider, useReader } from '@epubjs-react-native/core';
import { useFileSystem } from '@epubjs-react-native/expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { globalstyles } from '../styles/globals';
import { useTheme } from '../context/ThemeContext';





interface SavedBook {
  id: string;
  uri: string;
  name: string;
}

const STORAGE_KEY_PREFIX = 'user_epub_books_';

const EpubReader: React.FC<{
  epubUri: string;
  onClose: () => void;
}> = ({ epubUri, onClose }) => {
  const { width, height } = useWindowDimensions();
  const {
    goPrevious,
    goNext,
    currentLocation,
    totalLocations,
    progress,
    atStart,
    atEnd,
  } = useReader();

  const bookMeta = (useReader() as any).meta;

  const LoadingFileComponent = () => (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingText}>Loading EPUB...</Text>
    </View>
  );
  const { buttonColor, backgroundColor} = useTheme();

  
  return (
    <SafeAreaView style={[styles.readerContainer]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {bookMeta?.title || 'EPUB Reader'}
        </Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>
      <Reader
        src={epubUri}
        width={width}
        height={height - 140}
        fileSystem={useFileSystem}
        renderLoadingFileComponent={LoadingFileComponent}
        onReady={() => {
          console.log('EPUB is ready');
        }}
        onDisplayError={(error: any) => {
          console.error('Display error:', error);
          Alert.alert('Error', 'Failed to display EPUB file');
        }}
        onLocationChange={(location: any) => {
          console.log('Location changed:', location);
        }}
        onPress={() => {
          console.log('EPUB pressed');
        }}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={() => goPrevious()}
          disabled={atStart}
          style={[globalstyles.button1, {backgroundColor: buttonColor}, atStart && styles.navButtonDisabled]}
        >
          <Text style={[styles.navButtonText, atStart && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>
        <View style={styles.pageInfo}>
          <Text style={styles.pageInfoText}>
            {currentLocation?.start?.location || 0} / {totalLocations || 0}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => goNext()}
          disabled={atEnd}
          style={[globalstyles.button1, {backgroundColor: buttonColor}, atEnd && styles.navButtonDisabled]}
        >
          <Text style={[styles.navButtonText, atEnd && styles.navButtonTextDisabled]}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default function MyBooksScreen() {
  const { userId } = useAuth();
  const [savedBooks, setSavedBooks] = useState<SavedBook[]>([]);
  const [selectedEpub, setSelectedEpub] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);


  useEffect(() => {
    if (!userId) return;
    const loadBooks = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem(STORAGE_KEY_PREFIX + userId);
        if (jsonValue != null) {
          setSavedBooks(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.error('Failed to load saved books', e);
      }
    };
    loadBooks();
  }, [userId]);


  const saveBooks = async (books: SavedBook[]) => {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(STORAGE_KEY_PREFIX + userId, JSON.stringify(books));
    } catch (e) {
      console.error('Failed to save books', e);
    }
  };


  const addBook = (book: SavedBook) => {
    const updatedBooks = [...savedBooks, book];
    setSavedBooks(updatedBooks);
    saveBooks(updatedBooks);
  };


  const removeBook = (id: string) => {
    const updatedBooks = savedBooks.filter(book => book.id !== id);
    setSavedBooks(updatedBooks);
    saveBooks(updatedBooks);
  };


  const pickEpubFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/epub+zip',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        if (!file.name.toLowerCase().endsWith('.epub')) {
          Alert.alert('Invalid File', 'Please select an EPUB file');
          return;
        }
        const id = Date.now().toString();
        const newBook: SavedBook = { id, uri: file.uri, name: file.name };
        addBook(newBook);
        setSelectedEpub(file.uri);
        setIsReading(true);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to pick EPUB file');
    }
  };

  const closeReader = () => {
    setIsReading(false);
    setSelectedEpub(null);
  };

  if (isReading && selectedEpub) {
    return (
      <ReaderProvider>
        <EpubReader epubUri={selectedEpub} onClose={closeReader} />
      </ReaderProvider>
    );
  }
  const { buttonColor, backgroundColor} = useTheme();
  return (
    <ThemedView style={[{backgroundColor: backgroundColor}, styles.container]}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ThemedText style={globalstyles.tableTitle}>Reading Corner</ThemedText>
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
          <Text style={styles.subtitle}>Save your books (EPUB file) here to start your journey in another adventure and let your imagination do its job</Text>
          <TouchableOpacity style={[globalstyles.button1, {backgroundColor: buttonColor}, {marginBottom:20}]} onPress={pickEpubFile}>
            <Text style={[styles.selectButtonText]}>Select EPUB File</Text>
          </TouchableOpacity>
          <ScrollView style={styles.bookList}>
            {savedBooks.length > 0 ? (
              savedBooks.map(book => (
                <View key={book.id} style={styles.bookItem}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEpub(book.uri);
                      setIsReading(true);
                    }}
                    style={styles.bookNameContainer}
                  >
                    <Text style={styles.bookName}>{book.name}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => removeBook(book.id)}
                    style={[globalstyles.button1, {backgroundColor: '#E8A8A8'}]}
                  >
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noBooksText}>No saved books</Text>
            )}
          </ScrollView>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: { flexGrow: 1, padding: 16 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
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
  selectButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.select({
        ios: 'Times New Roman',
        android: 'serif',
        default: 'Times New Roman',
      }),
  },
  bookList: {
    width: '100%',
    maxHeight: 300,
  },
  bookItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1, 
    borderColor: 'black',
  },
  bookNameContainer: {
    flex: 1,
  },
  bookName: {
    fontSize: 16,
    color: 'black',
    fontFamily: Platform.select({
        ios: 'Times New Roman',
        android: 'serif',
        default: 'Times New Roman',
      }),
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 20,

  },
  deleteButtonText: {
    color: 'black',
    fontWeight: '600',
    fontFamily: Platform.select({
        ios: 'Times New Roman',
        android: 'serif',
        default: 'Times New Roman',
      }),
  },
  noBooksText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },

  readerContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 20,
    color: '#333',
  },
  progressContainer: {
    padding: 5,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
  },
  navButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  navButtonDisabled: {
    backgroundColor: '#ccc',
  },
  navButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: '#999',
  },
  pageInfo: {
    flex: 1,
    alignItems: 'center',
  },
  pageInfoText: {
    fontSize: 14,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
